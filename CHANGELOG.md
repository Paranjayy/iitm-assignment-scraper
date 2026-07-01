# Changelog

All notable changes to the IITM Portal Spotlight & Scraper extension.

---

## [1.9.4] - 2026-07-01

### Fixed
- **Copy / Cut from GrPA Editor** — Angular handlers were calling `preventDefault()` on copy/cut/keydown BEFORE the browser's native clipboard action could fire. New `background.js` unlocker adds three layers of interception:
  1. **Capture-phase `copy` / `cut` listeners** — When Angular blocks the event, manually write the current selection to the clipboard via `navigator.clipboard.writeText()` (with `execCommand` fallback). For ace editor: uses `editor.getSelectionRange()` + `session.getTextRange()`. For textareas: uses native `selectionStart/End`.
  2. **Capture-phase `keydown` for Ctrl/Cmd+C/X** — Some Angular handlers run at capture phase and preventDefault BEFORE the `copy` event fires. This catches the keyboard combo first, gets the selection from the active element, writes to clipboard, and prevents default. Handles both ace and plain textareas.
  3. **Clipboard write fallback chain** — Primary: `navigator.clipboard.writeText()`. Fallback: create a hidden `<textarea>`, select, `document.execCommand('copy')`.
  - **Cut support:** for both ace and textareas, when cut is intercepted, the selected text is also removed from the editor (with proper input/change events fired for Angular's form control).

---

## [1.9.3] - 2026-07-01

### Added
- **Aggressive Auto-Unlock** — `content.js` now fires `unlockPage` automatically in multiple waves without user action:
  - **Initial sweep:** 0ms, 500ms, 1.5s, 3s (covers Angular's first render + settle)
  - **Periodic re-unlock:** every 2s for the first 20s (catches late Angular re-renders)
  - **Tab click re-unlock:** clicking Question / Test Cases / Solution tab fires unlock at +200ms and +800ms (catches post-tab-swap re-lock)
  - **MutationObserver:** any new `.ace_editor` / `app-pa-code-editor` / `app-code-editor` added to the DOM triggers an immediate unlock (catches navigation between MCQ and GrPA, or between assignments, without page reload)

---

## [1.9.2] - 2026-07-01

### Fixed
- **GrPA Editor Paste/Copy Aggressive Unlock** — Old unlock only set `editor.setReadOnly(false)`. New portal's Angular component adds `<div class="readonly_line">` overlays on top of the ace editor (visible as gray bands) that visually mark the read-only prefix/suffix code and can also swallow pointer events. New unlocker:
  - Removes all `.readonly_line` elements from the editor
  - Forces `editor.getSession().setReadOnly(false)` on the ace session (in addition to the editor)
  - Removes `.is-disabled` and `.is-readonly` from the `.code-editor` wrapper
  - Removes any `.ace_readonly` / `.ace_invisible` / `.ace_obstructive_overlay` swallow divs
  - Injects a `<style id="iitm-unlock-style">` that forces `user-select: text` everywhere and hides `.readonly_line` permanently
- **Paste Event Intercept** — Some Angular keydown handlers call `preventDefault()` on the native paste event before it reaches the ace editor. Added a capture-phase `paste` listener that:
  - For ace editor: calls `editor.insert(text)` directly with the clipboard text
  - For textareas/inputs: inserts at cursor, fires `input` and `change` events so Angular's form control picks it up
- **Re-runs Unlock on T=300ms and T=1000ms** — Angular sometimes re-applies the read-only state on initial render. The 3-pass unlock ensures it sticks.

---

## [1.9.1] - 2026-07-01

### Fixed
- **GrPA Test Cases Extraction (new portal)** — Replaced old-selector heuristics (`.case-btn`, `[class*="case-tab"]`, etc.) with the actual new portal DOM: accordion panels (`.accordion-panel` → `button.accordion-header`) for Public/Private groups, case pills (`button.test-case-pill`) for individual cases, and `.test-case-block > .wrapper .title` / `.content` for Input / Expected Output. Auto-expands collapsed accordions, clicks each case pill, waits for content swap, and extracts per-case Input/Expected blocks with fingerprint dedup.
- **Deadline-Locked Groups** — Private test case accordions that show "You can view the Private Test Cases after the deadline has passed" are now correctly handled as locked (emits a `### 🔒 Private Test Cases` block with the deadline message instead of crashing).
- **Public Test Count Capture** — Reads the `.stats` text from the Public/Private accordion header to capture pass/total into `scrapeMetrics.publicTestsPassed/Total` and `privateTestsPassed/Total`.

### Notes
- Same fix applied to both code paths: the early `scrapeProgrammingAssignment()` GrPA flow AND the defensive branch inside `scrapeContent()`'s tab loop (kept as fallback for any future tabbed content).

---

## [1.9.0] - 2026-06-28

### Fixed
- **New Portal Assessment Scraper** — Complete rewrite for Angular portal's paginated assessment view (`.assessment-question-view`). Extracts clean markdown from `.text.backend-html`, `button.choice`, and `.chip` navigation.
- **MCQ Options Extraction** — Options now extracted as clean `- **A.** text` format from `button.choice > .choice-letter` + `.choice-text` instead of raw HTML dumps.
- **Recursive DOM Walker** — New `extractBackendHtml()` function properly handles nested `<main><div><p><span style="font-family: monospace">` structures for inline code formatting.
- **Introduction Cleanup** — Portal header noise ("Due Today", "Saved", date strings) filtered out of intro section.
- **Question Count** — `total_questions` frontmatter now correctly set to actual count (was showing 0).
- **Chip Navigation** — Scraper uses `button.chip[q+1]" to navigate between questions instead of fragile text-based Next button matching.

### Added
- **Auto-Start Assessment** — Scraper now automatically clicks the checkbox and "Start Assessment" button if on the start page, then waits for questions to load. No manual clicking needed.
- **Speed Optimization** — Wait times reduced from 800ms to 350ms per question. 29-question assignment now scrapes in ~15 seconds instead of ~40.
- **GrPA DOM Snapshot** — Captured `app-programming-assignment-view` structure for future GrPA scraper support (ace editor, test cases, submission toolbar).

### Added (GrPA)
- **GrPA Problem Statement** — Full extraction from `.prob-statement` with recursive DOM walker handling nested `<details>`, `<ol>`, `<pre><code>`, `<a>` links.
- **Template Code** — Extracts from `<details>` blocks and ace editor. Labels as template vs user code.
- **Test Cases Tab** — Auto-clicks "Test Cases" tab, extracts content, clicks back to Question.
- **Solution Tab** — Auto-clicks "Solution" tab if available, extracts official solution code.
- **Resource Links** — Extracts Python Tutor, Starboard, Pyodide links with icons.
- **Ace Editor Sync** — Reads template/user code from ace editor instance.

### Known Issues (Next)
- Bulk scraper not yet tested with new portal navigation
- Progress tracker only works for currently expanded course sections

---

## [1.8.0] - 2026-06-23

### Fixed
- **New Portal v2 Selector Compatibility** — Full rewrite of DOM selectors for the Angular-based portal (`seek.onlinedegree.iitm.ac.in`). Old portal still supported via auto-detection.
- **Sidebar Indexing** — Spotlight `⌘ K` search now correctly indexes from new `.unit-container` / `.child-row` sidebar DOM.
- **Bulk Export Navigation** — Week expansion logic updated for `.unit-header` and `.child-row` structure.
- **Progress Tracker** — Completion percentage calculation works with new sidebar item structure.
- **Header Injection** — Note/exam/progress buttons inject correctly into the new `.app-bar-container`.
- **Scrubber Title Detection** — `getCurrentPageTitle()` detects assignment titles from `.title-row .title` and `.child-title`.
- **Breadcrumb Deep Detection** — Falls back to `app-header .subtitle` for course name when breadcrumb is missing.
- **Topic Inference** — Tab label inference works across both old and new portal structures.
- **Syllabus Export** — Works for both old `.units__subitems` and new `.child-row` sub-items.
- **Auto-close Sidebar** — Timer-based sidebar collapse works with new portal DOM.
- **Fallback Navigation** — Spotlight `Enter` uses direct URL construction if sidebar click fails.

### Added
- **Smart Deadline Parser** — Parses the `app-submission-timer` component to extract actual submission deadlines (not just page load time).
- **Portal Version Auto-Detection** — `isNewPortal()` helper detects portal version and switches all selectors accordingly. Zero regressions guaranteed.
- **DOM Selector Abstraction Layer** — 10+ helper functions (`sidebarWeekSelectors()`, `sidebarSubItemSelector()`, etc.) for future-proofing against selector changes.
- **Score Checker Redirect Fix** — `background.js` fetch now uses `redirect: 'manual'` to handle cross-origin redirects properly.

---

## [1.7.1] - 2026-06-20

### Fixed
- Sidebar collapse timing for Angular portal
- Spotlight search indexing for new unit structure
- Progress tracker calculation accuracy

### Added
- Auto-collapse sidebar after 3 seconds
- Memory-cached syllabus DOM for instant Spotlight access

---

## [1.7.0] - 2026-06-15

### Fixed
- Duplicate test case detection
- OPPE solution tab boundary detection
- GrPA copy button injection timing

### Added
- Smart deadline parser for `app-submission-timer`
- Progress tracker widget
- Exam mode overlay
- Notes system with localStorage persistence

---

## [1.6.0] - 2026-06-01

### Added
- Spotlight command center (`⌘ K`)
- Categorized search (Programming Exams, Graded Assignments, Lectures)
- Bulk export with `⌘ B`
- AI integration (Claude, ChatGPT, Gemini)
- Score Checker gateway
- Native editor freedom (right-click restore, clipboard shortcuts)

---

## [1.1.0] - 2026-03-01

### Added
- Initial release with basic scraper
- Markdown export with Base64 image embedding
- Sidebar auto-collapse
- Right-click and copy shortcuts
