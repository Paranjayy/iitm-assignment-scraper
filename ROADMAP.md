# Upcoming Roadmap & Developer Notes

This document serves as an ongoing tracker for key details, technical debt, and ambitious features engineered for upcoming developers and contributors.

---

## 🎯 V2.0 Ambitions

### Phase 2: GrPA Analytics & Persistence Engine
We need a local "Activity Ring" style analytics dashboard for the coding metrics.

*   **Intelligent Timing State**: A formal Timer UI with Play/Pause/Resume functionality that tracks active coding time (Time-On-Task) for each specific GrPA question.
*   **Submission Telemetry**: Hook into the `Test Run` and `Submit` buttons to track how many times a user clicked submit, what the error outputs were, and the frequency of failures per assignment.
*   **Difficulty Profiling**: Provide an aggregate score / difficulty metric based on time spent + error count to help pinpoint weak conceptual areas for the user to review.
*   **Persistent Storage**: Save these activity logs locally inside `chrome.storage.local` associated natively with the Assignment ID (so it persists across reloads).

## Phase 3: The Cross-Course Orchestrator (VCS) Scraping)
- **Objective:** The user wants to scrape not just a single active course, but *all* active term courses seamlessly (e.g., Graded, GrPA, normal progression content) directly from the dashboard into a massive version-controlled source folder locally.
- **Technical Requirement:** Needs robust SPA (Single Page Application) sequence logic within `background.js`. The extension must navigate the IITM Dashboard `DOM` elements to fetch active course URLs, silently open a new background tab or iframe for each course, run the `bulkScrapeAll()` logic, zip everything, and compile a massive repo.
- **Note to Self:** Do *not* rely on foreground DOM. The user will supply the dashboard DOM at a later stage to allow writing precise orchestrator hooks.

### 2. Deep Native Analytics Engine
- **Objective:** Track the exact amount of time spent solving programming assignments (GrPAs) week-on-week, and visualize the progression metrics.
- **Requirements:** 
    - Construct a `setInterval` or Web Worker that logs time in `chrome.storage.local`.
    - Timers must have robust **Pause/Resume** capabilities.
    - **Persistence:** If a user closes Arc/Chrome mid-assignment and returns 3 days later, the timer state must recall the exact previously recorded seconds and append logic.
    - Analytics should chart *Time Taken vs Grade Received*.

### 3. Raycast & Alfred Native Integration
- **Objective:** Expose the extension's Spotlight engine to external native MacOS desktop application launchers (Raycast / Alfred).
- **Implementation:** Utilize an internal localhost WebSocket server inside `background.js` OR expose a custom URI Protocol handler (`iitm://`) that Raycast can invoke via a bash script. The goal is `Cmd+Space` -> "Search IITM Arrays" -> instantly launches Chrome directly into the week 5 assignment.

### 4. Continuous UI Refinement
- **Objective:** Tidy the UI interfaces, especially the newly implemented `focus-bar-right` buttons.
- **Current Status:** Features (`📋 Copy Code` & `🔓 Unlock`) function perfectly, but spacing and alignment across multiple diverse monitor sizes (MacBooks vs external ultra-wides) might require Flexbox pixel auditing.

---
### 🛠️ Developer Pitfalls to Avoid (Lessons Learned)
- **The Angular Sandbox:** IIT Madras uses a highly aggressive Angular implementation. When elements like the massive left-side navigation disappear, Angular literally destroys the DOM nodes. **Do not execute live queries on hidden sidebars**, or tools like Spotlight will crash searching for missing headers. We solved this securely using a `<3000ms>` delay combined with the `window.__iitm_get_items` memory-state extraction before closure.
- **The Ace Editor Trap:** Right-click menus and clipboard mappings are overwritten by custom Javascript running in isolated contexts. You must inject scripts into the `MAIN` execution world (see `background.js: unlockPage`) to strip `e.stopPropagation()` and reset `document.oncontextmenu = null`.
- **Async Clipboard API:** Chrome kills `navigator.clipboard.writeText` if you wait too long after a mouse click (like during an AI code pull). Always keep a fallback `document.execCommand('copy')` combined with an invisible `<textarea>`. It saves lives.
