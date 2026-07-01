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
            const LOG = (...a) => console.log('[IITM-Unlock]', ...a);
            // Aggressive unlock for new portal's ace editor + Angular overlays
            const unlock = () => {
                const editors = document.querySelectorAll('.ace_editor');
                LOG('unlock() running, found', editors.length, 'ace editor(s)');
                editors.forEach((el, idx) => {
                    try {
                        const editor = el.env?.editor || (typeof ace !== 'undefined' ? ace.edit(el) : null);
                        if (editor) {
                            const wasReadOnly = editor.getReadOnly();
                            if (wasReadOnly) editor.setReadOnly(false);
                            // Force the read-only state off on the session too
                            try { editor.getSession().setReadOnly(false); } catch(e) {}
                            if (idx === 0) LOG('editor[' + idx + '] wasReadOnly=' + wasReadOnly + ' now=' + editor.getReadOnly());
                        } else {
                            if (idx === 0) LOG('editor[' + idx + '] NOT FOUND on el.env', el);
                        }
                    } catch(e) { LOG('editor err', e); }
                    // Fix textareas (ace uses one for input)
                    const tas = el.querySelectorAll('textarea');
                    tas.forEach(ta => {
                        const before = { ro: ta.readOnly, dis: ta.disabled, attrRo: ta.hasAttribute('readonly') };
                        ta.removeAttribute('readonly');
                        ta.removeAttribute('disabled');
                        ta.removeAttribute('aria-disabled');
                        ta.readOnly = false;
                        ta.disabled = false;
                        if (idx === 0) LOG('textarea before:', before, 'after readOnly=' + ta.readOnly + ' disabled=' + ta.disabled);
                    });
                    // Remove the visual read-only overlays Angular puts on top
                    const roLines = el.querySelectorAll('.readonly_line');
                    if (roLines.length && idx === 0) LOG('removing', roLines.length, 'readonly_line overlays');
                    el.querySelectorAll('.readonly_line').forEach(rl => rl.remove());
                    // Remove the .is-disabled class on the wrapper that gates input
                    const wrapper = el.closest('.code-editor');
                    if (wrapper && wrapper.classList.contains('is-disabled') && idx === 0) LOG('removing .is-disabled from wrapper');
                    wrapper?.classList.remove('is-disabled');
                    wrapper?.classList.remove('is-readonly');
                    // Some portals use a transparent div on top of the scroller to swallow events
                    const overlays = el.querySelectorAll('.ace_readonly, .ace_invisible, .ace_obstructive_overlay');
                    if (overlays.length && idx === 0) LOG('removing', overlays.length, 'overlay divs');
                    overlays.forEach(o => o.remove());
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
                LOG('forcePaste called, text length:', text?.length, 'target:', target?.tagName);
                if (!text || !target) { LOG('forcePaste bailing: no text or target'); return; }
                // For ace editor, use the editor's insert() method directly
                try {
                    const aceContainer = target.closest?.('.ace_editor');
                    if (aceContainer) {
                        const editor = aceContainer.env?.editor;
                        if (editor) {
                            const before = editor.getValue();
                            editor.insert(text);
                            const after = editor.getValue();
                            LOG('ace.insert: before len=' + before.length + ' after len=' + after.length + ' changed=' + (after !== before));
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        } else {
                            LOG('ace container found but no editor on .env');
                        }
                    }
                } catch(err) { LOG('ace paste err', err); }
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
                        LOG('textarea paste: pos=' + start + '->' + newPos + ' newLen=' + target.value.length);
                        e.stopPropagation();
                        e.preventDefault();
                    }
                } catch(err) { LOG('textarea paste err', err); }
            };
            // Capture phase = before Angular's bubble-phase handlers
            document.addEventListener('paste', (e) => {
                LOG('PASTE event captured!', 'target:', e.target?.tagName, 'inAce:', !!e.target?.closest?.('.ace_editor'), 'hasClipboardData:', !!e.clipboardData, 'text length:', e.clipboardData?.getData?.('text/plain')?.length);
                return forcePaste(e);
            }, true);

            // === BEFOREINPUT EVENT (newer, fires before paste) ===
            // Some handlers call stopImmediatePropagation on keydown which kills the paste event.
            // beforeinput fires BEFORE keydown is processed for paste actions.
            document.addEventListener('beforeinput', async (e) => {
                if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromClipboard') return;
                LOG('BEFOREINPUT event captured!', 'inputType:', e.inputType, 'target:', e.target?.tagName);
                const aceContainer = e.target?.closest?.('.ace_editor');
                if (aceContainer) {
                    const editor = aceContainer.env?.editor;
                    if (editor) {
                        try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                                LOG('beforeinput: got clipboard text, length:', text.length);
                                e.preventDefault();
                                e.stopPropagation();
                                editor.insert(text);
                                return;
                            }
                        } catch (err) {
                            LOG('beforeinput: clipboard.readText failed:', err.message);
                        }
                    }
                }
            }, true);

            // === ACE COMMANDS INTERCEPTOR ===
            // Hook into ace's command manager so Ctrl+V goes through ace's own commands
            // even if the browser paste event is killed.
            const hookAceCommands = () => {
                document.querySelectorAll('.ace_editor').forEach(el => {
                    const editor = el.env?.editor;
                    if (!editor) return;
                    if (editor.__iitmPatched) return;
                    editor.__iitmPatched = true;
                    try {
                        // ace has a 'paste' command. Replace it with our own.
                        editor.commands.removeCommand('paste');
                        editor.commands.addCommand({
                            name: 'paste',
                            bindKey: { win: 'Ctrl-V', mac: 'Cmd-V' },
                            exec: async (ed) => {
                                LOG('ace paste command fired');
                                try {
                                    const text = await navigator.clipboard.readText();
                                    if (text) {
                                        ed.insert(text);
                                        LOG('ace paste command: inserted', text.length, 'chars');
                                    }
                                } catch (err) {
                                    LOG('ace paste command: clipboard.readText failed:', err.message);
                                    // Fallback: try execCommand
                                    try {
                                        const ok = document.execCommand('paste');
                                        LOG('ace paste command: execCommand result:', ok);
                                    } catch (e2) {
                                        LOG('ace paste command: execCommand also failed');
                                    }
                                }
                            },
                            readOnly: false
                        });
                        LOG('ace commands: paste command replaced on editor');
                    } catch (err) {
                        LOG('ace commands: failed to patch:', err.message);
                    }
                });
            };
            hookAceCommands();
            // Re-hook periodically in case new editors appear
            setInterval(hookAceCommands, 3000);

            // === COPY / CUT INTERCEPTORS ===
            // Angular may block copy/cut with preventDefault on keydown.
            // Strategy: capture-phase copy/cut listener that, if e.preventDefault
            // was called, manually writes the selection to the clipboard via the
            // async Clipboard API, then dispatches a synthetic 'copy' so the browser
            // shows its native "Copied" feedback. For ace editor, use the
            // editor.session.getTextRange() to grab the current selection.
            const forceCopy = async (e) => {
                // Only handle copy/cut, not paste
                if (e.type !== 'copy' && e.type !== 'cut') return;
                const target = e.target;

                // === ACE EDITOR ===
                try {
                    const aceContainer = target.closest && target.closest('.ace_editor');
                    if (aceContainer) {
                        const editor = aceContainer.env && aceContainer.env.editor;
                        if (editor) {
                            const session = editor.getSession();
                            const range = editor.getSelectionRange();
                            const selectedText = session.getTextRange(range);
                            if (selectedText) {
                                // Write to clipboard via async API (bypasses preventDefault)
                                try {
                                    await navigator.clipboard.writeText(selectedText);
                                } catch (err) {
                                    // Fallback: use execCommand on a temporary textarea
                                    const ta = document.createElement('textarea');
                                    ta.value = selectedText;
                                    ta.style.position = 'fixed';
                                    ta.style.opacity = '0';
                                    document.body.appendChild(ta);
                                    ta.select();
                                    try { document.execCommand('copy'); } catch (e2) {}
                                    document.body.removeChild(ta);
                                }
                                // If cut, also delete the selection
                                if (e.type === 'cut') {
                                    editor.getSession().replace(range, '');
                                }
                                e.stopPropagation();
                                e.preventDefault();
                                return;
                            }
                        }
                    }
                } catch (err) {}

                // === PLAIN TEXTAREA / INPUT ===
                try {
                    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
                        const start = target.selectionStart ?? 0;
                        const end = target.selectionEnd ?? 0;
                        const selectedText = target.value.slice(start, end);
                        if (selectedText) {
                            try {
                                await navigator.clipboard.writeText(selectedText);
                            } catch (err) {
                                const ta = document.createElement('textarea');
                                ta.value = selectedText;
                                ta.style.position = 'fixed';
                                ta.style.opacity = '0';
                                document.body.appendChild(ta);
                                ta.select();
                                try { document.execCommand('copy'); } catch (e2) {}
                                document.body.removeChild(ta);
                            }
                            if (e.type === 'cut') {
                                target.value = target.value.slice(0, start) + target.value.slice(end);
                                target.setSelectionRange(start, start);
                                target.dispatchEvent(new Event('input', { bubbles: true }));
                                target.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        }
                    }
                } catch (err) {}

                // === DOM SELECTION (regular page text) ===
                try {
                    const sel = window.getSelection && window.getSelection();
                    if (sel && sel.toString()) {
                        const text = sel.toString();
                        try {
                            await navigator.clipboard.writeText(text);
                        } catch (err) {
                            // Last resort: execCommand
                            const ta = document.createElement('textarea');
                            ta.value = text;
                            ta.style.position = 'fixed';
                            ta.style.opacity = '0';
                            document.body.appendChild(ta);
                            ta.select();
                            try { document.execCommand('copy'); } catch (e2) {}
                            document.body.removeChild(ta);
                        }
                        e.stopPropagation();
                        e.preventDefault();
                    }
                } catch (err) {}
            };
            // Capture phase for both copy and cut
            document.addEventListener('copy', forceCopy, true);
            document.addEventListener('cut', forceCopy, true);

            // === KEYBOARD FALLBACK (Ctrl/Cmd + C / X) ===
            // Some Angular handlers run at the capture phase and preventDefault
            // BEFORE the copy/cut event even fires. In that case, we catch the
            // keydown and trigger our own copy logic.
            const keyHandler = async (e) => {
                const isCopy = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'c';
                const isCut = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'x';
                if (!isCopy && !isCut) return;

                // Find the active element and try to get its selection
                const active = document.activeElement;
                if (!active) return;

                // === ACE ===
                const aceContainer = active.closest && active.closest('.ace_editor');
                if (aceContainer) {
                    const editor = aceContainer.env && aceContainer.env.editor;
                    if (editor) {
                        const range = editor.getSelectionRange();
                        const text = editor.getSession().getTextRange(range);
                        if (text) {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                                await navigator.clipboard.writeText(text);
                            } catch (err) {
                                const ta = document.createElement('textarea');
                                ta.value = text;
                                ta.style.position = 'fixed';
                                ta.style.opacity = '0';
                                document.body.appendChild(ta);
                                ta.select();
                                try { document.execCommand('copy'); } catch (e2) {}
                                document.body.removeChild(ta);
                            }
                            if (isCut) {
                                editor.getSession().replace(range, '');
                            }
                            return;
                        }
                    }
                }

                // === TEXTAREA / INPUT ===
                if (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') {
                    const start = active.selectionStart ?? 0;
                    const end = active.selectionEnd ?? 0;
                    const text = active.value.slice(start, end);
                    if (text) {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            await navigator.clipboard.writeText(text);
                        } catch (err) {
                            const ta = document.createElement('textarea');
                            ta.value = text;
                            ta.style.position = 'fixed';
                            ta.style.opacity = '0';
                            document.body.appendChild(ta);
                            ta.select();
                            try { document.execCommand('copy'); } catch (e2) {}
                            document.body.removeChild(ta);
                        }
                        if (isCut) {
                            active.value = active.value.slice(0, start) + active.value.slice(end);
                            active.setSelectionRange(start, start);
                            active.dispatchEvent(new Event('input', { bubbles: true }));
                            active.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        return;
                    }
                }

                // === DOM SELECTION (page text) ===
                const sel = window.getSelection && window.getSelection();
                if (sel && sel.toString()) {
                    const text = sel.toString();
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        await navigator.clipboard.writeText(text);
                    } catch (err) {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.select();
                        try { document.execCommand('copy'); } catch (e2) {}
                        document.body.removeChild(ta);
                    }
                }
            };
            document.addEventListener('keydown', keyHandler, true);

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
