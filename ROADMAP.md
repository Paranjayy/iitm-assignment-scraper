# IITM Portal Extension — Roadmap

> Chrome extension for scraping IITM online degree portal assignments as clean Obsidian-friendly Markdown.
> **Current version:** 1.9.6 (pushed 2026-07-01)

---

## ✅ Working (v1.9.6)

### Core Scraping
- **MCQ Assignment scraping** (new Angular portal `seek.study.iitm.ac.in`)
  - Paginated extraction via `.chip` navigation
  - All 29 questions in ~15s
  - Auto-start: clicks checkbox + "Start Assessment" button
- **MCQ Review mode** — correct/incorrect marks, user answer vs correct
- **GrPA Problem Statement** — `.prob-statement` extraction
- **GrPA Template Code** — `<details>` blocks + ace editor fallback
- **GrPA Test Cases** — new portal accordion (Public/Private) with case pills, 8 cases extracted cleanly
- **GrPA Solution tab** — extracts official solution code
- **Resource Links** — Python Tutor, Starboard, Pyodide, Colab
- **Old portal support** — `seek.onlinedegree.iitm.ac.in` (auto-detected)

### Unlock / Paste / Copy
- **Aggressive unlocker** — strips `.readonly_line` overlays, `.is-disabled` class, `readOnly` on editor + session
- **Multi-wave auto-unlock** — initial sweep (0/500/1500/3000ms) + periodic (3s for 30s)
- **Tab click re-unlock** — re-unlocks after Question/Test Cases/Solution tab swap
- **MutationObserver re-unlock** — fires when new ace editor added (nav between MCQ/GrPA)
- **Paste works in all GrPAs** — handles ace autocomplete popup (routes to main editor)
- **Copy/Cut works** — 3-layer intercept: capture copy/cut + capture keydown + clipboard API fallback
- **Throttled to prevent message channel spam** — 500ms min between unlocks

### Other Features
- **Spotlight `⌘ K`** — command center with course outline indexing
- **Bulk export** — auto-clicks checkbox + Start before scraping
- **AI integration** — ChatGPT, Claude, Gemini, Grok, Cursor
- **Score Checker sync**
- **Notes system, Focus Bar, Progress Tracker, Deadline HUD**
- **Popup UI** with Export/Bulk/Unlock/Spotlight/DarkMode/AI buttons
- **Context menus** for new portal

### Debug
- **Opt-in logging** — `localStorage.setItem('iitmDebug', '1')` in DevTools console to enable verbose logs

---

## 🔴 P1 — High Priority (Next Session)

### Bulk Export Validation
- [ ] **Test bulk scraper with new portal** — never tested since the Angular rewrite
- [ ] **Handle auto-start in bulk flow** — verify Start button auto-click works for ALL unit types (MCQ, GrPA, GA)
- [ ] **Add error recovery** — if one unit fails, continue with the rest, log failures
- [ ] **Progress UI** — show which week/unit is currently being scraped

### Scraping Quality
- [ ] **Verify all 8 public test cases extracted** for GrPA 3-5 (only GrPA 1 confirmed so far)
- [ ] **Private test case detection** — current code detects lock, but should also try after deadline
- [ ] **Run/Submit test output** — capture stdout/stderr from successful runs as part of markdown

---

## 🟡 P2 — Medium Priority

### Obsidian Polish
- [ ] **Math format** — change `\(` `\)` `\[` `\]` → `$math$` and `$$math$$` for Obsidian
  - File: `scripts/scraper.js` line ~21-31 (`turndownService.addRule("katex-math", ...)`)
  - Currently outputs: `\n\n$$\n${math}\n$$\n\n` for block, `$${math}$` for inline
  - Wait — actually this ALREADY outputs `$$...$$` and `$...$`! Need to verify with a math test case
- [ ] **Image embedding** — download images to `resources/` subfolder, link in markdown
- [ ] **Frontmatter validation** — make sure all scrapes produce valid YAML

