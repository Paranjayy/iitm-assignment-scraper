// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "scrapeAssignment",
      title: "📝 Export to Markdown",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*", "https://ds.study.iitm.ac.in/*", "https://score-checker-379619009600.asia-south1.run.app/*"]
    });
    chrome.contextMenus.create({
      id: "unlockPage",
      title: "🔓 Unlock Editor/Copy-Paste",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*", "https://ds.study.iitm.ac.in/*", "https://score-checker-379619009600.asia-south1.run.app/*"]
    });

    // Top-level UI Management (No nesting as requested)
    chrome.contextMenus.create({
      id: "toggleCleanMode",
      title: "🪄 Toggle Clean UI (All)",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*"]
    });

    chrome.contextMenus.create({
      id: "toggleFocusBar",
      title: "⏱️ Toggle Focus Bar",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*"]
    });

    chrome.contextMenus.create({
      id: "toggleProgress",
      title: "📊 Toggle Progress Tracker",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*"]
    });

    // Curriculum Archiver — only shows on the public academics page
    chrome.contextMenus.create({
      id: "archiveCurriculum",
      title: "📚 Archive Full Curriculum (IITM)",
      contexts: ["all"],
      documentUrlPatterns: ["https://study.iitm.ac.in/ds/academics.html*"]
    });

    // Capture selection (Only shows when something is highlighted)
    chrome.contextMenus.create({
      id: "sendToNotes",
      title: "📝 Send Selected to Notes",
      contexts: ["selection"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*"]
    });
    
    // Separator
    chrome.contextMenus.create({ id: "sep1", type: "separator", contexts: ["all"], documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*", "https://ds.study.iitm.ac.in/*"] });
    
    // GrPA-specific
    chrome.contextMenus.create({
      id: "scrapeGrPA",
      title: "💻 Export GrPA (Problem + Code + Tests)",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*"]
    });
    
    // Bulk export
    chrome.contextMenus.create({
      id: "bulkExport",
      title: "📦 Bulk Export All Weeks",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*"]
    });
    
    // Spotlight search
    chrome.contextMenus.create({
      id: "openSpotlight",
      title: "🔍 Open Spotlight (⌘K)",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*"]
    });
    
    // Dark mode
    chrome.contextMenus.create({
      id: "toggleDarkMode",
      title: "🌙 Toggle Dark Mode",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://seek.study.iitm.ac.in/*"]
    });
  });
});

// Helper to unlock editors and events
function unlockPage(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: () => {
            // Aggressive unlock for new portal's ace editor + Angular overlays
            const unlock = () => {
                document.querySelectorAll('.ace_editor').forEach(el => {
                    try {
                        const editor = el.env?.editor || (typeof ace !== 'undefined' ? ace.edit(el) : null);
                        if (editor) {
                            if (editor.getReadOnly()) editor.setReadOnly(false);
                            // Force the read-only state off on the session too
                            try { editor.getSession().setReadOnly(false); } catch(e) {}
                        }
                    } catch(e) {}
                    // Fix textareas (ace uses one for input)
                    el.querySelectorAll('textarea').forEach(ta => {
                        ta.removeAttribute('readonly');
                        ta.removeAttribute('disabled');
                        ta.removeAttribute('aria-disabled');
                        ta.readOnly = false;
                        ta.disabled = false;
                    });
                    // Remove the visual read-only overlays Angular puts on top
                    el.querySelectorAll('.readonly_line').forEach(rl => rl.remove());
                    // Remove the .is-disabled class on the wrapper that gates input
                    el.closest('.code-editor')?.classList.remove('is-disabled');
                    el.closest('.code-editor')?.classList.remove('is-readonly');
                    // Some portals use a transparent div on top of the scroller to swallow events
                    el.querySelectorAll('.ace_readonly, .ace_invisible, .ace_obstructive_overlay').forEach(o => o.remove());
                });
            };
            unlock();
            // Re-run after a delay to catch Angular re-renders
            setTimeout(unlock, 300);
            setTimeout(unlock, 1000);

            // Right-click
            document.oncontextmenu = null;
            if (document.body) document.body.oncontextmenu = null;
            window.addEventListener('contextmenu', (e) => e.stopPropagation(), true);

            // Force text-selection / user-select everywhere (some sites disable it)
            try {
                const style = document.createElement('style');
                style.id = 'iitm-unlock-style';
                style.textContent = `*, *::before, *::after { -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; user-select: text !important; -webkit-touch-callout: default !important; } .ace_editor, .ace_text-input, .ace_content { -webkit-user-select: text !important; user-select: text !important; } .readonly_line, .ace_obstructive_overlay, .ace_readonly { display: none !important; pointer-events: none !important; }`;
                document.getElementById('iitm-unlock-style')?.remove();
                (document.head || document.documentElement).appendChild(style);
            } catch(e) {}

            // Intercept paste events at capture phase and force them through,
            // in case Angular's keydown handler is calling preventDefault on paste
            const forcePaste = (e) => {
                if (e.type !== 'paste') return;
                const target = e.target;
                const text = (e.clipboardData || window.clipboardData)?.getData('text/plain');
                if (!text || !target) return;
                // For ace editor, use the editor's insert() method directly
                try {
                    const aceContainer = target.closest?.('.ace_editor');
                    if (aceContainer) {
                        const editor = aceContainer.env?.editor;
                        if (editor) {
                            editor.insert(text);
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        }
                    }
                } catch(err) {}
                // For plain textareas/inputs, insert at cursor
                try {
                    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                        const start = target.selectionStart ?? target.value.length;
                        const end = target.selectionEnd ?? target.value.length;
                        const before = target.value.slice(0, start);
                        const after = target.value.slice(end);
                        target.value = before + text + after;
                        const newPos = start + text.length;
                        target.setSelectionRange(newPos, newPos);
                        // Trigger input event so Angular's form control picks it up
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                        e.stopPropagation();
                        e.preventDefault();
                    }
                } catch(err) {}
            };
            // Capture phase = before Angular's bubble-phase handlers
            document.addEventListener('paste', forcePaste, true);

            console.log('🔓 Unlocker Active (aggressive mode)!');
        }
    });
}

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "unlock_page") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]?.id) unlockPage(tabs[0].id);
    });
  }
});

