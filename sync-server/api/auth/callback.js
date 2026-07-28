/**
 * GET /auth/github/callback
 * Handles OAuth callback from GitHub, exchanges code for token, upserts user, and returns JWT.
 */
const { Router } = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { sql } = require('../../lib/db');

const router = Router();

router.get('/', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter from GitHub OAuth callback' });
  }

  try {
    // 1. Exchange authorization code for GitHub access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || 'GitHub OAuth token exchange failed' });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Antigravity-Sync-Server',
      },
    });

    const ghUser = await userRes.json();

    // 3. Upsert user record into Neon PostgreSQL
    await sql`
      INSERT INTO users (github_id, github_login, name, avatar_url, access_token)
      VALUES (${String(ghUser.id)}, ${ghUser.login}, ${ghUser.name || ghUser.login}, ${ghUser.avatar_url}, ${accessToken})
      ON CONFLICT (github_id) DO UPDATE SET
        github_login = EXCLUDED.github_login,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        access_token = EXCLUDED.access_token,
        updated_at = NOW()
    `;

    // 4. Generate JWT for the Electron desktop app
    const appToken = jwt.sign(
      {
        github_id: String(ghUser.id),
        github_login: ghUser.login,
        name: ghUser.name || ghUser.login,
        avatar_url: ghUser.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 5. Redirect back to Electron desktop app protocol handler
    res.redirect(`antigravity-sync://auth?token=${appToken}`);
  } catch (err) {
    console.error('GitHub OAuth callback processing error:', err);
    res.status(500).json({ error: 'Internal OAuth authentication error' });
  }
});

module.exports = router;
