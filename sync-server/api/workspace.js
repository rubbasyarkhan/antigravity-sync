/**
 * GET /workspace - Fetch assigned company projects, GitHub organization repos, personal repos, toggles & invites
 * POST /workspace - Save toggled projects and personal project manifests across devices
 */
const { Router } = require('express');
const fetch = require('node-fetch');
const { requireAuth } = require('../middleware/auth');
const { sql } = require('../lib/db');

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { github_login, access_token: jwtAccessToken } = req.user;

  try {
    let accessToken = jwtAccessToken;

    // 1. Fetch user's GitHub access token if not present in JWT
    if (!accessToken) {
      const [userRow] = await sql`
        SELECT access_token FROM users WHERE LOWER(github_login) = LOWER(${github_login})
      `;
      accessToken = userRow?.access_token;
    }

    let ghAssignedProjects = [];
    let ghPersonalProjects = [];

    // 2. Fetch live repositories directly from GitHub API using the user's OAuth access token
    if (accessToken) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Antigravity-Sync-Server',
      };

      try {
        // 2a. Fetch user's direct repos (personal + assigned/collaborator)
        const ghRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', { headers });

        if (ghRes.ok) {
          const repos = await ghRes.json();

          repos.forEach((repo) => {
            const isOrg = repo.owner && (
              repo.owner.type === 'Organization' ||
              repo.owner.login.toLowerCase() !== github_login.toLowerCase()
            );

            if (isOrg) {
              ghAssignedProjects.push({
                slug: repo.name,
                name: repo.name,
                description: repo.description || `Repository from ${repo.owner.login}`,
                repo_url: repo.clone_url || repo.html_url,
                team: repo.owner.login,
                is_private: Boolean(repo.private),
                language: repo.language || 'JavaScript',
                stargazers_count: repo.stargazers_count || 0,
              });
            } else {
              ghPersonalProjects.push({
                slug: repo.name,
                name: repo.name,
                description: repo.description || 'Personal repository',
                repo_url: repo.clone_url || repo.html_url,
                is_private: Boolean(repo.private),
                language: repo.language || 'JavaScript',
                stargazers_count: repo.stargazers_count || 0,
              });
            }
          });
        }

        // 2b. Fetch ALL Organizations the user is a member of / has access to
        const orgsRes = await fetch('https://api.github.com/user/orgs?per_page=100', { headers });
        if (orgsRes.ok) {
          const orgs = await orgsRes.json();

          for (const org of orgs) {
            try {
              const orgReposRes = await fetch(`https://api.github.com/orgs/${org.login}/repos?per_page=100&sort=updated`, { headers });
              if (orgReposRes.ok) {
                const orgRepos = await orgReposRes.json();
                orgRepos.forEach((repo) => {
                  if (!ghAssignedProjects.some((p) => p.slug.toLowerCase() === repo.name.toLowerCase() || p.repo_url === (repo.clone_url || repo.html_url))) {
                    ghAssignedProjects.push({
                      slug: repo.name,
                      name: repo.name,
                      description: repo.description || `Organization repository from ${org.login}`,
                      repo_url: repo.clone_url || repo.html_url,
                      team: org.login,
                      is_private: Boolean(repo.private),
                      language: repo.language || 'JavaScript',
                      stargazers_count: repo.stargazers_count || 0,
                    });
                  }
                });
              }
            } catch (orgRepoErr) {
              console.warn(`Could not fetch repos for org ${org.login}:`, orgRepoErr.message);
            }
          }
        }
      } catch (ghErr) {
        console.warn('Could not fetch GitHub repos dynamically:', ghErr.message);
      }
    }

    // 3. Fetch explicit database assignments (if any)
    try {
      const dbAssigned = await sql`
        SELECT p.slug, p.name, p.description, p.repo_url, p.team
        FROM projects p
        INNER JOIN assignments a ON a.project_slug = p.slug
        WHERE LOWER(a.github_login) = LOWER(${github_login})
        ORDER BY p.team, p.name
      `;

      // Merge database assignments avoiding duplicates
      if (Array.isArray(dbAssigned)) {
        dbAssigned.forEach((dbProj) => {
          if (!ghAssignedProjects.some((p) => p.slug.toLowerCase() === dbProj.slug.toLowerCase())) {
            ghAssignedProjects.push(dbProj);
          }
        });
      }
    } catch (dbAssErr) {
      console.warn('Database assignment query warning:', dbAssErr.message);
    }

    // 4. Fetch saved workspace state for multi-device sync
    let savedPersonalRepos = [];
    let enabledSlugs = [];
    try {
      const [workspace] = await sql`
        SELECT enabled_slugs, personal_repos
        FROM user_workspace
        WHERE LOWER(github_login) = LOWER(${github_login})
      `;
      savedPersonalRepos = workspace?.personal_repos || [];
      enabledSlugs = workspace?.enabled_slugs || [];
    } catch (wsErr) {
      console.warn('Workspace state query warning:', wsErr.message);
    }

    savedPersonalRepos.forEach((savedRepo) => {
      if (!ghPersonalProjects.some((p) => p.slug === savedRepo.slug || p.repo_url === savedRepo.repo_url)) {
        ghPersonalProjects.push(savedRepo);
      }
    });

    // 5. Fetch pending invites sent to this user
    let invites = [];
    try {
      invites = await sql`
        SELECT id, from_login, project_slug, repo_url, created_at
        FROM invites
        WHERE LOWER(to_login) = LOWER(${github_login}) AND status = 'pending'
        ORDER BY created_at DESC
      `;
    } catch (invErr) {
      console.warn('Invites query warning:', invErr.message);
    }

    res.json({
      github_login,
      assigned_projects: ghAssignedProjects,
      enabled_slugs: enabledSlugs,
      personal_repos: ghPersonalProjects,
      pending_invites: invites || [],
    });
  } catch (err) {
    console.error('Workspace fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve workspace data' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { github_login } = req.user;
  const { enabled_slugs = [], personal_repos = [] } = req.body;

  try {
    await sql`
      INSERT INTO user_workspace (github_login, enabled_slugs, personal_repos)
      VALUES (${github_login}, ${enabled_slugs}, ${JSON.stringify(personal_repos)})
      ON CONFLICT (github_login) DO UPDATE SET
        enabled_slugs = EXCLUDED.enabled_slugs,
        personal_repos = EXCLUDED.personal_repos,
        updated_at = NOW()
    `;

    res.json({ success: true, message: 'Workspace state updated' });
  } catch (err) {
    console.error('Workspace save error:', err);
    res.status(500).json({ error: 'Failed to update workspace state' });
  }
});

module.exports = router;
