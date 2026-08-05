/**
 * GET /gemini-config - Retrieves merged personal & team .gemini configuration (memories, rules, skills, plugins, mcp)
 * POST /gemini-config - Saves/updates user's personal .gemini configuration across devices
 * POST /gemini-config/team - Admin/Lead endpoint to update shared team rules & workflows
 */
const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { sql } = require('../lib/db');

const router = Router();

// GET /gemini-config
router.get('/', requireAuth, async (req, res) => {
  const { github_login } = req.user;

  try {
    // 1. Fetch personal .gemini config
    const [userConfig] = await sql`
      SELECT memories, personal_skills, personal_rules, mcp_config, hooks_config, updated_at
      FROM user_gemini_config
      WHERE LOWER(github_login) = LOWER(${github_login})
    `;

    // 2. Fetch user's assigned teams
    const assignedTeams = await sql`
      SELECT DISTINCT p.team
      FROM projects p
      INNER JOIN assignments a ON a.project_slug = p.slug
      WHERE LOWER(a.github_login) = LOWER(${github_login}) AND p.team IS NOT NULL
    `;

    let teamRules = [];
    let teamSkills = [];

    // 3. Fetch team rules for assigned teams
    if (assignedTeams.length > 0) {
      const teamNames = assignedTeams.map((t) => t.team);
      const teamConfigs = await sql`
        SELECT team_slug, team_rules, team_skills
        FROM team_gemini_config
        WHERE team_slug = ANY(${teamNames})
      `;

      teamConfigs.forEach((tc) => {
        if (tc.team_rules) {
          teamRules.push({ team: tc.team_slug, rules: tc.team_rules });
        }
        if (Array.isArray(tc.team_skills)) {
          tc.team_skills.forEach((sk) => {
            teamSkills.push({ ...sk, team: tc.team_slug });
          });
        }
      });
    }

    res.json({
      github_login,
      personal: {
        memories: userConfig?.memories || [],
        personal_skills: userConfig?.personal_skills || [],
        personal_rules: userConfig?.personal_rules || '',
        mcp_config: userConfig?.mcp_config || {},
        hooks_config: userConfig?.hooks_config || {},
        updated_at: userConfig?.updated_at || null,
      },
      team: {
        team_rules: teamRules,
        team_skills: teamSkills,
      },
    });
  } catch (err) {
    console.error('Error fetching gemini config:', err);
    res.status(500).json({ error: 'Failed to retrieve .gemini configuration' });
  }
});

// POST /gemini-config
router.post('/', requireAuth, async (req, res) => {
  const { github_login } = req.user;
  const { memories = [], personal_skills = [], personal_rules = '', mcp_config = {}, hooks_config = {} } = req.body;

  try {
    await sql`
      INSERT INTO user_gemini_config (github_login, memories, personal_skills, personal_rules, mcp_config, hooks_config)
      VALUES (${github_login}, ${JSON.stringify(memories)}, ${JSON.stringify(personal_skills)}, ${personal_rules}, ${JSON.stringify(mcp_config)}, ${JSON.stringify(hooks_config)})
      ON CONFLICT (github_login) DO UPDATE SET
        memories = EXCLUDED.memories,
        personal_skills = EXCLUDED.personal_skills,
        personal_rules = EXCLUDED.personal_rules,
        mcp_config = EXCLUDED.mcp_config,
        hooks_config = EXCLUDED.hooks_config,
        updated_at = NOW()
    `;

    res.json({ success: true, message: 'Personal .gemini configuration updated' });
  } catch (err) {
    console.error('Error saving gemini config:', err);
    res.status(500).json({ error: 'Failed to update .gemini configuration' });
  }
});

// POST /gemini-config/team
router.post('/team', requireAuth, async (req, res) => {
  const { team_slug, team_rules = '', team_skills = [], mcp_config = {} } = req.body;

  if (!team_slug) {
    return res.status(400).json({ error: 'team_slug is required' });
  }

  try {
    await sql`
      INSERT INTO team_gemini_config (team_slug, team_rules, team_skills, mcp_config)
      VALUES (${team_slug}, ${team_rules}, ${JSON.stringify(team_skills)}, ${JSON.stringify(mcp_config)})
      ON CONFLICT (team_slug) DO UPDATE SET
        team_rules = EXCLUDED.team_rules,
        team_skills = EXCLUDED.team_skills,
        mcp_config = EXCLUDED.mcp_config,
        updated_at = NOW()
    `;

    res.json({ success: true, message: `Team config updated for ${team_slug}` });
  } catch (err) {
    console.error('Error saving team gemini config:', err);
    res.status(500).json({ error: 'Failed to update team .gemini configuration' });
  }
});

module.exports = router;
