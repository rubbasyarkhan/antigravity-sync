# 🧪 Antigravity Sync — Manual End-to-End Testing Guide

This guide walks you step-by-step through testing every single feature of the system manually.

---

## 📋 Prerequisites & Test Setup

Open two terminal windows:

### Terminal 1: Start the Sync Backend Server
```bash
cd antigravity-sync/sync-server
npm run dev
```
> **Expected Output:**
> `🚀 Antigravity Sync Server running at http://localhost:3000`

### Terminal 2: Start the Desktop App
```bash
cd antigravity-sync/desktop-app
npm start
```
> **Expected Result:**
> Electron app window opens with dark mode UI showing the Login Screen.

---

## 🔬 Test Checklist (8 Steps)

### Step 1: Test Server Health Check & Auth Protection 🌐

1. Open your browser or PowerShell and visit:
   `http://localhost:3000/`
   - [ ] **Pass Criteria:** Returns `{"status":"ok","service":"Antigravity Sync Server", ...}`

2. Visit a protected endpoint without a token:
   `http://localhost:3000/workspace`
   - [ ] **Pass Criteria:** Returns HTTP 401 `{"error":"Missing or invalid Authorization header"}`

---

### Step 2: Test Download Portal Website (`portal-website`) 💻

1. Double-click `antigravity-sync/portal-website/index.html` to open it in your browser.
2. Observe the primary hero download button.
   - [ ] **Pass Criteria (Windows):** Displays **"Download for Windows (.exe Installer)"**.
   - [ ] **Pass Criteria (Mac):** Displays **"Download for Mac (.dmg Installer)"**.
3. Scroll down to fallback links.
   - [ ] **Pass Criteria:** Links for Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`) are visible.

---

### Step 3: Test Desktop App Launch & GitHub SSO Login 🔑

1. Bring up the **Antigravity Sync Desktop Application**.
2. Observe the Login Screen:
   - [ ] Dark theme background (`#0d1117`)
   - [ ] Green GitHub logo and "Antigravity Sync" header
   - [ ] Green **"Sign in with GitHub"** button
3. Click **"Sign in with GitHub"**:
   - [ ] Default web browser opens automatically to GitHub OAuth authorization.
4. Complete the GitHub login prompt in your browser.
5. Watch the browser redirect to `antigravity-sync://auth?token=...`.
   - [ ] The desktop app window automatically restores to the foreground.
   - [ ] The screen transitions from Login to the **Dashboard**.
   - [ ] Your GitHub avatar, name, and handle (e.g. `@yourusername`) appear in the sidebar footer.

---

### Step 4: Test Company Project Scoping & Assignment 🏢

By default, unassigned company projects are hidden. Let's create a test assignment for your GitHub handle:

1. Open PowerShell and run this command (replace `YOUR_GITHUB_HANDLE` with your actual GitHub username):

```powershell
# Insert test company project & assign to your GitHub handle
cd antigravity-sync/sync-server
node -e "
const { sql } = require('./lib/db');
async function seed() {
  await sql\`INSERT INTO projects (slug, name, description, repo_url, team) VALUES ('app-frontend', 'App Frontend', 'Company web application', 'https://github.com/octocat/Hello-World', 'frontend') ON CONFLICT (slug) DO NOTHING;\`;
  await sql\`INSERT INTO assignments (github_login, project_slug) VALUES ('YOUR_GITHUB_HANDLE', 'app-frontend') ON CONFLICT (github_login, project_slug) DO NOTHING;\`;
  console.log('✅ Seed project assigned to YOUR_GITHUB_HANDLE');
}
seed();
"
```

2. In the desktop app, click **"🔄 Sync Now"**.
   - [ ] **Pass Criteria:** **"App Frontend"** appears under **🏢 Company Assigned** with an ON/OFF toggle switch.
   - [ ] **Pass Criteria:** Other unassigned company projects remain completely hidden.

---

### Step 5: Test Machine Setup & Direct File Provisioning 🚀

