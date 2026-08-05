/**
 * GET /auth/github
 * Initiates GitHub OAuth SSO authentication flow.
 * Redirects the user directly to github.com to sign in with their actual GitHub account.
 */
const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'https://antigravity-sync-three.vercel.app/auth/github/callback';

  // Check if real GitHub Client ID is provided
  if (!clientId || clientId === 'mock_client_id' || clientId.includes('your_')) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Antigravity Sync — GitHub OAuth Setup Required</title>
        <meta charset="utf-8">
        <style>
          body { background: #0d1117; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; max-width: 540px; }
          h2 { color: #f8fafc; margin-top: 0; }
          code { background: #0d1117; color: #58a6ff; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
          ol { padding-left: 20px; line-height: 1.6; color: #cbd5e1; }
          li { margin-bottom: 8px; }
          .step-box { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 12px; margin: 12px 0; font-size: 13px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🔑 GitHub OAuth App Setup Required</h2>
          <p style="color: #94a3b8; font-size: 14px;">
            To log in with your <strong>actual GitHub account</strong>, add your <code>GITHUB_CLIENT_ID</code> and <code>GITHUB_CLIENT_SECRET</code> to Vercel Environment Variables.
          </p>

          <ol>
            <li>Go to <a href="https://github.com/settings/developers" target="_blank" style="color: #58a6ff;">GitHub Developer Settings → OAuth Apps</a>.</li>
            <li>Click <strong>New OAuth App</strong> and enter:
              <div class="step-box">
                <strong>Application Name:</strong> Antigravity Sync<br>
                <strong>Homepage URL:</strong> https://antigravity-sync-upkv.vercel.app<br>
                <strong>Authorization callback URL:</strong> ${callbackUrl}
              </div>
            </li>
            <li>Copy your <strong>Client ID</strong> and generate a <strong>Client Secret</strong>.</li>
            <li>Add them to Vercel Project Settings → Environment Variables:
              <div class="step-box">
                GITHUB_CLIENT_ID=your_actual_client_id<br>
                GITHUB_CLIENT_SECRET=your_actual_client_secret<br>
                GITHUB_CALLBACK_URL=${callbackUrl}
              </div>
            </li>
            <li>Redeploy Vercel and click <strong>Sign in with GitHub</strong> again!</li>
          </ol>
        </div>
      </body>
      </html>
    `);
  }

  // Redirect user to github.com to log in with their actual GitHub account
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'repo read:user user:email read:org',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

module.exports = router;
