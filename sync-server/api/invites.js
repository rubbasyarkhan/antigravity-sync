/**
 * /invites
 * Personal project sharing invitation endpoints.
 */
const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { sql } = require('../lib/db');

const router = Router();

// POST /invites — Send a personal project invitation to a GitHub username
router.post('/', requireAuth, async (req, res) => {
  const { to_login, project_slug, repo_url } = req.body;
  const from_login = req.user.github_login;

  if (!to_login || !project_slug || !repo_url) {
    return res.status(400).json({ error: 'to_login, project_slug, and repo_url parameters are required' });
  }

  if (to_login.toLowerCase() === from_login.toLowerCase()) {
    return res.status(400).json({ error: 'Cannot send a project invitation to yourself' });
  }

  try {
    const [invite] = await sql`
      INSERT INTO invites (from_login, to_login, project_slug, repo_url)
      VALUES (${from_login}, ${to_login}, ${project_slug}, ${repo_url})
      RETURNING id, from_login, to_login, project_slug, repo_url, status, created_at
    `;
    res.status(201).json(invite);
  } catch (err) {
    console.error('Invite creation error:', err);
    res.status(500).json({ error: 'Failed to send project invitation' });
  }
});

// GET /invites — Fetch pending invitations for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  const { github_login } = req.user;

  try {
    const invites = await sql`
      SELECT id, from_login, project_slug, repo_url, status, created_at
      FROM invites
      WHERE to_login = ${github_login} AND status = 'pending'
      ORDER BY created_at DESC
    `;
    res.json(invites);
  } catch (err) {
    console.error('Invites fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve project invitations' });
  }
});

// PATCH /invites/:id — Accept or decline a project invitation
router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'accept' or 'decline'
  const { github_login } = req.user;

  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: "Action parameter must be 'accept' or 'decline'" });
  }

  try {
    const [invite] = await sql`
      UPDATE invites
      SET status = ${action === 'accept' ? 'accepted' : 'declined'}, resolved_at = NOW()
      WHERE id = ${Number(id)} AND to_login = ${github_login}
      RETURNING *
    `;

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found or unauthorized' });
    }

    res.json(invite);
  } catch (err) {
    console.error('Invite status update error:', err);
    res.status(500).json({ error: 'Failed to update invitation status' });
  }
});

module.exports = router;
