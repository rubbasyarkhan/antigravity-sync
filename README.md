# 🚀 Antigravity Sync — Developer Workspace Platform

> **Zero-Friction Onboarding & Multi-Device Workspace Synchronization for Companies & Developers.**

Antigravity Sync is an enterprise-grade workspace synchronization platform powered by GitHub and Antigravity. One website visit, one installer download, and one GitHub SSO login automatically provisions assigned company repositories, personal projects, AI skills, guidelines (`AGENTS.md`), plugins, and tool connections (`mcp_config.json`) directly onto the developer's computer.

---

## 🌟 Key Features

- **🌐 Single-Click Portal Download (`sync.company.com`)**: Website auto-detects Windows, macOS, or Linux and presents a tailored installer download (`.exe` / `.dmg` / `.AppImage`).
- **🔑 1-Click GitHub SSO Authentication**: Authenticates securely using GitHub OAuth (Device Flow). Uses **GitHub Username / ID** for identity — zero custom passwords or proprietary user accounts.
- **🏢 Scoped Company Project Assignments**: Developers only see company projects assigned to their GitHub handle or team. Unassigned projects remain hidden.
- **👤 Personal Projects & Email Sharing**: Developers can import personal projects and share them with any GitHub handle (`@username`) with a single click.
- **⚡ 1-Click Multi-Device Auto-Sync**: Logging into a secondary device (e.g. Home Laptop) automatically restores all assigned company projects, personal projects, files, rules, and settings without re-selection.
- **📁 Automated File & Config Provisioning**: Clones/pulls repositories into `~/Projects/` using Git and populates `~/.gemini/config/` (AGENTS.md, skills, plugins, MCP servers, and project UUID manifests).
- **🔒 Enterprise Security (OS Keychain)**: Encrypts secrets using Windows Credential Manager / macOS Keychain via `keytar`.
- **🔄 Background Sync Engine**: Runs lightweight `git fetch` checks and checks for sharing invitations every 15 minutes + offers a manual "Sync Now" button.

---

## 🏗️ Monorepo Architecture

```
antigravity-sync/
├── sync-server/         ← Backend API (Node.js + Express + Neon PostgreSQL, Vercel ready)
├── desktop-app/         ← Native Desktop App (Electron + React/JS + simple-git + keytar)
└── portal-website/      ← Download Landing Page (HTML5 + CSS3 + JS OS auto-detect)
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: v2.30.0 or higher
- **PostgreSQL**: Neon Serverless PostgreSQL instance

---

### 2. Setting Up the Sync Server (`sync-server`)

```bash
cd sync-server
npm install

# 1. Create environment file
# Copy .env configuration and insert your Neon DATABASE_URL and GitHub Client credentials:
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# DATABASE_URL=postgresql://...

# 2. Run database table initialization
npm run db:setup

# 3. Start local backend API server
npm run dev
```
The server starts locally at `http://localhost:3000`.

---

### 3. Setting Up the Desktop App (`desktop-app`)

```bash
cd desktop-app
npm install

# Start the Electron Desktop Application in development mode
npm start
```

---

### 4. Setting Up the Download Portal (`portal-website`)

Simply open `portal-website/index.html` in any web browser or host via static web hosting (Vercel, GitHub Pages, Netlify).

---

## 🌐 API Specification (`sync-server`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | None | System health check endpoint. |
| `GET` | `/auth/github` | None | Initiates GitHub OAuth authentication flow. |
| `GET` | `/auth/github/callback` | None | Handles OAuth callback, upserts user in DB, issues JWT token. |
| `GET` | `/workspace` | Bearer JWT | Returns user's assigned projects, saved toggles & pending invites. |
| `POST` | `/workspace` | Bearer JWT | Saves user's workspace project toggles & personal project manifests. |
| `GET` | `/assignments` | Bearer JWT | Admin endpoint: lists all project assignments by GitHub handle. |
| `POST` | `/assignments` | Bearer JWT | Admin endpoint: assigns a project to a GitHub username (`@username`). |
| `DELETE`| `/assignments` | Bearer JWT | Admin endpoint: removes a project assignment from a GitHub username. |
| `POST` | `/invites` | Bearer JWT | Sends a personal project sharing invitation to a GitHub handle. |
| `GET` | `/invites` | Bearer JWT | Returns pending project invitations for the authenticated user. |
| `PATCH` | `/invites/:id` | Bearer JWT | Accepts or declines a project invitation (`action: 'accept' \| 'decline'`). |

---

## 🗄️ Local Machine Directory Target

When a developer clicks **"Set Up My Machine"**, Antigravity Sync structures their computer:

```
~/Projects/                                  # Project root on user's machine
├── 📁 App Frontend/                         # Cloned Git repository
├── 📁 Design System/                        # Cloned Git repository
└── 📁 My Side App/                          # Cloned personal repository

~/.gemini/
├── config/
│   ├── AGENTS.md                            # Merged company standards & guidelines
│   ├── config.json                          # Permissions & settings
│   ├── mcp_config.json                      # Rendered tool connections with OS Keychain secrets
│   ├── plugins/                             # Installed company plugins
│   ├── skills/                              # Synced company skills
│   └── projects/                            # Auto-registered project UUID manifests
│       ├── {uuid-app-frontend}.json
│       └── {uuid-design-system}.json
└── sync-engine/                             # Sync logs & lockfiles
```

---

## 🚀 Deployment (Production)

### Deploy Backend to Vercel:
```bash
cd sync-server
npx vercel --prod
```
In your Vercel Dashboard, set the environment variables: `DATABASE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`, and `JWT_SECRET`.

### Build Desktop Installers (`.exe` / `.dmg`):
```bash
cd desktop-app
npm run make
```
Packaged installers will be generated in `desktop-app/out/make/`:
- Windows: `AntigravitySync-Setup.exe`
- macOS: `AntigravitySync.dmg`
- Linux: `AntigravitySync.AppImage`

---

## 📜 License
MIT License. Created for company workspace management & Antigravity ecosystem integration.
