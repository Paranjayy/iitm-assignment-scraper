# Features

Complete feature documentation for the IITM Portal Spotlight & Scraper extension.

---

## 🔍 Spotlight Command Center (`⌘ K`)

The core feature — a Raycast-inspired fuzzy search overlay that indexes every item in the current course.

### How it works
- Detects portal version (old GCB vs new Angular) via `isNewPortal()`
- Indexes sidebar items from memory-cached DOM (instant, no re-fetch)
- Categories: Programming Exams (OPPE/NPPE), Graded Assignments, Lectures, Course Outline
- Visual filter chips for Pending/Done/All status
- `Enter` opens selected item; `⌘ J` opens developer options
- `Alt + ↑/↓` jumps between result groups
- `Shift + Click` selects multiple items for bulk export

### Commands available in Spotlight
| Command | Shortcut | Description |
|---------|----------|-------------|
| Open Spotlight | `⌘ K` | Toggle the search overlay |
| Bulk Export All Weeks | `⌘ B` | Export selected weeks as ZIP |
| Open Score Checker | — | Navigate to Score Checker |
| Export to Claude | — | Send context to Claude |
| Export to ChatGPT | — | Send context to ChatGPT |
| Export to Gemini | — | Send context to Gemini |

---

## 🧺 Assignment Scraper

### Regular Assignments
- Extracts problem statement, template code, test cases (public + private)
- Captures your submission and verified solution (when available)
- Embeds images as Base64 for offline viewing
- Metadata frontmatter: title, course, breadcrumb, topic, due date, score

### Graded Programming Assignments (GrPA)
- Same as regular + extraction of test harness boundaries
- OPPE/NPPE solution tab detection
- Copy Code button injection (`📋 Copy Code`)

### Bulk Export
- Select multiple weeks in Spotlight
- `⌘ B` triggers ZIP generation with JSZip
- Each week = one folder, each assignment = one `.md` file
- Export summary report included

---

## 📊 Progress Tracker

- Calculates completion percentage from sidebar item states
- Injects progress bar into course header
- Updates in real-time as items are completed
- Works with both old and new portal sidebar structures

---

## ⏰ Deadline HUD

- Parses the `app-submission-timer` component for actual deadlines
- Shows countdown in a floating widget on the course page
- Detects "due in X days/hours/minutes" text
- Falls back to page load time if no timer element found
- Auto-removes when deadline passes

---

## 📝 Notes System

- localStorage-based note storage per assignment
- Injected note icon in course header
- Click to open note editor overlay
- Notes persist across sessions
- Exportable (stored in localStorage, user can manually backup)

---

## 🎯 Exam Mode

- Full-screen overlay for timed exams
- Hides all extension UI elements
- Can be toggled from header utils
- Prevents accidental distractions during NPPE/OPPE

---

## 🖱️ Editor Freedom

- Restores native right-click context menu (overrides site's `oncontextmenu` blocker)
- Enables native OS clipboard shortcuts (`⌘ C`, `⌘ X`, `⌘ V`)
- "Freedom Button" (`🔓 Unlock`) destroys read-only DOM locks

---

## 🤖 AI Integration

- One-click context pipeline to:
  - Claude (Anthropic)
  - ChatGPT (OpenAI)
  - Gemini (Google)
- Pre-injected analytical prompts for each tool
- Passes current assignment context automatically

---

## 📈 Score Checker

- Direct injection into IITM's Score Checker utility
- Navigates to the Score Checker with course context
- `background.js` handles cross-origin fetch with `redirect: 'manual'`

---

## 🧠 Portal Detection System

The extension auto-detects which portal version is running:

```
New Portal (Angular):
  - .unit-container, .app-side-nav, .child-row present
  - Selectors: .unit-header, .child-title, .title-row .title
  
Old Portal (GCB):
  - .units__items, .units__subitems present
  - Selectors: .units__items-title, .hide-outline-btn
```

Switching is automatic and zero-regression.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ K` | Open/Close Spotlight |
| `⌘ J` | Developer Options (inside Spotlight) |
| `Alt + ↑/↓` | Jump between result groups |
| `Enter` | Open selected item |
| `Shift + Click` | Range-select for bulk export |

---

## 🏗️ Architecture

```
extension/
├── background.js          # Service worker, context menus, message passing
├── content.js             # Button injection, UI bridge, keyboard listeners
├── inject_button.css      # Floating button styles
├── portal_enhancements.js # Spotlight, progress, deadline, notes, exam mode
├── scripts/
│   └── scraper.js         # Assignment export, title detection, markdown generation
├── jszip.min.js           # ZIP generation for bulk export
├── turndown.js            # HTML to Markdown conversion
└── manifest.json          # Extension manifest v3
```

---

## 🔧 Installation

1. Clone: `git clone https://github.com/Paranjayy/iitm-assignment-scraper.git`
2. Open `arc://extensions/` (or `chrome://extensions/`)
3. Enable **Developer Mode**
4. Click **Load Unpacked** → select extension folder
5. Hard refresh `⌘ + Shift + R` on the portal

---

*Last updated: June 2026*
