/**
 * GET /workspace - Fetch assigned projects, saved toggles, personal projects & invites
 * POST /workspace - Save toggled projects and personal project manifests across devices
 */
const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { sql } = require('../lib/db');

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { github_login } = req.user;

  try {
    // 1. Fetch assigned company projects for this GitHub username
    const assigned = await sql`
      SELECT p.slug, p.name, p.description, p.repo_url, p.team
      FROM projects p
      INNER JOIN assignments a ON a.project_slug = p.slug
      WHERE a.github_login = ${github_login}
      ORDER BY p.team, p.name
    `;

    // 2. Fetch saved workspace state for multi-device sync
    const [workspace] = await sql`
      SELECT enabled_slugs, personal_repos
      FROM user_workspace
      WHERE github_login = ${github_login}
    `;

    // 3. Fetch pending invites sent to this user
    const invites = await sql`
      SELECT id, from_login, project_slug, repo_url, created_at
      FROM invites
      WHERE to_login = ${github_login} AND status = 'pending'
      ORDER BY created_at DESC
    `;

    res.json({
      github_login,
      assigned_projects: assigned,
      enabled_slugs: workspace?.enabled_slugs || [],
      personal_repos: workspace?.personal_repos || [],
      pending_invites: invites,
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
