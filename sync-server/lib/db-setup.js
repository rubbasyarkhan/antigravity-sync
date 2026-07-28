/**
 * db-setup.js
 * One-time database setup script.
 * Executed via `npm run db:setup`. Creates all required Neon PostgreSQL tables.
 */
const { sql } = require('./db');

async function setup() {
  console.log('🗄️  Setting up database tables in Neon PostgreSQL...');

  // Users table — stores every developer authenticated via GitHub SSO
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      github_id     TEXT UNIQUE NOT NULL,
      github_login  TEXT UNIQUE NOT NULL,
      name          TEXT,
      avatar_url    TEXT,
      access_token  TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('  ✅ users table ready');

  // Projects table — company repositories and metadata
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id            SERIAL PRIMARY KEY,
      slug          TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT,
      repo_url      TEXT NOT NULL,
      team          TEXT,
      is_company    BOOLEAN DEFAULT TRUE,
      owner_login   TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('  ✅ projects table ready');

  // Assignments table — maps GitHub usernames to company project slugs
  await sql`
    CREATE TABLE IF NOT EXISTS assignments (
      id            SERIAL PRIMARY KEY,
      github_login  TEXT NOT NULL,
      project_slug  TEXT NOT NULL,
      assigned_by   TEXT,
      assigned_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(github_login, project_slug)
    );
  `;
  console.log('  ✅ assignments table ready');

  // User workspace table — stores user's toggled projects & personal project manifests across devices
  await sql`
    CREATE TABLE IF NOT EXISTS user_workspace (
      id              SERIAL PRIMARY KEY,
      github_login    TEXT UNIQUE NOT NULL,
      enabled_slugs   TEXT[] DEFAULT '{}',
      personal_repos  JSONB DEFAULT '[]',
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('  ✅ user_workspace table ready');

  // Invites table — handles personal project sharing invitations to GitHub usernames
  await sql`
    CREATE TABLE IF NOT EXISTS invites (
      id              SERIAL PRIMARY KEY,
      from_login      TEXT NOT NULL,
      to_login        TEXT NOT NULL,
      project_slug    TEXT NOT NULL,
      repo_url        TEXT NOT NULL,
      status          TEXT DEFAULT 'pending',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      resolved_at     TIMESTAMPTZ
    );
  `;
  console.log('  ✅ invites table ready');

  console.log('\n🎉 Database schema setup complete!');
}

setup().catch((err) => {
  console.error('❌ Database setup failed:', err);
  process.exitCode = 1;
});