1. Ensure the toggle switch for **"App Frontend"** is ON (green).
2. Click the **"🚀 Set Up My Machine"** button.
3. Observe the setup confirmation popup.
4. Verify your local file system:

   - **Check Project Files (`~/Projects/`)**:
     Open Windows Explorer (or File Explorer) and navigate to `C:\Users\<YourUser>\Projects\App Frontend\`:
     - [ ] **Pass Criteria:** `App Frontend` folder exists.
     - [ ] **Pass Criteria:** `.git` directory exists inside `App Frontend`.
     - [ ] **Pass Criteria:** Project source files are present (`README` / source code).

   - **Check Antigravity Configuration (`~/.gemini/config/`)**:
     Navigate to `C:\Users\<YourUser>\.gemini\config\`:
     - [ ] **Pass Criteria:** `AGENTS.md` file exists containing company guidelines.
     - [ ] **Pass Criteria:** `mcp_config.json` exists containing MCP server connections.
     - [ ] **Pass Criteria:** `projects/app-frontend.json` manifest file exists.

---

### Step 6: Test Personal Project Sharing via GitHub Username 👥

1. In the Dashboard sidebar, navigate to the **Settings** tab and click **"Open Folder"**.
   - [ ] **Pass Criteria:** Windows Explorer opens directly to `~/Projects/`.

2. Click on the **Projects** tab. Under **👤 Personal Projects**, click **"+ Add Personal Project"** (or use an existing personal item).

3. Click the **"👥 Share"** button next to a project.
   - [ ] **Pass Criteria:** Modal popup opens titled **"Share Project"**.

4. Enter a target GitHub username (e.g. `@frienddev`) and click **"Send Invite"**.
   - [ ] **Pass Criteria:** Success popup appears: `🎉 Invitation sent to @frienddev!`.

5. Check the database to confirm:
   Run this command in `sync-server`:
   ```powershell
   node -e "const { sql } = require('./lib/db'); sql\`SELECT * FROM invites\`.then(console.log);"
   ```
   - [ ] **Pass Criteria:** Returns an invite record showing `from_login = your handle`, `to_login = frienddev`, `status = pending`.

---

### Step 7: Test Multi-Device 1-Click Auto-Sync ⚡

1. Close the Electron desktop app window.
2. In Terminal 2, restart the app:
   ```bash
   npm start
   ```
3. Observe app startup behavior:
   - [ ] **Pass Criteria:** The app reads your JWT token from the **OS Keychain** (Windows Credential Manager).
   - [ ] **Pass Criteria:** You bypass the Login Screen automatically and land directly on the Dashboard.
   - [ ] **Pass Criteria:** All your toggled company projects and workspace state are restored instantly without re-selection.

---

### Step 8: Test Background Sync & System Tray 🔄

1. Look at the Windows Taskbar Notification Area (System Tray, next to the clock).
   - [ ] **Pass Criteria:** Antigravity Sync icon (green circle logo) is visible.

2. Right-click the system tray icon.
   - [ ] **Pass Criteria:** Context menu appears with 3 options:
     - `Open Antigravity Sync`
     - `Sync Now`
     - `Quit`

3. Click **"Sync Now"** from the tray menu.
   - [ ] **Pass Criteria:** In the app under **Sync Status**, the status changes to **Synced** and the timestamp updates to the current time.

4. Click **"Quit"** from the tray menu.
   - [ ] **Pass Criteria:** Desktop app closes completely.

---

## 🏆 Test Summary

| Test Step | Feature | Result |
|---|---|---|
| **Step 1** | Server Health Check & 401 Auth Protection | [ ] PASS |
| **Step 2** | Portal Download Page OS Auto-Detect | [ ] PASS |
| **Step 3** | GitHub SSO Login & JWT Keychain Storage | [ ] PASS |
| **Step 4** | Scoped Company Project Assignments | [ ] PASS |
| **Step 5** | File & Config Provisioning (`~/Projects/` & `~/.gemini/config/`) | [ ] PASS |
| **Step 6** | Personal Project Sharing to GitHub Handles | [ ] PASS |
| **Step 7** | Multi-Device 1-Click Auto-Sync | [ ] PASS |
| **Step 8** | Background Sync Engine & System Tray | [ ] PASS |
