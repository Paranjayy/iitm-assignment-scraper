# IITM Portal Extension — Roadmap

## Current State (v1.9.0 — June 2026)

### ✅ Working
- MCQ Assignment scraping (new Angular portal) — clean markdown with options
- Auto-start assessment (checkbox + Start button auto-clicked)
- Spotlight `⌘ K` command center with course outline indexing
- Bulk export framework (not yet tested with new portal)
- Editor unlock / copy-paste freedom
- Notes system, Focus Bar, Progress Tracker
- AI integration (ChatGPT, Claude, Gemini, Grok, Cursor)
- Score Checker sync
- Deadline HUD

---

## Priority 1: Stability & Speed (This Week)

- [ ] **Test bulk scraper** with new portal navigation
- [ ] **Fix progress tracker** — currently only works for expanded sections in sidebar
- [ ] **Reduce scraper latency** further (parallel chip loading if possible)
- [ ] **Add debounce** to prevent double-click on Export button

## Priority 2: GrPA / Programming Assignment Support

- [x] **GrPA Problem Statement** — Extract from `app-pa-question .backend-html .prob-statement`
- [x] **Template Code** — Extract from `<details>` blocks with `<pre><code>` or ace editor content
- [x] **Test Cases** — Click "Test Cases" tab and extract content
- [x] **Solution Tab** — Click "Solution" tab if available, extract official solution
- [x] **User's Code** — Read from ace editor instance
- [x] **Code Block Formatting** — Convert to fenced ```python blocks in markdown
- [x] **Resource Links** — Python Tutor, Starboard, Pyodide links extracted

### GrPA DOM Structure (captured)
```
app-programming-assignment-view
├── .tabs-pane (Question | Test Cases | Solution)
│   ├── app-pa-question .backend-html .prob-statement
│   │   ├── <p><b>Instructions</b></p>
│   │   ├── <ol> task list </ol>
│   │   ├── <details> Instructions </details>
│   │   ├── <details> Template Code with <pre><code> </details>
│   │   └── <p><a> Python Tutor / Starboard links </a></p>
│   └── (Test Cases tab — click to reveal)
└── .pa-code-editor (ace editor with template code)
```

## Priority 3: OPPE / NPPE Support

- [ ] **OPPE Exam View** — Handle exam-specific UI (timer, lockdown indicators)
- [ ] **NPPE Pattern** — Multiple-choice within exam context
- [ ] **Solution Tab** — Extract official solutions when available

## Priority 4: Enhanced Features

- [ ] **Obsidian-friendly math** — `$math$` for inline, `$$math$$` for display
- [ ] **Image export** — Download images as resources folder alongside markdown
- [ ] **Quiz export** — Graded quiz scraping (similar to MCQ but different UI)
- [ ] **LaTeX/KaTeX cleanup** — Convert `\frac{}{}` to readable format
- [ ] **Cross-referencing** — Link questions to their lecture videos

## Priority 5: Bulk & Automation

- [ ] **Bulk scraper** — Navigate all weeks, scrape all assignments automatically
- [ ] **Progress sync** — Track which assignments have been scraped
- [ ] **Auto-update** — Check for new assignments and notify
- [ ] **Cloud sync** — Upload scraped content to a shared vault

---

*Last updated: 2026-06-28*
