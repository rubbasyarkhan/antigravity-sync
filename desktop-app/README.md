# 💻 Antigravity Sync Desktop Application

Native cross-platform desktop application built with Electron, React/JS, `simple-git`, and `keytar` OS Keychain storage.

---

## ⚙️ Environment Configuration (`.env`)

```env
SYNC_SERVER_URL=http://localhost:3000
GITHUB_CLIENT_ID=your_github_client_id
```

---

## 🏃 Commands

```bash
# Start in development mode
npm start

# Build packaged desktop installers (.exe for Windows, .dmg for macOS)
npm run make
```

---

## 🎯 Target Directory Layout

When the user clicks **"Set Up My Machine"**:
- Repositories are cloned to `~/Projects/<Project Name>/`
- Global rules, skills, plugins, MCP servers, and project UUID manifests are written to `~/.gemini/config/`
- User JWT token is stored securely in **OS Keychain** (Windows Credential Manager / macOS Keychain)
