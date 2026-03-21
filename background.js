// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
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
                        // NUKING site-side blockers
                        ta.addEventListener('copy', e => e.stopPropagation(), true);
                        ta.addEventListener('paste', e => e.stopPropagation(), true);
                        ta.addEventListener('cut', e => e.stopPropagation(), true);
                        ta.style.pointerEvents = 'auto';
                        ta.style.opacity = '1';
                    });
                    
                    el.classList.remove('ace_readonly');
                    el.classList.remove('readonly');
                });
                
                // Specifically White-list Keyboard Shortcuts at the highest level
                const shortcuts = ['v', 'c', 'x', 'z', 'y', 'a'];
                window.addEventListener('keydown', (e) => {
                    const isMeta = e.ctrlKey || e.metaKey;
                    if (isMeta && shortcuts.includes(e.key.toLowerCase())) {
                        e.stopPropagation();
                    }
                }, true);
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
function executeScaper(tabId, mode = 'single') {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (m) => { window.__scraperMode = m; },
    args: [mode]
  }).then(() => {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['scraper.js']
    });
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'triggerScraper' && sender.tab) {
        executeScaper(sender.tab.id, request.mode || 'single');
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
  }
});