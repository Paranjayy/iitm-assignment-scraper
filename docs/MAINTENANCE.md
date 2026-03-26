# IITM Assignment Scraper: Maintenance & Architecture Guide

## 📌 Project Overview
The IITM Assignment Scraper is a high-fidelity Chrome Extension engineered to bulk-harvest programming and standard assignments from the IITM Portal. Its primary goal is to bypass the limitations of standard text-selection and "Print to PDF" methods, providing users with pristine, structured Markdown exports that preserve code editors, test cases, template code, and mathematical formulas via MathJax and Turndown.

## ✨ Core Feature Set
1. **Intelligent DOM Scrubbing & Turndown Conversion**: Seamlessly converts complex portal components into clean Markdown, intentionally preserving critical `<pre>` blocks (Template Code) while silently filtering out visually noisy UI elements (tab bar headers, Ace editor gutters).
2. **Deep Acet/Code Editor Capture**: Traverses native DOM bindings and Ace editor environments (`.ace_editor`, `app-code-editor`) to extract code line-by-line. Uses a strict hashing mechanism (`capturedCodes`) to guarantee code blocks are printed effectively and deduplicated across locking phases.
3. **Tab Sequencing & Lock Detection**: Automatically navigates through `Overview -> Question -> Test Cases -> Solution`. Uses intelligent DOM property checks (`aria-disabled="true"`, `.locked-case`) to identify locked tabs explicitly, generating custom `🔒 Locked` warnings in the Markdown rather than crashing or ghosting outdated elements.
4. **Smart Bulk Extraction Logic**: Implements queue-based sequencer (`portal_enhancements.js`) that captures multiple user-selected items dynamically. Includes Smart ETA calculation, robust timeout fallback handling (to survive IITM portal lag), and auto-navigational recovery.
5. **Asset & Image Integration**: Dynamically intercepts Base64 image blobs inside the portal and embeds them directly in the Markdown, maintaining full context without external hotlinking (which decays over time).
6. **Focus Timer & Ref Palette**: A floating action window to manage boilerplates, start focus timers, and improve the user environment while coding directly on the portal.

---

## 🛠 Architectural Retrospective & "Regrets"

### What We Did Right
* **Markdown Over PDF**: Exporting as Markdown was the absolute correct choice for Obsidian users and developers. It is extensible, lightweight, and inherently portable.
* **Aggressive Deduplication Engine**: The `capturedCodes` Set implemented late in the project drastically reduced headaches by comparing physical code text instead of relying on unpredictable DOM node relationships.
* **Component-Agnostic Fallbacks**: By searching for `.ace_editor`, `app-code-editor`, and `[data-full-code]`, the scraper can survive IITM pushing backend framework updates. 

### What We "Regret" & Improvements We Could Have Made
If a senior engineer were to rewrite this from absolute scratch, these would be the core focus areas:
1. **Message Passing Overhead**: The current architecture relies heavily on orchestrating content scripts (`portal_enhancements.js` and `scraper.js`) through `background.js` and sometimes `offscreen.html`. This creates race conditions if a page fails to load. Moving the entire scraping engine to evaluate completely inside the content script's isolated world, with the background script solely acting as the ZIP/Download manager, would reduce complexity.
2. **The Layout Breather Delay (`setTimeout(300ms)`)**: Currently, the system clicks a tab and artificially waits 150-300ms to ensure the portal's Angular framework has hydrated the DOM. This is a brittle mechanism ("Sleep" statements in UI testing are traditionally anti-patterns). 
   - *Better Approach*: Use `MutationObserver` to watch the DOM and fire the capture the exact millisecond the `.ace_editor` injected or the spinner vanished.
3. **Turndown Overhead**: We re-instantiate `TurndownService` heavily. A singleton pattern mapping custom rules specifically for IITM's DOM quirks would be significantly faster across bulk scraping 50+ assignments.

---

## 🚦 Do's and Don'ts For Future Maintainers
**DO:**
* **Respect the Portal's Lag**: IITM's authentication and Apollo GraphQL layers often hang. Never assume a DOM element structurally exists until you verify it (e.g., always use `if (el)` checks before `el.innerText`).
* **Test both Before & After Deadlines**: A massive amount of conditional logic exists purely because the portal changes DOM structure when deadlines pass (Tabs lock, Private tests show/hide, Official solutions unlock). 
* **Use Absolute DOM Paths Sporadically**: Avoid querying deeply specific Angular `ng-content` hashes. Stick to broader semantic classes like `.ace_editor`, `.case-btn`, `.right-panel`.

**DON'T:**
* **Don't Strip `<pre>` and `<code>` broadly**: In an attempt to clean the output, do not indiscriminately `.remove()` pre blocks. The portal uses them for both Template Question code and Official Solutions.
* **Don't Rely on URL Changes for State**: The IITM portal functions as a Single Page Application (SPA). The URL often doesn't change when switching between tabs or even completely different assignments. Rely on visual DOM indicators.

---

## 🔮 Future Features Pipeline
If development continues, here are the highest-ROI features to explore:
1. **Discreet Personal Analytics**: Track time spent on an assignment before clicking "Submit" by attaching a listener entirely offline in the extension. Graph this data to show users their coding velocity over the semester.
2. **"Copy/Paste in a Hurry"**: Implement a one-click button that bypasses Markdown ZIP generation and just rips the right-panel `My Submitted Code` directly to the OS clipboard for lightning-fast archiving.
3. **Sidebar Default Collapse**: Inject CSS on load to auto-close the massive left navigation sidebar to reclaim 20% of the screen real-estate for the coding window.
4. **Raycast / Alfred Integration**: Expose a local Webhook or deep-link `iitm-scraper://` protocol from the Extension so users can trigger an export exclusively via a keyboard shortcut outisde the browser.