// Function to execute the scraper
function executeScaper(tabId, mode = 'single', title = null, token = null) {
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (m, t, tk) => { 
          window.__scraperMode = m; 
          window.__bulkScrapeTitle = t; // New: Pass real sidebar title
          window.__bulkScrapeToken = tk;
          console.log('IITM Background: Mode set to', m);
        },
        args: [mode, title, token]
      }).then(() => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['scripts/scraper.js']
        });
      });
    }
}

// Helper to create Offscreen document for ZIP generation
async function setupOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (existing) return;
  
  await chrome.offscreen.createDocument({
    url: 'docs/offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'Generate ZIP file for course export'
  });
}

// RELAY MESSAGE TO OFFSCREEN
async function relayToOffscreen(msg) {
  await setupOffscreen();
  chrome.runtime.sendMessage(msg);
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'triggerScraper' && sender.tab) {
        executeScaper(sender.tab.id, request.mode || 'single', request.title, request.token || null);
        sendResponse({ success: true });
        return true;
  } else if (request.action === 'fetchScores') {
    const scoreCheckerUrl = request.url || 'https://score-checker-379619009600.asia-south1.run.app/course_wise';

    fetch(scoreCheckerUrl, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual'
    })
      .then(res => {
        if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
          throw new Error('Authentication Required. Please log in to the Score Checker first.');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(html => {
        if (html.includes('accounts.google.com')) {
          throw new Error('Authentication Required. Please log in to the Score Checker first.');
        }
        sendResponse({ success: true, data: html });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
    } else if (request.action === 'syncAce' && sender.tab) {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            world: 'MAIN',
            func: () => {
                document.querySelectorAll('.ace_editor').forEach(el => {
                    try {
                        const editor = el.env?.editor || (typeof ace !== 'undefined' ? ace.edit(el) : null);
                        if (editor) {
                            const val = editor.getValue();
                            el.setAttribute('data-full-code', val);
                            const mode = editor.getSession().getMode().$id;
                            if (mode) el.setAttribute('data-ace-mode', mode.split('/').pop());
                            const ta = el.querySelector('textarea.ace_text-input');
                            if (ta) ta.value = val;
                            editor.setReadOnly(false);
                        }
                    } catch(e) {}
                });
            }
        }).then(() => {
            sendResponse({ success: true });
        }).catch((err) => {
            sendResponse({ success: false, error: err.message });
        });
        return true; 
    } else if (request.action === 'unlockPage' && sender.tab) {
        unlockPage(sender.tab.id);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'generateZip') {
      relayToOffscreen(request)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    } else if (request.action === 'indexTranscript') {
        chrome.storage.local.get(['iitm_transcripts'], (result) => {
            const transcripts = result.iitm_transcripts || [];
            // Check if already indexed
            const exists = transcripts.some(t => t.url === request.data.url);
            if (!exists) {
                transcripts.push({
                    title: request.data.title,
                    course: request.data.course,
                    url: request.data.url,
                    text: request.data.text.substring(0, 5000), // Cap size
                    timestamp: Date.now()
                });
                chrome.storage.local.set({ iitm_transcripts: transcripts });
            }
        });
        sendResponse({ success: true });
    } else if (request.action === 'fetchBlob' && request.url) {
        fetch(request.url)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => sendResponse({ success: true, data: reader.result });
                reader.readAsDataURL(blob);
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'fetchRelay' && request.url) {
        const options = {
            method: request.method || 'GET',
            headers: request.headers || {}
        };
        if (request.body) options.body = request.body;

        fetch(request.url, options)
            .then(res => {
                if (res.url.includes('accounts.google.com')) {
                    throw new Error('Authentication Required. Please log in to the Score Checker first.');
                }
                return res.text();
            })
            .then(html => sendResponse({ success: true, data: html }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'reloadExtension') {
        chrome.runtime.reload();
        sendResponse({ success: true });
        return true;
    }
});

// Inject the curriculum archiver on-demand (JSZip first, then the scraper)
function launchCurriculumArchiver(tabId) {
    // Step 1: inject the already-bundled jszip.min.js (same one used by the portal)
    chrome.scripting.executeScript({
        target: { tabId },
        files: ['jszip.min.js']
    }).then(() => {
        // Step 2: inject the curriculum scraper script
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['scripts/curriculum_scraper.js']
        });
    }).catch(err => {
        console.error('[Archiver] Injection failed:', err);
    });
}

chrome.action.onClicked.addListener((tab) => {
  executeScaper(tab.id);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scrapeAssignment") {
    executeScaper(tab.id);
  } else if (info.menuItemId === "unlockPage") {
    unlockPage(tab.id);
  } else if (["toggleCleanMode", "toggleFocusBar", "toggleNotesBtn", "toggleProgress"].includes(info.menuItemId)) {
    chrome.tabs.sendMessage(tab.id, { action: info.menuItemId });
  } else if (info.menuItemId === "sendToNotes") {
    chrome.tabs.sendMessage(tab.id, { action: "sendToNotes", selectionText: info.selectionText });
  } else if (info.menuItemId === "archiveCurriculum") {
    launchCurriculumArchiver(tab.id);
  }
});
