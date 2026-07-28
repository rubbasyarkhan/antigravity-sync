# 🔌 Antigravity Sync Server (Backend API)

Backend API service for Antigravity Sync. Built with Node.js, Express, and Neon Serverless PostgreSQL. Deployed as serverless functions on Vercel.

---

## 🛠 Environment Variables (`.env`)

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

DATABASE_URL=postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require
JWT_SECRET=your_super_secret_jwt_key
PORT=3000
NODE_ENV=development
```

---

## 🗄 Database Setup

Initialize the Neon PostgreSQL database tables (`users`, `projects`, `assignments`, `user_workspace`, `invites`):

```bash
npm run db:setup
```

---

## 🚀 Running Locally

```bash
npm run dev
```

Health check: `http://localhost:3000/`
GitHub OAuth login: `http://localhost:3000/auth/github`