### Performance
- [ ] **Reduce MCQ wait time** — currently 350ms/question, could try 200ms
- [ ] **Parallel chip loading** — load multiple question chips concurrently instead of serial
- [ ] **Lazy load Turndown** — currently loaded in content script, could defer

### UI/UX
- [ ] **Better error messages** — show toast with specific failure reason
- [ ] **Progress bar in floating button** — show scrape progress
- [ ] **Keyboard shortcut to trigger scrape** — currently only via floating button
- [ ] **Dark mode for popup** — currently only injects dark mode on portal

---

## 🟢 P3 — Low Priority / Nice-to-Have

### Edge Cases
- [ ] **Offline detection** — don't show "Scrape failed" if user is offline
- [ ] **Multiple tabs** — handle scraping when multiple IITM tabs are open
- [ ] **Quiz support** — graded quizzes (Week 2-3 weekly quizzes)
- [ ] **OPPE exam mode** — timer, lockdown, special exam UI
- [ ] **NPPE exam** — similar to OPPE but different pattern

### Features
- [ ] **Search within exported markdown** — search box in popup
- [ ] **Tag/label system** — auto-tag assignments by week/topic
- [ ] **Cross-link to video lectures** — match GrPA to its lecture
- [ ] **Spaced repetition export** — Anki format for important concepts
- [ ] **AI solution generation** — auto-generate solution for GrPA from question

### Dev / Build
- [ ] **TypeScript migration** — scraper.js is 2000+ lines of vanilla JS
- [ ] **Unit tests** — JSDOM-based tests for scraper functions
- [ ] **CI/CD** — auto-build + lint on push
- [ ] **Chrome Web Store publish** — currently only load unpacked
- [ ] **Firefox port** — Manifest V3 Firefox support

---

## 🐛 Known Issues

### Minor
- [ ] **Progress tracker only works for expanded sidebar sections** — needs query all weeks
- [ ] **Spotlight search shows ALL items when sidebar is collapsed** — should fall back to recent
- [ ] **No way to re-export with different options** — have to clear cache manually

### Platform Changes to Watch
- IITM updated portal 2026-07-01 with **stronger keydown blocks** (Ctrl+V killed by `stopImmediatePropagation`)
  - Worked around via ace `commands.replaceCommand('paste')` — but if they patch this too, need new approach
- Ace editor API quirks — `getSession().setReadOnly()` doesn't exist in newer ace (use `setReadOnly` directly on editor)
- Angular's `MutationObserver` race condition — need to debounce or use `requestIdleCallback`

---

## 💡 Ideas Backlog

- **Voice control** — "Export current page" via Web Speech API
- **Mobile companion** — iOS Shortcut that opens extension URL
- **Collaborative vault** — share exported notes with classmates (CRDT or simple merge)
- **Grading predictor** — based on past submissions, predict if you'll pass OPPE
- **Time tracker** — auto-track how long you spend on each GrPA
- **Streak tracker** — don't break the chain

---

## 🛠 Known Pitfalls (Tried & Failed)

- **MutationObserver on document.body** — caused massive lag when Angular rendered new views. Removed entirely.
- **Overriding `editor.setReadOnly` to always return false** — broke Angular's form control, prevented typing. Replaced with conditional `if (editor.getReadOnly()) editor.setReadOnly(false)`.
- **Adding custom undo/redo commands** — conflicted with Angular's key bindings. Removed.
- **Reading test cases via clicking case buttons** — DOM was different from selectors. Fixed by going through accordion panels.
- **Background.js `edit_file` tool reformatting** — the tool keeps converting 4-space to 4-space + normalizing, but **breaks the file diff**. Workaround: use Python scripts with `text.replace()` for surgical edits.
- **Tool reformatting (KEY LEARNING)** — the `edit_file` tool reformats indentation of the file when the match string is in a region with non-standard indentation. Always check `git diff --stat` after a tool edit; if it shows huge changes, revert and use Python.

---

*Last updated: 2026-07-01*
*Latest commit: `8c03910` — Throttle auto-unlocker to prevent message channel spam*
