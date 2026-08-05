/**
 * GET /auth/github/callback
 * Handles OAuth callback from GitHub, exchanges code for token, upserts actual user, and returns JWT.
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
        redirect_uri: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>GitHub OAuth Error</title></head>
        <body style="background:#0d1117; color:#f87171; font-family:sans-serif; padding:40px; text-align:center;">
          <h2>❌ GitHub OAuth Error</h2>
          <p>${tokenData.error_description || 'GitHub OAuth token exchange failed'}</p>
        </body>
        </html>
      `);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch actual authenticated GitHub user profile from api.github.com
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Antigravity-Sync-Server',
      },
    });

    const ghUser = await userRes.json();

    if (!ghUser || !ghUser.login) {
      return res.status(400).json({ error: 'Could not fetch user profile from GitHub' });
    }

    // 3. Upsert actual GitHub user record into database/store
    try {
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
    } catch (dbErr) {
      console.warn('Database upsert warning:', dbErr.message);
    }

    // 4. Generate JWT for the Electron desktop app containing access token
    const appToken = jwt.sign(
      {
        github_id: String(ghUser.id),
        github_login: ghUser.login,
        name: ghUser.name || ghUser.login,
        avatar_url: ghUser.avatar_url,
        access_token: accessToken,
      },
      process.env.JWT_SECRET || 'antigravity_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    const redirectUrl = `antigravity-sync://auth?token=${appToken}`;

    // 5. Render auto-redirect HTML page that automatically opens desktop app protocol handler
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Antigravity Sync — GitHub SSO Success</title>
        <meta charset="utf-8">
        <style>
          body { background: #0d1117; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; text-align: center; max-width: 420px; }
          .btn { background: #238636; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; display: inline-block; margin-top: 16px; }
          .avatar { width: 64px; height: 64px; border-radius: 50%; margin-bottom: 12px; border: 2px solid #238636; }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="${ghUser.avatar_url}" alt="avatar" class="avatar" />
          <h2 style="color: #4ade80; margin-top: 0;">Welcome, ${ghUser.name || ghUser.login}!</h2>
          <p style="color: #94a3b8; font-size: 14px;">Authenticated with GitHub account <strong>@${ghUser.login}</strong>.</p>
          <p style="color: #cbd5e1; font-size: 13px;">Returning to Antigravity Sync Desktop Application...</p>
          <a href="${redirectUrl}" class="btn">Open Desktop App Manually</a>
        </div>
        <script>
          window.location.href = "${redirectUrl}";
          setTimeout(function() { window.close(); }, 2500);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('GitHub OAuth callback processing error:', err);
    res.status(500).json({ error: 'Internal OAuth authentication error' });
  }
});

module.exports = router;
