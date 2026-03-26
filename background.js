// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "scrapeAssignment",
      title: "📝 Export to Markdown",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://score-checker-379619009600.asia-south1.run.app/*"]
    });
    chrome.contextMenus.create({
      id: "unlockPage",
      title: "🔓 Unlock Editor/Copy-Paste",
      contexts: ["all"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*", "https://score-checker-379619009600.asia-south1.run.app/*"]
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

    // Capture selection (Only shows when something is highlighted)
    chrome.contextMenus.create({
      id: "sendToNotes",
      title: "📝 Send Selected to Notes",
      contexts: ["selection"],
      documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*"]
    });
  });
});

// Helper to unlock editors and events
function unlockPage(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        world: 'MAIN',
        func: () => {
            const doUnlock = () => {
                document.querySelectorAll('.ace_editor').forEach(el => {
                    try {
                        const editor = el.env?.editor || (typeof ace !== 'undefined' ? ace.edit(el) : null);
                        if (editor) {
                            // Persistence: Force readonly to false even if the site tries to re-lock it
                            editor.setReadOnly(false);
                            editor.setOptions({ 
                                readOnly: false,
                                enableBasicAutocompletion: true,
                                enableLiveAutocompletion: true
                            });
                            
                            if (!editor.__unlocked) {
                                editor.__unlocked = true;
                                const originalSetReadOnly = editor.setReadOnly;
                                editor.setReadOnly = function(ro) {
                                    return originalSetReadOnly.call(this, false);
                                };
                                
                                // Reset shortcuts if they were blocked
                                editor.commands.addCommand({
                                    name: 'undo',
                                    bindKey: {win: 'Ctrl-Z',  mac: 'Command-Z'},
                                    exec: (editor) => { if(editor.undoManager) editor.undoManager.undo(); else editor.undo(); }
                                });
                                editor.commands.addCommand({
                                    name: 'redo',
                                    bindKey: {win: 'Ctrl-Y|Ctrl-Shift-Z',  mac: 'Command-Shift-Z'},
                                    exec: (editor) => { if(editor.undoManager) editor.undoManager.redo(); else editor.redo(); }
                                });
                                
                                editor.textInput.getElement().removeAttribute('readonly');
                                editor.textInput.getElement().disabled = false;
                            }
                        }
                    } catch(e) {}
                    
                    // Force the underlying textarea properties
                    el.querySelectorAll('textarea').forEach(ta => {
                        ta.removeAttribute('readonly');
                        ta.readOnly = false;
                        ta.disabled = false;
                        ta.style.pointerEvents = 'auto';
                        ta.style.opacity = '1';
                    });
                    
                    el.classList.remove('ace_readonly');
                    el.classList.remove('readonly');
                });
                
                // Combat Anti-Cheat Keydown Monitors ONLY for Copy. 
                // Let native Cut/Paste/Undo/Redo organically drop to AceEditor!
                window.addEventListener('keydown', async (e) => {
                    const isMeta = e.ctrlKey || e.metaKey;
                    if (isMeta && e.key.toLowerCase() === 'c') {
                        const activeEl = document.activeElement;
                        if (activeEl && activeEl.classList.contains('ace_text-input')) {
                            try {
                                await navigator.clipboard.writeText(activeEl.value);
                            } catch(err) {
                                document.execCommand('copy');
                            }
                            // We manually handled Copy, so block Angular from complaining
                            e.stopPropagation();
                        }
                    }
                }, true);

                // Obliterate Site-Wide Right-Click Blockers
                document.oncontextmenu = null;
                if (document.body) document.body.oncontextmenu = null;
                window.addEventListener('contextmenu', (e) => e.stopPropagation(), true);
            };

            doUnlock();
            
            let count = 0;
            const interval = setInterval(() => {
                doUnlock();
                if (++count > 20) clearInterval(interval);
            }, 2000);

            console.log('🔓 Ultimate Unlocker Active!');
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
function executeScaper(tabId, mode = 'single', title = null) {
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (m, t) => { 
          window.__scraperMode = m; 
          window.__bulkScrapeTitle = t; // New: Pass real sidebar title
          console.log('IITM Background: Mode set to', m);
        },
        args: [mode, title]
      }).then(() => {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['scraper.js']
        });
      });
    }
}

// Helper to create Offscreen document for ZIP generation
async function setupOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (existing) return;
  
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
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
        executeScaper(sender.tab.id, request.mode || 'single', request.title);
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
        relayToOffscreen(request);
        sendResponse({ success: true });
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
    } else if (request.action === 'reloadExtension') {
        chrome.runtime.reload();
        sendResponse({ success: true });
        return true;
    }
});

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
  }
});