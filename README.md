# IITM Portal Spotlight & Scraper v1.8.0

A premium, Raycast-inspired command center and robust assignment scraper for the IIT Madras Online Degree portal.

## The Philosophy

This extension started as a simple scraper to avoid the tedious manual backup of course assignments. Over time, it evolved into a **Complete Study Suite**. Our goal is to transform the IITM portal from a basic LMS into a high-performance developer environment where every lecture, assignment, and graded task is just a few keystrokes away.

## Features

| Feature | Description |
|---------|-------------|
| 🔍 **Spotlight** (`⌘ K`) | Fuzzy search across all course items with categorized results |
| 🧺 **Assignment Scraper** | Export any assignment as clean Markdown with test cases + solutions |
| 📊 **Progress Tracker** | Real-time completion percentage in course header |
| ⏰ **Deadline HUD** | Floating countdown widget for due dates |
| 📝 **Notes System** | Per-assignment notes with localStorage persistence |
| 🎯 **Exam Mode** | distraction-free overlay for timed exams |
| 🖱️ **Editor Freedom** | Restore right-click + clipboard shortcuts |
| 🤖 **AI Integration** | One-click export to Claude / ChatGPT / Gemini |
| 📈 **Score Checker** | Direct navigation to IITM Score Checker utility |
| 🧺 **Bulk Export** | Select multiple weeks → export as ZIP archive |

## Quick Start

1. Clone: `git clone https://github.com/Paranjayy/iitm-assignment-scraper.git`
2. Open `arc://extensions/` (or `chrome://extensions/`)
3. Enable **Developer Mode**
4. Click **Load Unpacked** → select the extension folder
5. Hard refresh `⌘ + Shift + R` on the portal

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ K` | Open/Close Spotlight |
| `⌘ J` | Developer Options (inside Spotlight) |
| `Alt + ↑/↓` | Jump between result groups |
| `Enter` | Open selected item |
| `Shift + Click` | Range-select for bulk export |
| `⌘ B` | Bulk Export selected weeks |

## Portal Compatibility

The extension auto-detects which portal version you're on:

- **New Portal (Angular)** — `seek.onlinedegree.iitm.ac.in` with `.unit-container` / `.child-row`
- **Old Portal (GCB)** — `ds.study.iitm.ac.in` with `.units__items` / `.units__subitems`

Zero regressions guaranteed — old portal still fully supported.

## Documentation

- [CHANGELOG.md](CHANGELOG.md) — Version history and updates
- [FEATURES.md](FEATURES.md) — Complete feature documentation
- [FEATURE_IDEAS.md](FEATURE_IDEAS.md) — Future feature brainstorm
- [SCRAPER_GUIDE.md](SCRAPER_GUIDE.md) — Technical scraper internals

## Screenshots

See [screenshots/](screenshots/) for extension screenshots (coming soon).

---

*Built for excellence by Paranjayy. Turn your browser into a command center.*
