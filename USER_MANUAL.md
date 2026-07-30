# 🚀 Antigravity Sync — Developer Platform & User Manual

Welcome to **Antigravity Sync** — the zero-configuration developer machine setup and continuous environment synchronization platform built for development teams and individual software engineers.

---

## 🎯 What is Antigravity Sync?

Setting up a new developer machine or onboarding onto a team codebase typically takes hours or days of manual environment configuration: installing language runtimes, cloning dozens of repositories, installing dependencies (`npm`, `pip`, `poetry`, `yarn`), configuring environment paths, writing AI agent rules, and setting up IDE workspace manifests.

**Antigravity Sync automates 100% of this workflow in a single click.**

---

## 🌟 Key Advantages & Benefits

| Advantage | Manual Machine Setup | Antigravity Sync |
|---|---|---|
| **Onboarding Speed** | 4 to 8 Hours | **10 Seconds (1-Click)** |
| **Dependency Setup** | Manual `npm install` / `pip install` per repo | **Automated README.md parsing & package installation** |
| **AI Agent Rules** | Manual configuration | **Auto-provisioned `~/.gemini/config/AGENTS.md`** |
| **IDE Workspaces** | Manual folder adding | **Auto-registered `~/.gemini/config/projects/*.json`** |
| **Background Sync** | Manual `git pull` across repos | **Automatic 15-Minute Background Engine** |
| **Audit Log Diffs** | None / Blind logs | **Interactive File Diff Inspector Modal** |
| **OS UI Performance** | System UI freezes during long operations | **100% Non-blocking async worker execution** |

---

## 📖 Step-by-Step User Guide (So Simple Anyone Can Use It)

### Step 1: Launch & Sign In with GitHub
1. Open the **Antigravity Sync** desktop application.
2. Click **"Login with GitHub"**.
3. Complete the secure GitHub browser authentication. Your access token is stored safely inside your OS Keychain (Windows Credential Vault / macOS Keychain).

---

### Step 2: Select Your Projects
1. Navigate to the **Projects** tab.
2. You will see two sections:
   - 🏢 **COMPANY ASSIGNED**: Repositories assigned to you by your organization.
   - 👤 **PERSONAL PROJECTS**: Your personal GitHub repositories.
3. Toggle **ON** the switch next to any projects you wish to set up on your computer.

---

### Step 3: Click "Set Up My Machine"
1. At the top right of the dashboard, click **"Set Up My Machine"**.
2. Sit back and watch the live progress window!

**What Antigravity Sync does automatically during setup:**
- ⚡ **Pre-flight System Verification**: Checks your system for Node.js, Python, and Git.
- 📦 **Automated Git Clone / Pull**: Downloads repositories into your `~/Projects/` folder (`C:\Users\<User>\Projects\`).
- 📖 **README.md Parsing**: Reads installation instructions and executes package installation (`npm install`, `pip install`, `yarn`, `pnpm`, `poetry`, or setup scripts).
- ⚙️ **Antigravity AI Rules Provisioning**: Writes global standards to `~/.gemini/config/AGENTS.md` and local project rules to `~/Projects/<Repo>/.agents/AGENTS.md`.
- 📁 **Workspace Registration**: Writes project manifests to `~/.gemini/config/projects/<slug>.json` so Antigravity IDE recognizes your projects instantly.

---

### Step 4: Inspect Synced File Diffs in Real Time
1. Go to the **Sync Status** tab.
2. Each sync execution records an accurate activity log card.
3. Click **`Inspect Synced File Changes`** on any log entry.
4. An interactive modal opens displaying exact line-by-line colored diffs (`+` green additions / `-` red deletions) of provisioned rules and project manifests!

---

### Step 5: Start Chatting with Antigravity AI!
1. When setup finishes, click **"Done — Open Projects Folder"**.
2. Launch Antigravity IDE — all your toggled repositories, rules, plugins, and tools are configured and ready for instant AI coding conversations.

---

## 🔒 Security & Privacy
- **Zero Proprietary Accounts**: Authentication uses your official GitHub ID.
- **Keychain Storage**: JWT tokens and secrets are stored in your operating system's native keychain.
- **User-Space Safety**: Clones repositories into `~/Projects/` (`C:\Users\<User>\Projects\`) avoiding OS privilege errors.
