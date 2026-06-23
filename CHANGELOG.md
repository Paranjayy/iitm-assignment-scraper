# Changelog

All notable changes to the IITM Portal Spotlight & Scraper extension.

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
