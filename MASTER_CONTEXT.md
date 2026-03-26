
# 🛡️ IITM Academic Engine Master Deployment (Chat context bridge)

This document contains is the **source of truth** for our engineering session. It unifies the logic from the browser extension and the Raycast toolset.

## 🌉 The Integration Ecosystem
1. **The Extension (IITM Scraper)**: 
   - **Spotlight (`⌘ K`)**: A Raycast-inspired command palette injected into the portal.
   - **Deep-Action Listener**: Listens for Instructions from the OS (Raycast) via URL messages (e.g., `?iitm_action=paste_code`).
   - **Learning OS Sync**: One-click bridge from portal GrPAs to local the `Learning OSS` Sandbox.
   - **Native Scraper**: Converts Portal assignments to standard Markdown with Base64 embedded images. 
2. **The Library (Learning OSS)**: 
   - **Next.js Infrastructure**: A high-performance note-taking and coding environment.
   - **Receiving Mode**: Sandbox enabled to Receive code injections from the portal.
3. **The Launcher (Raycast Extension)**:
   - **Universal Recall**: Searched all levels (Foundational, Diploma, BS) recursively from local Markdown files.
   - **Deep Interactivity**: Can "Push" code directly to your browser's active tab.

---

## 🚀 Accomplishments (The "Sync" Update)
### 💎 Browser Scraper
- [x] **MutationObserver Stability**: UI injections are now ultra-reliable and instant.
- [x] **Spotlight Keyboard Navigation**: Fixed Arrow keys and Enter key precision.
- [x] **Clean Mode Reverted**: Experimental dashboard overhaul removed at USER's request to preserve portal familiarity.
### 🛠️ Learning OSS ⚡ Extension Bridge
- [x] **Send-to-Sandbox**: URL deep-linking implemented on both ends.
- [x] **Code Push Logic**: Raycast can now command the portal editor via the browser extension.
### 🌌 Raycast Capabilities
- [x] **Recursive Indexing**: Crawler now visits all course directories dynamically.
- [x] **Push-to-Portal Action**: Bridging the desktop and web environment.

---

## 📜 Immediate Features to Test
### 1. The "Push to Portal" Command
Locate any local solution in Raycast. Hit `Command + Enter`. Watch it open the portal and **automatically inject your local logic** into the code editor.

### 2. The "Send to Sandbox" Command
While viewing a GrPA in the portal, use the Scraper Spotlight (`⌘ K`) and search for **"SEND TO SANDBOX"**. It will open your local Learning OS app with the code pre-loaded.

---

## 🔮 Roadmap (The "Pillar IV" Horizon)
- **Exam Simulator**: Use the scraped high-fidelity data to build a timed mock exam environment inside Learning OS.
- **Deadline OS**: Background service to monitor portal deadlines and push desktop notifications via Raycast.
- **Course HUD**: A persistent, minimalist status bar showing your "Path to S-Grade" stats.

---
*Maintained by Antigravity (Advanced Agentic Coding).*
