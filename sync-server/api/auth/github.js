/**
 * GET /auth/github
 * Redirects the user to GitHub OAuth authorization screen.
 */
const { Router } = require('express');
const router = Router();

router.get('/', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email read:org',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

module.exports = router;
