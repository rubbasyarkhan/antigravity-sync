/**
 * /assignments
 * Admin API endpoints for assigning company projects to developers by GitHub username.
 */
const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { sql } = require('../lib/db');

const router = Router();

// GET /assignments — List all project assignments
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await sql`
      SELECT a.github_login, a.project_slug, p.name, p.team, a.assigned_at
      FROM assignments a
      LEFT JOIN projects p ON p.slug = a.project_slug
      ORDER BY a.github_login, p.name
    `;
    res.json(rows);
  } catch (err) {
    console.error('Assignments list fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve assignments' });
  }
});

// POST /assignments — Assign a developer to a company project by GitHub username
router.post('/', requireAuth, async (req, res) => {
  const { github_login, project_slug } = req.body;
  if (!github_login || !project_slug) {
    return res.status(400).json({ error: 'github_login and project_slug parameters are required' });
  }

  try {
    await sql`
      INSERT INTO assignments (github_login, project_slug, assigned_by)
      VALUES (${github_login}, ${project_slug}, ${req.user.github_login})
      ON CONFLICT (github_login, project_slug) DO NOTHING
    `;
    res.json({ success: true, message: `Assigned ${github_login} to project ${project_slug}` });
  } catch (err) {
    console.error('Assignment creation error:', err);
    res.status(500).json({ error: 'Failed to create project assignment' });
  }
});

// DELETE /assignments — Remove a project assignment
router.delete('/', requireAuth, async (req, res) => {
  const { github_login, project_slug } = req.body;
  if (!github_login || !project_slug) {
    return res.status(400).json({ error: 'github_login and project_slug parameters are required' });
  }

  try {
    await sql`
      DELETE FROM assignments
      WHERE github_login = ${github_login} AND project_slug = ${project_slug}
    `;
    res.json({ success: true, message: `Removed assignment of ${github_login} from ${project_slug}` });
  } catch (err) {
    console.error('Assignment removal error:', err);
    res.status(500).json({ error: 'Failed to remove project assignment' });
  }
});

module.exports = router;
