# 🚀 IITM Portal Spotlight & Scraper V1.1.0

A premium, Raycast-inspired command center and robust assignment scraper for the IIT Madras Online Degree portal.

## 📖 The Philosophy

This extension started as a simple scraper to avoid the tedious manual backup of course assignments. Over time, it evolved into a **Complete Study Suite**. Our goal is to transform the IITM portal from a basic LMS into a high-performance developer environment where every lecture, assignment, and graded task is just a few keystrokes away.

## ✨ New in V1.1.0 (The "Freedom" Update)

### 🔓 Native Editor Freedom & Clipboard Mastery
Say goodbye to draconian text restrictions on the IITM Code Editors!
- **True Right-Click Restored**: We forcefully obliterate the site's `oncontextmenu` blockers. Right-click, inspect, and copy anywhere.
- **Native OS Shortcuts**: Select, Copy (`⌘ C`), Cut (`⌘ X`), and Paste (`⌘ V`) directly back into the IDE natively without battling the strict isolated clipboard.
- **1-Click "Copy Code"**: A brand new **📋 Copy Code** button sits elegantly inside the injected Focus Bar above all GrPAs, instantly exporting your exact syntax into your OS clipboard (reinforced by a custom asynchronous fallback memory engine).
- **The "Freedom" Button**: If the site attempts to lock you out mid-session, hit the new **🔓 Unlock** button in the header to destroy read-only DOM locks and grant you full interaction capabilities.

### 🧠 Caching & Massive Quality of Life
- **Intelligent Sidebar Auto-Collapse**: The massive desktop syllabus sidebar now graciously collapses automatically 3 seconds after load, reclaiming 25% of your monitor space!
- **Secret Memory State**: Behind the scenes, the extension secretly mem-caches the entire Angular syllabus DOM mere milliseconds before collapsing it. `⌘ K` Spotlight commands instantly parse the entire 300+ item catalogue directly from memory without dropping items.
- **Fixed Spotlight Navigation**: Enter key execution mappings have been fully repaired. Hitting `Enter` perfectly navigates to your targeted assignment instead of misfiring.
- **Surgical Data Scrubbing**: Removed phantom Angular artifacts that generated duplicated outputs. Your submissions are now beautifully pinned to the absolute bottom of any offline markdown exports.

---

## 🔍 Core Toolkit

### 🌌 Spotlight Command Center (`⌘ K`)
- **Global Search**: Find any lecture, assignment, or system command instantly across the active course.
- **Categorized Intelligence**: 
    - 🚨 **PROGRAMMING EXAMS (OPPE/NPPE)**
    - 💻 **PROGRAMMING ASSIGNMENTS**
    - 📝 **GRADED ASSIGNMENTS & QUIZZES**
    - 🎥 **LECTURE VIDEOS**
    - 📖 **COURSE OUTLINE** (Practice modules)
- **Extended Metadata Filtering**: Visual chips let you hyper-filter down to only `Pending` tasks, or specifically search deep transcripts.

### 🧺 Advanced Markdown Scraper
- **Completely Offline**: Automatically converts and embeds math visuals/images as Base64 strings natively into Markdown.
- **Exhaustive Capture**: Pinpoints Problem statements, IDE Template Code, Public/Private Test Cases, Verified Solutions, and your exact Submissions across locked and unlocked states.
- **Bulk Export Generator**: Select multiple entire unit modules inside Spotlight and trigger the "Bulk Export All Weeks" command `⌘ B` to dynamically generate a clean ZIP archive of your entire semester.
- **AI Integration**: Instantly pipeline your active GrPA context to Claude, ChatGPT, or Gemini with pre-injected analytical prompts.

## ⌨️ Global Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘ K` | Open/Close Spotlight |
| `⌘ J` | Open Action Developer Options (inside Spotlight) |
| `Alt ↑ / ↓` | Super-Jump between Result Groups |
| `Enter` | Open selected unit |
| `Shift + Click` | Range-Select units for Bulk Export |

## 🛠️ Installation Development

1. Clone this repository: `git clone https://github.com/Paranjayy/iitm-assignment-scraper.git`
2. Open Chrome/Arc and navigate to `arc://extensions/`
3. Enable **Developer Mode**.
4. Click **Load Unpacked** and select the extension folder.
5. Hit the **Reload** button inside the extension view combined with a massive Hard Refresh `Cmd+Shift+R` to update dynamic DOM listeners.

---
*Built for excellence by Paranjayy. Turn your browser into a command center.*
