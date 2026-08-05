# 🚀 Antigravity Sync — Developer Platform User Manual & Visual Guide

Welcome to **Antigravity Sync** — the zero-configuration developer machine setup and continuous environment synchronization platform built for development teams and software engineers.

---

## 🎯 What is Antigravity Sync?

Setting up a new developer machine or onboarding onto a team codebase typically takes hours or days of manual environment configuration: installing language runtimes, cloning dozens of repositories, installing dependencies (`npm`, `pip`, `uv`, `yarn`), configuring environment paths, writing AI agent rules, and setting up IDE workspace manifests.

**Antigravity Sync automates 100% of this workflow in a single click.**

---

## 🌟 Key Advantages & Benefits

| Advantage | Manual Machine Setup | Antigravity Sync Platform |
|---|---|---|
| **Onboarding Duration** | 4 to 8 Hours | **10 Seconds (1-Click)** |
| **System Prerequisites** | Manual `node`, `git`, `uv`, `agy` CLI installs | **Automated Pre-flight Background Runtime Installer** |
| **Framework Environment Setup** | Manual `npm install`, `pod install`, `pip` per repo | **Automated React Native, Node, & Python Auto-Setup** |
| **Global & Team AI Rules** | Manual configuration per project | **Auto-injected `~/.gemini/config/AGENTS.md` System Header** |
| **User Memory & Workflow Sync** | Fragmented / Lost across devices | **Git-Style Line-by-Line Delta Sync (Excluding heavy chat logs)** |
| **IDE Workspaces** | Manual folder adding | **Auto-registered `~/.gemini/config/projects/*.json` manifests** |
| **Background Sync** | Manual `git pull` across repositories | **Silent 15-Minute Background Engine & Quiet System Tray** |
| **Audit Log Diffs** | None / Blind logs | **Line-by-Line Colored Diff Inspector Modal (`+` green / `-` red)** |

---

## 📖 Step-by-Step User Guide

### Step 1: Launch & Sign In with GitHub
1. Open the **Antigravity Sync** desktop application.
2. Click **"Sign in with GitHub"**.
3. Complete secure GitHub browser authentication. Your access token is stored safely inside your **OS Keychain** (Windows Credential Manager / macOS Keychain).

---

### Step 2: Select Your Projects & Click "Set Up My Machine"
1. In the **My Projects** dashboard tab, observe your two project sections:
   - 🏢 **Company Assigned Repositories**: Scoped automatically to your GitHub username and team assignments.
   - 👤 **Personal Repositories**: Your personal GitHub projects.
2. Toggle **ON** the switch next to any projects you wish to set up on your computer.
3. Click **"Set Up My Machine"**.

---

### Step 3: Automated Machine Provisioning

During setup, Antigravity Sync performs automatically:
- ⚡ **Pre-flight Runtime Auto-Installer**: Verifies and silently installs missing runtimes (`Antigravity` CLI, `uv` Python package manager, `Node.js`, and `Git`).
- 📦 **Automated Git Clone / Pull**: Clones repositories directly into `~/Projects/` (`C:\Users\<User>\Projects\`).
- 📱 **Framework Environment Auto-Provisioning**:
  - **React Native Mobile Apps**: Auto-installs npm/yarn/pnpm packages, configures mobile environment rules, and creates `.agents/AGENTS.md`.
  - **Python Apps**: Executes `uv sync` or `pip install -r requirements.txt`.
  - **Custom Scripts**: Executes `setup.bat` / `setup.sh` automatically.
- 🧠 **System Memory & Workflow Rules Auto-Injection**: Injects system headers into `~/.gemini/config/AGENTS.md` so Antigravity AI natively reads user memories (`memory/*.json`) and skills (`skills/*`).
- 📁 **Antigravity Workspace Manifest Auto-Registration**: Registers `~/.gemini/config/projects/<slug>.json` for instant auto-discovery by Antigravity IDE.

---

### Step 4: Inspect Synced File Diffs in Real Time
1. Go to the **Sync Status** tab.
2. Click **"Inspect Synced File Changes"** on any activity log entry.
3. An interactive modal opens displaying exact line-by-line colored diffs (`+` green additions / `-` red deletions) of provisioned rules, workflow skills, user memories, and project manifests!

---

### Step 5: Start Coding in Antigravity IDE!
1. Click **"Done — Open Projects Folder"**.
2. Open **Antigravity IDE** — all your repositories, framework dependencies, global guidelines (`AGENTS.md`), user memories, and workflow skills are configured and ready for instant AI coding conversations!

---

## 🗄 Local Machine Directory Layout

```
~/Projects/                                  # (Windows: C:\Users\<User>\Projects\)
├── 📁 App Frontend/                         # Cloned repository with installed node_modules
├── 📁 React Native Mobile App/              # Mobile repo with React Native rules & dependencies
└── 📁 Personal Side Project/                # Cloned personal repository

~/.gemini/
└── config/
    ├── AGENTS.md                            # Merged company guidelines & user memory header
    ├── mcp_config.json                      # Rendered MCP tool connections with secrets
    ├── hooks.json                           # Lifecycle automation hooks
    ├── memory/                              # Personal user memories & learned preferences
    │   └── preferences.json
    ├── skills/                              # Team & personal workflow skills
    │   └── my-skill/
    │       └── SKILL.md
    └── projects/                            # Registered project manifests for Antigravity IDE
        ├── app-frontend.json
        └── react-native-mobile-app.json
```

---

## 🔒 Security & Privacy
- **Zero Proprietary Accounts**: Authentication uses your official GitHub ID.
- **Keychain Storage**: JWT tokens and secrets are stored in your operating system's native keychain (`keytar`).
- **User-Space Safety**: Clones repositories into `~/Projects/` avoiding OS privilege errors.
