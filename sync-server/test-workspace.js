require('dotenv').config();
const { sql } = require('./lib/db');
const fetch = require('node-fetch');

async function test() {
  const github_login = 'rubbasyarkhan';
  console.log('Testing workspace query for:', github_login);

  const users = await sql`SELECT * FROM users WHERE LOWER(github_login) = LOWER(${github_login})`;
  console.log('User row in DB:', users);

  if (users.length > 0 && users[0].access_token) {
    const headers = {
      Authorization: `Bearer ${users[0].access_token}`,
      'User-Agent': 'Antigravity-Sync-Server',
    };
    const ghRes = await fetch('https://api.github.com/user/repos?per_page=100', { headers });
    console.log('GitHub API status:', ghRes.status);
    if (ghRes.ok) {
      const repos = await ghRes.json();
      console.log('GitHub API returned repos count:', repos.length);
      if (repos.length > 0) {
        console.log('Sample repo names:', repos.slice(0, 5).map(r => r.name));
      }
    } else {
      const text = await ghRes.text();
      console.log('GitHub API error body:', text);
    }
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
