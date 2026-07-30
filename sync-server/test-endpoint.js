require('dotenv').config();
const { sql } = require('./lib/db');
const fetch = require('node-fetch');

async function testEndpoint() {
  const github_login = 'rubbasyarkhan';

  const [userRow] = await sql`
    SELECT access_token FROM users WHERE LOWER(github_login) = LOWER(${github_login})
  `;

  if (!userRow || !userRow.access_token) {
    console.error('User not found or missing token');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${userRow.access_token}`,
    'User-Agent': 'Antigravity-Sync-Server',
  };

  let allRepos = [];
  for (let page = 1; page <= 5; page++) {
    const ghRes = await fetch(`https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&page=${page}&sort=updated`, { headers });
    console.log(`Page ${page} status:`, ghRes.status);
    if (ghRes.ok) {
      const pageRepos = await ghRes.json();
      allRepos = allRepos.concat(pageRepos);
      console.log(`Page ${page} count:`, pageRepos.length);
      if (pageRepos.length < 100) break;
    } else {
      console.log(`Page ${page} error:`, await ghRes.text());
      break;
    }
  }

  let ghAssignedProjects = [];
  let ghPersonalProjects = [];

  allRepos.forEach((repo) => {
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
      });
    } else {
      ghPersonalProjects.push({
        slug: repo.name,
        name: repo.name,
        repo_url: repo.clone_url || repo.html_url,
      });
    }
  });

  console.log('Total assigned projects:', ghAssignedProjects.length);
  console.log('Total personal projects:', ghPersonalProjects.length);
  process.exit(0);
}

testEndpoint().catch(err => {
  console.error(err);
  process.exit(1);
});
