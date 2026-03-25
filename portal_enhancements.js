(function() {
    console.log('IITM Explorer: Enhancing Productivity...');

    const body = document.body;
    let activeFilter = 'all';
    let isTimerDismissed = false; 
    const selectedItems = new Set(); // Persistent selection storage

    // 4. AI EXPLANATION (Chanhdai Style)
    const openInAI = async (service) => {
        const btn = document.getElementById('iitm-header-search');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '<span style="font-size:10px;color:#1e88e5;">Scraping...</span>';

        // Trigger scraper and tell it to capture result
        window.__scraperMode = 'capture';
        
        // Request markdown from scraper
        const md = await new Promise(resolve => {
            // Trigger scraper but tell it NOT to download
            chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'capture' });
            
            // Listener for the markdown result
            const handler = (e) => {
                window.removeEventListener('iitm-markdown-captured', handler);
                resolve(e.detail?.markdown);
            };
            window.addEventListener('iitm-markdown-captured', handler);
            
            // Safety timeout
            setTimeout(() => {
                window.removeEventListener('iitm-markdown-captured', handler);
                resolve(null);
            }, 8000);
        });

        if (!md) {
            if (btn) btn.innerHTML = '<span style="font-size:10px;color:#f44336;">Error</span>';
            setTimeout(() => { if(btn) btn.innerHTML = originalText; }, 2000);
            return;
        }

        // Copy to clipboard
        try {
            await navigator.clipboard.writeText(md);
            // Visual feedback on the search bar
            if (btn) btn.innerHTML = '<span style="font-size:10px;color:#4caf50;">Copied!</span>';
            // Visual feedback on the floating button (if it exists)
            const aiBtn = document.getElementById('iitm-ai-floating-btn');
            if (aiBtn) {
                const originalContent = aiBtn.innerHTML;
                aiBtn.style.background = '#4caf50';
                aiBtn.innerHTML = '<span style="font-size:18px;">✅</span>';
                setTimeout(() => {
                    if (aiBtn) {
                        aiBtn.style.background = ''; // Resets to CSS gradient
                        aiBtn.innerHTML = originalContent;
                    }
                }, 2000);
            }
        } catch (err) {
            console.error('Clipboard error:', err);
        }
        
        setTimeout(() => { if(btn) btn.innerHTML = originalText; }, 2000);

        const prompt = `I have copied the contents of an IIT Madras Online Degree lesson/assignment/code to my clipboard. 
        Please analyze the content, explain any complex concepts, and help me understand the key takeaways. 
        If it's a programming assignment, explain the logic and edge cases without just giving the solution.
        I will paste the content below:`;

        const urls = {
            chatgpt: `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
            claude: `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
            scira: `https://scira.ai/?q=${encodeURIComponent(prompt)}`,
            grok: `https://grok.com/?q=${encodeURIComponent(prompt)}`,
            cursor: `https://cursor.com/link/prompt?text=${encodeURIComponent(prompt)}`,
            gemini: `https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`
        };

        window.open(urls[service] || urls.chatgpt, '_blank');
    };

    // Global listener for the floating AI options (ensures user gesture for clipboard)
    document.body.addEventListener('click', (e) => {
        const option = e.target.closest('.ai-option');
        if (option) {
            const service = option.dataset.service;
            openInAI(service);
        }
    });

    // 5. BULK EXPORT ALL WEEKS (Enhanced with Selection)
    const bulkScrapeAll = async () => {
        // Collect items based on persistent set or visible checkboxes
        let subItems = [];
        
        if (selectedItems.size > 0) {
            // Map the set IDs back to current DOM elements if possible, 
            // but safer to just use the DOM for the count
            subItems = Array.from(document.querySelectorAll('.units__subitems')).filter(item => {
                const title = item.innerText.split('\n')[0].trim();
                return selectedItems.has(title);
            });
        }

        if (subItems.length === 0) {
            subItems = Array.from(document.querySelectorAll('.units__subitems'));
        }

        if (subItems.length === 0) {
            return alert('No items found. Please expand the weeks in the sidebar first.');
        }
        
        const count = subItems.length;
        if (!confirm(`This will automatically scrape ${count} ${selectedItems.size > 0 ? 'SELECTED' : 'ALL'} units sequentially. Proceed?`)) {
            return;
        } // Show progress overlay
        const overlay = document.createElement('div');
        overlay.id = 'iitm-bulk-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(18,18,18,0.92); color: white; z-index: 20000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(15px); font-family: system-ui, sans-serif;
            animation: fadeIn 0.4s ease;
        `;
        overlay.innerHTML = `
            <div style="font-size: 28px; font-weight: 800; margin-bottom: 20px; color: #db2777;">📦 Bulk Export in Progress</div>
            <div id="bulk-progress-text" style="font-size: 16px; opacity: 0.8; margin-bottom: 30px;">Scraping contents automatically...</div>
            <div style="width: 350px; height: 12px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <div id="bulk-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #db2777, #7e22ce); transition: 0.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 20px rgba(219,39,119,0.5);"></div>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.4);">Estimated time remaining: ${Math.round(count * 4.5)}s</div>
            <button id="cancel-bulk-btn" style="margin-top: 40px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: 700; transition: 0.2s;">Cancel Download</button>
        `;
        document.body.appendChild(overlay);

        let cancelled = false;
        document.getElementById('cancel-bulk-btn').onclick = () => { cancelled = true; overlay.remove(); };

        let combinedMarkdown = `# Bulk Course Export: ${document.title}\n\n`;
        combinedMarkdown += `> Generated on: ${new Date().toLocaleString()}\n`;
        combinedMarkdown += `> Source: ${window.location.origin}\n\n`;
        
        const progressText = document.getElementById('bulk-progress-text');
        const progressBar = document.getElementById('bulk-progress-bar');

        for (let i = 0; i < subItems.length; i++) {
            if (cancelled) break;
            
            const item = subItems[i];
            const title = item.innerText.split('\n')[0].trim();
            
            progressText.innerText = `[${i+1}/${subItems.length}] Processing: ${title}`;
            progressBar.style.width = `${((i+1)/subItems.length) * 100}%`;
            
            // Navigate to the unit (Crucial for manual-intervention-free)
            item.click();
            
            // Wait for dynamically loaded content
            await new Promise(r => setTimeout(r, 4500)); 
            
            // Capture markdown
            const md = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'capture' });
                const handler = (e) => {
                    window.removeEventListener('iitm-markdown-captured', handler);
                    resolve(e.detail?.markdown);
                };
                window.addEventListener('iitm-markdown-captured', handler);
                setTimeout(() => { 
                    window.removeEventListener('iitm-markdown-captured', handler); 
                    resolve(null); 
                }, 9000); // Higher timeout for slow loads
            });

            if (md) {
                combinedMarkdown += `\n\n--- \n\n# ${title}\n\n${md}`;
            }
        }

        if (!cancelled) {
            const blob = new Blob([combinedMarkdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `IITM_Bulk_Export_${document.title.replace(/\s+/g, '_')}_${Date.now()}.md`;
            a.click();
            overlay.innerHTML = `<div style="font-size: 32px; font-weight: 800; color: #4caf50;">✅ DONE!</div><div style="margin-top:20px; opacity:0.6;">Your multi-unit report is downloading...</div>`;
            setTimeout(() => overlay.remove(), 2500);
        }
    };

    let isDarkMode = localStorage.getItem('iitm-dark-mode-enabled') === 'true';
    let isCleanMode = localStorage.getItem('iitm-clean-mode-enabled') === 'true';
    let isFocusBarVisible = localStorage.getItem('iitm-focus-bar-visible') !== 'false';
    let isNotesBtnVisible = localStorage.getItem('iitm-notes-btn-visible') !== 'false';
    let isProgressVisible = localStorage.getItem('iitm-progress-visible') !== 'false';
    let isSpotlightOpen = false;
    let savedNotes = JSON.parse(localStorage.getItem('iitm-saved-notes') || '[]');
    let sidebarClosedThisSession = false;
    let autoCloseAttempts = 0;
    
    const saveNote = (text) => {
        const week = document.querySelector('.units__items-selected .units__items-title')?.innerText.trim() || 'General';
        const unit = document.querySelector('.units__subitems-selected .units__subitems-title span')?.innerText.trim() || 
                     document.querySelector('.assignment-title')?.innerText.trim() || 'Lesson';
        const video = document.querySelector('video');
        const timestamp = video ? Math.floor(video.currentTime) : null;
        
        const note = {
            id: Date.now(),
            text, week, unit, url: window.location.href, timestamp,
            date: new Date().toLocaleString()
        };
        savedNotes.push(note);
        localStorage.setItem('iitm-saved-notes', JSON.stringify(savedNotes));
        renderNotes();
    };

    const updateBodyClasses = () => {
        body.classList.toggle('iitm-clean-mode', isCleanMode);
        body.classList.toggle('iitm-dark-mode', isDarkMode);
        body.classList.toggle('iitm-hide-focus', !isFocusBarVisible);
        body.classList.toggle('iitm-hide-notes', !isNotesBtnVisible);
        body.classList.toggle('iitm-hide-progress', !isProgressVisible);
    };
    updateBodyClasses();

    const handleUIToggle = (action) => {
        if (!action) return;
        if (action === 'toggleCleanMode') {
            isCleanMode = !isCleanMode;
            localStorage.setItem('iitm-clean-mode-enabled', isCleanMode);
        } else if (action === 'toggleDarkMode') {
            isDarkMode = !isDarkMode;
            localStorage.setItem('iitm-dark-mode-enabled', isDarkMode);
        } else if (action === 'toggleFocusBar') {
            isFocusBarVisible = !isFocusBarVisible;
            localStorage.setItem('iitm-focus-bar-visible', isFocusBarVisible);
        } else if (action === 'toggleNotesBtn') {
            isNotesBtnVisible = !isNotesBtnVisible;
            localStorage.setItem('iitm-notes-btn-visible', isNotesBtnVisible);
        } else if (action === 'toggleProgress') {
            isProgressVisible = !isProgressVisible;
            localStorage.setItem('iitm-progress-visible', isProgressVisible);
        }
        updateBodyClasses();
    };

    // Listen for UI Toggles from Context Menu
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.action === 'sendToNotes') {
                saveNote(msg.selectionText);
                const notes = document.getElementById('iitm-notes-drawer');
                if (notes) notes.style.display = 'flex';
            } else {
                handleUIToggle(msg.action);
            }
        });
    }

    const autoCloseSidebar = () => {
        if (sidebarClosedThisSession || autoCloseAttempts > 20 || isSpotlightOpen) return;
        const sidenav = document.querySelector('mat-sidenav');
        if (!sidenav) return;
        
        const isOpened = sidenav.classList.contains('mat-drawer-opened') || 
                         sidenav.getAttribute('opened') === 'true' ||
                         (sidenav.offsetWidth > 100);

        if (isOpened && location.href.includes('/courses/')) {
            const toggle = document.querySelector('.mobile-menu button, .header button[aria-label="Menu"], app-button.mobile-menu button');
            if (toggle) {
                toggle.click();
                autoCloseAttempts++;
            }
        } else if (location.href.includes('/courses/')) {
            // It's closed (either we did it or it was default)
            sidebarClosedThisSession = true;
        }
    };

    // Global listeners for Spotlight (Added once)
    let spotlightInitialized = false;
    const setupSpotlightListeners = () => {
        if (spotlightInitialized) return;
        
        document.addEventListener('keydown', (e) => {
            const spotlight = document.getElementById('iitm-spotlight');
            if (!spotlight) return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                isSpotlightOpen = !isSpotlightOpen;
                spotlight.style.display = isSpotlightOpen ? 'flex' : 'none';
                if (isSpotlightOpen) {
                    const input = document.getElementById('spotlight-input');
                    if (input) {
                        input.focus();
                        input.dispatchEvent(new Event('input'));
                    }
                }
            }
            if (e.key === 'Escape') {
                isSpotlightOpen = false;
                spotlight.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            const spotlight = document.getElementById('iitm-spotlight');
            if (spotlight && spotlight.style.display === 'flex') {
                const box = spotlight.querySelector('.spotlight-box');
                const isClickInside = box && box.contains(e.target);
                
                // IGNORE clicks from search toggle AND sidebar toggle (prevents auto-close bug)
                const isHeaderBtn = !!e.target.closest('#iitm-header-search');
                const isSidebarBtn = !!e.target.closest('.mobile-menu button, .header button[aria-label="Menu"], app-button.mobile-menu button');
                
                if (!isClickInside && !isHeaderBtn && !isSidebarBtn) {
                    isSpotlightOpen = false;
                    spotlight.style.display = 'none';
                }
            }
        });
        
        spotlightInitialized = true;
    };
    setupSpotlightListeners();
    
    // UTILS
    const addGlobalListener = (type, selector, callback) => {
        document.body.addEventListener(type, e => {
            if (e.target.closest(selector)) callback(e);
        });
    };

    // 1. HEADER UTILS (Master Toggle, Exam Mode, Notes, History)
    const injectHeaderUtils = () => {
        const header = document.querySelector('.header__right') || document.querySelector('.header');
        if (!header || document.getElementById('iitm-header-utils')) return;
        if (!isNotesBtnVisible && isCleanMode) return; // Hide altogether if cleaned & hidden

        const container = document.createElement('div');
        container.id = 'iitm-header-utils';
        container.style.cssText = `
            display: flex; align-items: center; gap: 10px; margin-right: 15px;
            z-index: 10001;
        `;
        
        const createBtn = (id, icon, title, callback) => {
            const btn = document.createElement('div');
            btn.id = id;
            btn.className = 'iitm-util-btn';
            btn.title = title;
            btn.innerHTML = icon;
            btn.style.cssText = `
                width: 32px; height: 32px; border-radius: 50%; display: flex; 
                align-items: center; justify-content: center; cursor: pointer;
                background: transparent; border: none;
                transition: 0.2s; font-size: 16px; color: #666;
            `;
            btn.onmouseenter = () => btn.style.background = 'rgba(0,0,0,0.05)';
            btn.onmouseleave = () => btn.style.background = 'transparent';
            if (callback) btn.onclick = callback; // Only assign if callback is provided
            return btn;
        };

        // Master Toggle (Clean Mode)
        const btnClean = createBtn('iitm-toggle-clean', '🪄', 'Toggle Extension UI (Clean Mode)');
        btnClean.onclick = () => {
            isCleanMode = !isCleanMode;
            localStorage.setItem('iitm-clean-mode-enabled', isCleanMode);
            updateBodyClasses();
        };
        container.appendChild(btnClean);

        // Dark Mode Toggle
        const btnDark = createBtn('iitm-toggle-dark', '🌙', 'Toggle Ultra Dark Mode');
        btnDark.onclick = () => {
            isDarkMode = !isDarkMode;
            localStorage.setItem('iitm-dark-mode-enabled', isDarkMode);
            updateBodyClasses();
        };
        container.appendChild(btnDark);

        // Quick Notes
        container.appendChild(createBtn('iitm-toggle-notes', '📝', 'Quick Notes', () => {
            let notes = document.getElementById('iitm-notes-drawer');
            if (notes) {
                notes.style.display = notes.style.display === 'none' ? 'flex' : 'none';
            } else {
                injectNotesDrawer();
            }
        }));

        const injectNotesDrawer = () => {
            const drawer = document.createElement('div');
            drawer.id = 'iitm-notes-drawer';
            drawer.innerHTML = `
                <div class="notes-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>📝 Study Notes</span>
                        <div style="font-size:10px; background:#1e88e5; color:white; padding:2px 6px; border-radius:10px;" id="notes-count">0</div>
                    </div>
                    <button id="close-notes-drawer" style="background:none; border:none; color:white; cursor:pointer; font-size:18px;">&times;</button>
                </div>
                <!-- MANUAL INPUT BOX -->
                <div style="padding:15px; border-bottom:1px solid #eee; background:white;">
                    <textarea id="manual-note-input" placeholder="Type a manual note here..." style="width:100%; height:60px; border:1px solid #ddd; border-radius:8px; padding:8px; font-family:inherit; font-size:12px; outline:none; resize:none;"></textarea>
                    <button id="add-manual-note-btn" class="iitm-btn" style="margin-top:8px; width:100%; border-radius:8px; padding:8px;">➕ Add Quick Note</button>
                </div>
                <div id="notes-list" class="notes-list custom-scrollbar"></div>
                <div class="notes-footer">
                    <button id="export-notes-btn" class="iitm-btn" title="Download all as Markdown file">📤 Export MD</button>
                    <button id="clear-notes-btn" class="iitm-btn" style="background:#a0332d; border-color:#d32f2f;" title="Clear ALL notes permanently">🗑️ Clear All</button>
                </div>
            `;
            document.body.appendChild(drawer);
            document.getElementById('close-notes-drawer').onclick = () => drawer.style.display = 'none';
            document.getElementById('add-manual-note-btn').onclick = () => {
                const input = document.getElementById('manual-note-input');
                const text = input.value.trim();
                if (text) {
                    saveNote(text);
                    input.value = '';
                }
            };
            document.getElementById('manual-note-input').onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('add-manual-note-btn').click();
                }
            };
            document.getElementById('clear-notes-btn').onclick = () => {
                if (confirm('Permanently delete ALL saved notes?')) {
                    savedNotes = [];
                    localStorage.setItem('iitm-saved-notes', '[]');
                    renderNotes();
                }
            };
            document.getElementById('export-notes-btn').onclick = () => {
                if (savedNotes.length === 0) return alert('No notes to export!');
                let md = `# Study Notes - ${new Date().toLocaleDateString()}\n\n`;
                savedNotes.forEach(n => {
                    md += `### [${n.week} | ${n.unit}](${n.toLink || n.url})\n`;
                    if (n.timestamp) md += `*Time: ${Math.floor(n.timestamp/60)}:${(n.timestamp%60).toString().padStart(2,'0')}*\n`;
                    md += `> ${n.text}\n\n`;
                });
                const blob = new Blob([md], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `IITM_Study_Notes_${Date.now()}.md`;
                a.click();
            };
            renderNotes();
        };

        const renderNotes = () => {
            const list = document.getElementById('notes-list');
            const count = document.getElementById('notes-count');
            if (!list) return;
            
            list.innerHTML = '';
            count.innerText = savedNotes.length;

            if (savedNotes.length === 0) {
                list.innerHTML = `<div style="padding:40px; text-align:center; color:#888; font-size:13px;">No notes saved yet.<br><br>Highlight text & Right-click<br>"Send to Notes"</div>`;
                return;
            }

            [...savedNotes].reverse().forEach((note, idx) => {
                const div = document.createElement('div');
                div.className = 'note-item';
                div.innerHTML = `
                    <div style="font-size:9px; color:#1e88e5; font-weight:800; text-transform:uppercase; margin-bottom:4px; display:flex; justify-content:space-between;">
                        <span>${note.week} • ${note.unit}</span>
                        <span class="delete-note" data-id="${note.id}" style="cursor:pointer; color:#999;">&times;</span>
                    </div>
                    <div style="font-size:13px; color:#333; line-height:1.4; font-weight:500;">${note.text}</div>
                    <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <a href="${note.url}" target="_blank" style="font-size:10px; color:#666; text-decoration:none;">🔗 Open Source</a>
                        ${note.timestamp ? `<span style="font-size:10px; background:#f0f0f0; padding:2px 6px; border-radius:4px; color:#444;">⏱️ ${Math.floor(note.timestamp/60)}:${(note.timestamp%60).toString().padStart(2,'0')}</span>` : ''}
                    </div>
                `;
                div.querySelector('.delete-note').onclick = (e) => {
                    e.preventDefault();
                    savedNotes = savedNotes.filter(n => n.id != note.id);
                    localStorage.setItem('iitm-saved-notes', JSON.stringify(savedNotes));
                    renderNotes();
                };
                list.appendChild(div);
            });
        };

        // 1. REPOSITIONED EXACTLY LEFT OF SPOTLIGHT
        const spotlight = document.getElementById('iitm-header-search');
        if (spotlight) {
            spotlight.parentNode.insertBefore(container, spotlight);
        } else {
            const menuContainer = document.querySelector('.menu-items') || document.querySelector('.header__right');
            if (menuContainer) menuContainer.insertBefore(container, menuContainer.firstChild);
        }
    };

    // 1. HEADER SEARCH TRIGGER (CMD+K Hint)
    const injectHeaderSearch = () => {
        const menuContainer = document.querySelector('.header__right') || document.querySelector('.menu-items') || document.querySelector('.header'); 
        if (!menuContainer || document.getElementById('iitm-header-search')) return;

        const btn = document.createElement('div');
        btn.id = 'iitm-header-search';
        btn.style.cssText = `
            display: flex; align-items: center; gap: 8px; margin-right: 15px; 
            padding: 4px 12px; border-radius: 20px; background: rgba(0,0,0,0.05);
            cursor: pointer; transition: 0.2s; border: 1px solid transparent; height: 32px;
        `;
        btn.onmouseenter = () => { btn.style.background = 'rgba(0,0,0,0.1)'; };
        btn.onmouseleave = () => { btn.style.background = 'rgba(0,0,0,0.05)'; };
        
        btn.innerHTML = `
            <span style="font-size: 10px; font-weight: 800; color: #666;">⌘ K</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        `;
        
        const openSpotlight = () => {
            const spotlight = document.getElementById('iitm-spotlight');
            if (spotlight) {
                isSpotlightOpen = true;
                spotlight.style.display = 'flex';
                document.getElementById('spotlight-input').focus();
            }
        };

        window.addEventListener('keydown', (e) => {
            if ((e.key === 'k' || e.key === 'p') && e.metaKey) {
                e.preventDefault();
                openSpotlight();
            }
        });
        
        btn.onclick = openSpotlight;

        menuContainer.insertBefore(btn, menuContainer.firstChild);
    };



    // 1. FOCUS BAR (Timer & Boilerplate & Reference)
    const injectFocusBar = () => {
        const editorContainer = document.querySelector('app-programming-code-editor');
        if (!editorContainer || document.getElementById('iitm-focus-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'iitm-focus-bar';
        bar.innerHTML = `
            <div class="focus-bar-left">
                <div id="timer-container" style="display: flex; align-items: center;">
                    <span id="study-timer">⏱️ 00:00</span>
                    <button id="hide-timer-btn" style="background:none; border:none; color:#666; cursor:pointer; margin-left:8px; font-size:10px;">✕</button>
                </div>
            </div>
            <div class="focus-bar-right">
                <button id="toggle-ref-btn" style="margin-right: 8px; background: #2e7d32; border-radius:4px; border:none; color:white; padding:4px 8px; font-size:12px; cursor:pointer;">📖 Ref</button>
                <button id="reset-boilerplate-btn" style="background: #a0332d; border-radius:4px; border:none; color:white; padding:4px 8px; font-size:12px; cursor:pointer;">🔄 Reset</button>
            </div>
        `;

        const style = document.createElement('style');
        style.innerText = `
            #iitm-focus-bar {
                display: flex; justify-content: space-between; align-items: center;
                background: #1e1e1e; color: #fff; padding: 8px 16px;
                border-radius: 8px 8px 0 0; margin-top: 10px;
                font-family: sans-serif; border: 1px solid #333; border-bottom: none;
            }
            #iitm-ref-panel {
                display: none; position: fixed; right: 20px; top: 100px;
                width: 320px; height: 60vh; background: #1e1e1e; border: 1px solid #444; 
                border-radius: 12px; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                flex-direction: column; overflow: hidden;
            }
            .ref-header { background: #333; padding: 10px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
            .ref-body { padding: 15px; overflow-y: auto; flex: 1; color: #ccc; font-size: 13px; }
            .ref-body pre { background: #000; padding: 8px; border-radius: 4px; color: #4CAF50; overflow-x: auto; font-size: 11px; }
        `;
        document.head.appendChild(style);
        
        const container = editorContainer.querySelector('.programming-code-editor-container') || editorContainer;
        container.insertBefore(bar, container.firstChild);

        // Reference Panel
        if (!document.getElementById('iitm-ref-panel')) {
            const refPanel = document.createElement('div');
            refPanel.id = 'iitm-ref-panel';
            refPanel.innerHTML = `
                <div class="ref-header">
                    <span>📖 Reference</span>
                    <button class="close-all-panels" style="background:none; border:none; color:white; cursor:pointer;">✕</button>
                </div>
                <div class="ref-body">
                    <b>Common Python Hacks:</b>
                    <pre># List to String\n", ".join(map(str, myList))\n\n# Multi-line input\nlines = [input() for _ in range(n)]\n\n# Sort by second item\nL.sort(key=lambda x: x[1])</pre>
                </div>
            `;
            document.body.appendChild(refPanel);
        }

        // Timer Logic
        let seconds = 0;
        const interval = setInterval(() => {
            const el = document.getElementById('study-timer');
            if (!el) { clearInterval(interval); return; }
            seconds++;
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            el.innerText = `⏱️ ${m}:${s}`;
        }, 1000);
    };

    // Global Delegated Clicks
    addGlobalListener('click', '#toggle-ref-btn', () => {
        document.getElementById('iitm-ref-panel').style.display = 'flex';
    });
    addGlobalListener('click', '.close-all-panels', () => {
        document.getElementById('iitm-ref-panel').style.display = 'none';
    });
    addGlobalListener('click', '#hide-timer-btn', () => {
        document.getElementById('iitm-focus-bar').style.display = 'none';
        // Optional: Save preference to localStorage if wanted, but for now just hide.
    });
    addGlobalListener('click', '#reset-boilerplate-btn', () => {
        if (confirm('Reset code to original boilerplate?')) {
            document.querySelector('.reset-btn')?.click();
        }
    });

    // 2. SPOTLIGHT SEARCH (Cmd+K)
    const injectSpotlight = () => {
        const existing = document.getElementById('iitm-spotlight');

        // Always ensure the latest CSS is injected or updated
        let styleTag = document.getElementById('iitm-spotlight-styles');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'iitm-spotlight-styles';
            document.head.appendChild(styleTag);
        }
        styleTag.innerText = `
            /* GLOBAL OVERRIDES */

            #iitm-spotlight {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 10000; display: flex; align-items: flex-start; justify-content: center;
                padding-top: 100px; pointer-events: none;
            }
            .spotlight-box { 
                position: relative; width: 700px; background: #121212; 
                border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); 
                overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.9); 
                pointer-events: auto;
            }
            .spotlight-header { background: rgba(40,40,40,0.8); border-bottom: 1px solid rgba(255,255,255,0.1); }
            #spotlight-input { 
                width: 100%; background: transparent; border: none; 
                padding: 12px 30px 24px 30px; color: white; font-size: 24px; outline: none; 
                font-weight: 300;
            }
            .spotlight-filters { padding: 0 30px 20px 30px; display: flex; gap: 10px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
            .spotlight-filters::-webkit-scrollbar { display: none; }
            #spotlight-results { max-height: 550px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
            .spotlight-item { 
                padding: 14px 30px; color: #aaa; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); 
                display: flex; justify-content: space-between; gap: 20px; transition: 0.1s linear;
                align-items: center;
            }
            .spotlight-item:hover, .spotlight-item.active { background: rgba(21, 101, 192, 0.15); color: #fff; }
            .spotlight-item.selected { border-left: 3px solid #db2777; background: rgba(219, 39, 119, 0.05); }
            .spotlight-item:hover .selection-hint { opacity: 1 !important; }
            .spotlight-item .title { font-size: 15px; font-weight: 500; margin-bottom: 2px; }
            .type { font-size: 9px; padding: 4px 10px; border-radius: 6px; font-weight: 900; background: rgba(255,255,255,0.05); color: #888; text-transform: uppercase; }
            .filter-chip { 
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #777; 
                padding: 8px 18px; border-radius: 12px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.25s;
            }
            .filter-chip.active { background: #db2777; border-color: #db2777; color: white; }
            
            .submenu-item:hover { background: rgba(255,255,255,0.05); color:#fff; }
            @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

            /* CLEAN MODE & TOGGLES */
            body.iitm-clean-mode #iitm-header-utils,
            body.iitm-clean-mode #iitm-header-search,
            body.iitm-clean-mode .iitm-scraper-btn,
            body.iitm-clean-mode .iitm-copy-btn,
            body.iitm-clean-mode #iitm-global-timer,
            body.iitm-clean-mode #iitm-focus-bar,
            body.iitm-clean-mode #iitm-progress-card { display: none !important; }
            body.iitm-clean-mode #iitm-ai-dropdown { display: none !important; }
            body.iitm-hide-progress #iitm-progress-card { display: none !important; }

            /* DARK MODE OVERRIDES */
            body.iitm-dark-mode { background: #0a0a0a !important; color: #eee !important; }
            body.iitm-dark-mode .header, 
            body.iitm-dark-mode mat-sidenav,
            body.iitm-dark-mode .units__list,
            body.iitm-dark-mode .units__items,
            body.iitm-dark-mode .units__subitems { background: #121212 !important; border-color: #222 !important; color: #ccc !important; }
            body.iitm-dark-mode .mat-drawer-content, body.iitm-dark-mode .mat-sidenav-content { background: #0a0a0a !important; }
            body.iitm-dark-mode .mat-mdc-card, body.iitm-dark-mode .mdc-card { background: #181818 !important; color: #eee !important; border: 1px solid #333 !important; }

            /* PROGRESS CARD DARK MODE */
            #iitm-progress-card { transition: 0.3s; background: white; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #333; }
            body.iitm-dark-mode #iitm-progress-card { background: #181818 !important; border-color: #333 !important; color: #eee !important; box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important; }
            body.iitm-dark-mode .progress-bg { background: #333 !important; }
            
            /* ACE EDITOR DARK MODE */
            body.iitm-dark-mode .ace_editor { background: #121212 !important; color: #eee !important; }
            body.iitm-dark-mode .ace_gutter { background: #181818 !important; color: #666 !important; }
            
            /* SCROLLBARS */
            body.iitm-dark-mode ::-webkit-scrollbar { width: 10px; height: 10px; }
            body.iitm-dark-mode ::-webkit-scrollbar-track { background: #0a0a0a; }
            body.iitm-dark-mode ::-webkit-scrollbar-thumb { background: #222; border-radius: 5px; border: 2px solid #0a0a0a; }

            /* AI DROPDOWN */
            #iitm-ai-dropdown {
                position: absolute; right: 0; bottom: 100%; margin-bottom: 8px;
                background: #121212; border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px; padding: 6px; display: none; flex-direction: column;
                z-index: 10002; box-shadow: 0 10px 40px rgba(0,0,0,0.5); width: 220px;
            }
            .ai-option {
                padding: 10px 14px; color: #aaa; border-radius: 8px; display: flex; 
                align-items: center; gap: 10px; cursor: pointer; transition: 0.2s;
                font-size: 13px; font-weight: 500;
            }
            .ai-option:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .breadcrumb { font-size: 10px; color: #555; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        `;

        if (existing) {
            existing.style.display = isSpotlightOpen ? 'flex' : 'none';
            return;
        }

        const spotlight = document.createElement('div');
        spotlight.id = 'iitm-spotlight';
        spotlight.style.display = 'none';
        spotlight.innerHTML = `
            <div class="spotlight-box">
                <div class="spotlight-header">
                    <div style="padding: 24px 30px 4px 30px; font-size: 13px; font-weight: 800; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">Quick Navigation</div>
                    <input id="spotlight-input" type="text" placeholder="Jump to Week or Lesson (⌘P)..." autocomplete="off">
                    <div class="spotlight-filters">
                        <div class="filter-chip active" data-filter="all">All</div>
                        <div class="filter-chip" data-filter="video">🎥 Videos</div>
                        <div class="filter-chip" data-filter="graded">📝 Graded</div>
                        <div class="filter-chip" data-filter="grpa">💻 GrPA</div>
                        <div class="filter-chip" data-filter="command">🤖 Commands</div>
                        <div class="filter-chip" data-filter="week">📅 Weeks</div>
                    </div>
                </div>
                <div id="spotlight-results"></div>
                <div style="padding: 14px 30px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #555; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4);">
                    <div id="spotlight-footer-meta">
                        Tip: Use <span style="background:rgba(21,101,192,0.2); color:#1e88e5; padding:2px 6px; border-radius:4px; font-weight:700;">↑ ↓</span> to navigate
                    </div>
                    <div id="selection-counter" style="color:#db2777; font-weight:800;"></div>
                    <button id="syllabus-export-btn" class="iitm-btn" style="padding: 6px 14px; font-size: 11px;">📊 Export Syllabus</button>
                </div>
            </div>
        `;

        document.body.appendChild(spotlight);

        const input = document.getElementById('spotlight-input');
        const results = document.getElementById('spotlight-results');

        const renderResults = (items) => {
            const counter = document.getElementById('selection-counter');
            if (counter) counter.innerText = selectedItems.size > 0 ? `📦 ${selectedItems.size} Selected` : '';
            
            results.innerHTML = '';
            
            let filtered = items;
            if (activeFilter !== 'all') {
                filtered = items.filter(item => {
                    const tag = (item.typeLabel || '').toLowerCase();
                    const text = (item.text || '').toLowerCase();
                    if (activeFilter === 'video') return tag.includes('video');
                    if (activeFilter === 'graded') {
                        const isGradedMatch = tag === 'graded' || text.includes('graded');
                        const isNotGraded = text.includes('not graded') || text.includes('un-graded');
                        return isGradedMatch && !isNotGraded;
                    }
                    if (activeFilter === 'grpa') return tag.includes('grpa') || text.includes('grpa');
                    if (activeFilter === 'command') return tag.includes('action');
                    if (activeFilter === 'week') return !item.isSub;
                    return true;
                });
            }

            filtered.slice(0, 50).forEach(item => {
                const isSelected = selectedItems.has(item.text);
                const div = document.createElement('div');
                div.className = `spotlight-item ${isSelected ? 'selected' : ''}`;
                div.innerHTML = `
                    <div class="content">
                        <div class="breadcrumb">${item.breadcrumb || 'Course'}</div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${isSelected ? '<span style="color:#db2777; font-size:14px;">●</span>' : ''}
                            <div class="title">${item.text}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${item.isSub ? `<span class="type" style="background:rgba(21,101,192,0.1);color:#1e88e5;">${item.typeLabel}</span>` : '<span class="type">Week</span>'}
                        <span class="selection-hint" style="font-size:9px; color:#555; opacity:0; transition:0.2s;">Tab to select</span>
                    </div>
                `;
                div.onclick = () => {
                    if (item.actionId) {
                        if (item.actionId === 'exportSyllabus') chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'exportSyllabus' });
                        else if (item.actionId === 'exportNotes') document.getElementById('export-notes-btn')?.click();
                        else if (item.actionId === 'unlockPage') chrome.runtime.sendMessage({ action: 'unlockPage' });
                        else if (item.actionId === 'explainChatGPT') openInAI('chatgpt');
                        else if (item.actionId === 'explainClaude') openInAI('claude');
                        else if (item.actionId === 'explainGemini') openInAI('gemini');
                        else if (item.actionId === 'bulkExport') bulkScrapeAll();
                        else handleUIToggle(item.actionId);
                    } else {
                        (item.el.closest('button') || item.el).click();
                    }
                    isSpotlightOpen = false;
                    spotlight.style.display = 'none';
                    input.value = '';
                };
                results.appendChild(div);
            });
        };

        const getItems = () => {
            // Sites uses Angular's units__items for weeks and unit__subitems for contents
            const headers = Array.from(document.querySelectorAll('.units__items'));
            const allItems = [];
            
            headers.forEach(weekEl => {
                const weekTitle = weekEl.querySelector('.units__items-title')?.innerText.trim() || 'General';
                
                // Add the Week itself
                const weekHeader = weekEl.querySelector('.units__items-title');
                if (weekHeader) {
                    allItems.push({
                        text: weekTitle,
                        el: weekHeader,
                        isSub: false,
                        typeLabel: 'Week',
                        color: '#1565c0'
                    });
                }
                
                // Add all sub-items under this week
                const subItems = weekEl.querySelectorAll('.units__subitems');
                subItems.forEach(sub => {
                    const titleText = sub.querySelector('.units__subitems-title span')?.innerText.trim() || sub.innerText.split('\n')[0].trim();
                    const subTag = sub.querySelector('.units__subitems-videos')?.innerText.trim() || 'Lesson';
                    
                    let color = '#2e7d32';
                    let label = subTag;
                    
                    if (subTag.toLowerCase().includes('video') || titleText.startsWith('L') || titleText.toLowerCase().includes('lecture')) {
                        color = '#c62828';
                        label = 'Video';
                    } else if (titleText.toLowerCase().includes('grpa')) {
                        color = '#6a1b9a';
                        label = 'GrPA';
                    } else if (subTag.toLowerCase().includes('assignment') || titleText.toLowerCase().includes('assignment')) {
                        color = '#ef6c00';
                        const isGradedMatch = titleText.toLowerCase().includes('graded') || subTag.toLowerCase().includes('graded');
                        const isNotGraded = titleText.toLowerCase().includes('not graded') || titleText.toLowerCase().includes('un-graded');
                        label = (isGradedMatch && !isNotGraded) ? 'Graded' : 'Practice';
                    }
                    
                    allItems.push({
                        text: titleText,
                        breadcrumb: weekTitle,
                        el: sub,
                        isSub: true,
                        typeLabel: label,
                        color: color
                    });
                });
            });

            // ADD CORE ACTIONS (Command Palette Style)
            const actions = [
                { text: 'Toggle Clean UI (Nuke Everything)', typeLabel: 'Action', el: null, action: 'toggleCleanMode' },
                { text: 'Export Course Syllabus to Markdown', typeLabel: 'Action', el: null, action: 'exportSyllabus' },
                { text: 'Unlock Editor and Copy-Paste', typeLabel: 'Action', el: null, action: 'unlockPage' },
                { text: 'Toggle Study Progress Card', typeLabel: 'Action', el: null, action: 'toggleProgress' },
                { text: 'Export Study Notes as Markdown', typeLabel: 'Action', el: null, action: 'exportNotes' },
                { text: 'Toggle Study Focus Bar', typeLabel: 'Action', el: null, action: 'toggleFocusBar' },
                { text: '🌙 Toggle Dark Mode', typeLabel: 'Action', el: null, action: 'toggleDarkMode' },
                { text: '🤖 Explain Page with ChatGPT', typeLabel: 'Action', el: null, action: 'explainChatGPT' },
                { text: '🧠 Solve with Claude', typeLabel: 'Action', el: null, action: 'explainClaude' },
                { text: '✨ Brainstorm with Gemini', typeLabel: 'Action', el: null, action: 'explainGemini' },
                { text: '📦 Bulk Export All Weeks (Export All)', typeLabel: 'Action', el: null, action: 'bulkExport' }
            ];

            actions.forEach(act => {
                allItems.push({
                    text: act.text,
                    breadcrumb: 'System Command',
                    el: null,
                    isSub: true,
                    typeLabel: act.typeLabel,
                    color: '#c2185b',
                    actionId: act.action
                });
            });
            
            return allItems;
        };

        // KEYBOARD NAVIGATION
        let selectedIndex = -1;
        let currentMatches = [];

        input.onkeydown = (e) => {
            const items = results.querySelectorAll('.spotlight-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(items);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (selectedIndex >= 0) {
                    const itemData = currentMatches[selectedIndex];
                    if (itemData && itemData.isSub && !itemData.actionId) {
                        if (selectedItems.has(itemData.text)) selectedItems.delete(itemData.text);
                        else selectedItems.add(itemData.text);
                        renderResults(currentMatches); 
                        updateSelection(results.querySelectorAll('.spotlight-item'));
                    }
                }
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                items[selectedIndex].click();
            } else if (e.key === 'k' && e.metaKey) {
                e.preventDefault();
                showActionSubmenu(currentMatches[selectedIndex]);
            }
        };

        const showActionSubmenu = (item) => {
            if (!item) return;
            const actionContainer = document.createElement('div');
            actionContainer.id = 'spotlight-action-submenu';
            actionContainer.style.cssText = `
                position: absolute; bottom: 60px; right: 30px; width: 220px;
                background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);
                display: flex; flex-direction: column; overflow: hidden; z-index: 10005;
                animation: slideUp 0.2s ease;
            `;
            
            const itemActions = [
                { name: 'Primary Action (Open)', key: '↵', run: () => (item.el.closest('button') || item.el).click() },
                { name: 'Toggle Selection', key: '⇥', run: () => {
                    if (selectedItems.has(item.text)) selectedItems.delete(item.text);
                    else selectedItems.add(item.text);
                    renderResults(matches);
                } },
                { name: 'Scrape Context Only', key: 'S', run: () => {
                   (item.el.closest('button') || item.el).click();
                   setTimeout(() => chrome.runtime.sendMessage({ action: 'triggerScraper' }), 1000);
                } }
            ];

            actionContainer.innerHTML = itemActions.map(a => `
                <div class="submenu-item" style="padding:10px 15px; display:flex; justify-content:space-between; cursor:pointer; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="color:#eee;">${a.name}</span>
                    <span style="color:#555; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; font-size:10px;">${a.key}</span>
                </div>
            `).join('');

            results.parentNode.appendChild(actionContainer);
            
            const closeSub = (e) => {
                if (!actionContainer.contains(e.target)) {
                    actionContainer.remove();
                    document.removeEventListener('click', closeSub);
                }
            };
            setTimeout(() => document.addEventListener('click', closeSub), 10);

            actionContainer.querySelectorAll('.submenu-item').forEach((div, i) => {
                div.onclick = () => {
                    itemActions[i].run();
                    actionContainer.remove();
                };
            });
        };

        const updateSelection = (items) => {
            items.forEach((item, idx) => {
                if (idx === selectedIndex) item.classList.add('active');
                else item.classList.remove('active');
                item.style.background = idx === selectedIndex ? 'rgba(21, 101, 192, 0.3)' : '';
                if (idx === selectedIndex) item.scrollIntoView({ block: 'nearest' });
            });
        };

        input.oninput = () => {
            const query = input.value.toLowerCase().trim();
            const items = getItems();
            selectedIndex = -1; 
            
            if (!query) {
                currentMatches = items; // Update currentMatches for empty query
                renderResults(items);
                return;
            }

            const words = query.split(/\s+/);
            const matches = items.filter(item => 
                words.every(word => 
                    (item.text && item.text.toLowerCase().includes(word)) || 
                    (item.breadcrumb && item.breadcrumb.toLowerCase().includes(word)) ||
                    (item.typeLabel && item.typeLabel.toLowerCase().includes(word))
                )
            );
            
            currentMatches = matches; // Update currentMatches here
            renderResults(matches);
        };

        const updatePlaceholder = () => {
            const count = document.querySelectorAll('.units__subitems').length;
            if (count < 10) {
                input.placeholder = "Expand weeks in sidebar to search lessons...";
            } else {
                input.placeholder = "Jump to Week or Lesson...";
            }
        };

        // Handle Filters
        addGlobalListener('click', '.filter-chip', (e) => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            input.oninput(); // Refresh results
        });

        // Show items by default on focus if empty
        input.onfocus = () => { 
            updatePlaceholder();
            const items = getItems();
            currentMatches = items;
            renderResults(items); 
        };
        
        // Syllabus Export Trigger
        addGlobalListener('click', '#syllabus-export-btn', () => {
            chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'exportSyllabus' });
            spotlight.style.display = 'none';
        });
    };

    // 3. SCORE CHECKER TOOLS
    const injectScoreCheckerTools = () => {
        if (!window.location.hostname.includes('score-checker')) return;
        
        const isOverview = window.location.pathname.includes('/course_wise');
        const isDetail = window.location.pathname.includes('/view_score');
        
        if (isOverview || isDetail) {
            const container = document.querySelector('.container') || document.querySelector('main') || document.querySelector('.content-wrapper');
            if (container && !document.getElementById('iitm-score-tools')) {
                const tools = document.createElement('div');
                tools.id = 'iitm-score-tools';
                tools.style.position = 'relative';
                tools.style.marginBottom = '25px';
                tools.style.padding = '20px';
                tools.style.background = '#fcfcfc';
                tools.style.borderRadius = '16px';
                tools.style.border = '1px solid #e9ecef';
                tools.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                tools.style.display = 'flex';
                tools.style.flexWrap = 'wrap';
                tools.style.gap = '15px';
                tools.style.alignItems = 'center';
                tools.setAttribute('data-iitm-loaded', 'true');
                
                const closeBtn = `<button class="close-score-tools" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#ccc; cursor:pointer;">✕</button>`;
                
                if (isOverview) {
                    tools.innerHTML = `
                        ${closeBtn}
                        <div style="flex:1; min-width:200px;">
                            <h4 style="margin:0; font-size:16px; font-weight:700; color:#333;">Scraper Toolkit</h4>
                            <p style="margin:0; font-size:12px; opacity:0.6;">Save your course performance as Markdown.</p>
                        </div>
                        <button class="btn btn-primary" id="iitm-export-all-btn" style="font-weight: bold; border-radius: 10px; padding: 10px 20px; box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);">🚀 Export All Detailed Scores</button>
                        <button class="btn btn-outline-secondary" id="iitm-export-this-btn" style="border-radius: 10px; padding: 10px 20px;">📝 Save Overview Only</button>
                    `;
                    container.insertBefore(tools, container.firstChild);
                    document.getElementById('iitm-export-all-btn').onclick = () => chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'consolidateAll' });
                    document.getElementById('iitm-export-this-btn').onclick = () => chrome.runtime.sendMessage({ action: 'triggerScraper' });
                } else if (isDetail) {
                    tools.innerHTML = `
                        ${closeBtn}
                        <div style="flex:1; min-width:150px;">
                            <h4 style="margin:0; font-size:16px; font-weight:700; color:#333;">Detailed Scraper</h4>
                        </div>
                        <button class="btn btn-info text-white" id="iitm-export-detail-btn" style="border-radius: 10px; font-weight: bold; padding: 10px 20px; border:none; background: #17a2b8;">📝 Export Page Results</button>
                        <a href="/course_wise" class="btn btn-link btn-sm" style="color: #6c757d;">← Back to Overview</a>
                    `;
                    container.insertBefore(tools, container.firstChild);
                    document.getElementById('iitm-export-detail-btn').onclick = () => chrome.runtime.sendMessage({ action: 'triggerScraper' });
                }
                addGlobalListener('click', '.close-score-tools', () => tools.style.display = 'none');
                console.log('✅ IITM Scraper: Injected tools into container');
            }
        }
    };

    // 4. GLOBAL TIMER FOR ASSIGNMENTS & LECTURES
    const injectGlobalTimer = () => {
        // Detect if we are on an assignment or lecture page
        const isAssignmentPage = !!(
            document.querySelector('.assignment-title, .assessment-top-info, app-quizzes') || 
            window.location.href.includes('/assessment') || 
            window.location.href.includes('/quiz')
        );
        
        const isLecturePage = !!(
            document.querySelector('video, iframe, app-video-player, .transcript-container') || 
            window.location.href.includes('/course_unit/') ||
            (document.activeElement && document.activeElement.tagName === 'IFRAME')
        );
        
        const hasFocusBar = !!document.getElementById('iitm-focus-bar');
        
        // Ensure we ONLY inject if visible assignment or lecture content is present
        if ((!isAssignmentPage && !isLecturePage) || hasFocusBar || document.getElementById('iitm-global-timer') || isTimerDismissed) return;

        const timer = document.createElement('div');
        timer.id = 'iitm-global-timer';
        timer.style.cssText = `
            position: fixed; top: 12px; right: 260px; z-index: 10001;
            background: rgba(30, 30, 30, 0.95); color: #fff;
            padding: 8px 16px; border-radius: 40px;
            font-size: 14px; font-weight: 700; border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 12px;
            backdrop-filter: blur(10px); transition: 0.3s;
        `;
        
        const format = (s) => String(Math.floor(s)).padStart(2, '0');
        const start = Date.now();

        const update = () => {
            const elapsed = Math.floor((Date.now() - start) / 1000);
            const m = format(elapsed / 60);
            const s = format(elapsed % 60);
            timer.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="width:10px; height:10px; background:#4caf50; border-radius:50%; box-shadow:0 0 12px #4caf50; animation: pulse 2s infinite;"></span>
                    <span style="letter-spacing:1px;">${m}:${s}</span>
                </div>
                <div id="iitm-timer-close" style="cursor:pointer; opacity:0.6; font-size:20px; transition:0.2s;">&times;</div>
            `;
            const closeBtn = timer.querySelector('#iitm-timer-close');
            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    isTimerDismissed = true;
                    timer.remove();
                };
            }
        };

        update();
        const timerInt = setInterval(() => {
            if (!document.getElementById('iitm-global-timer')) {
                clearInterval(timerInt);
                return;
            }
            update();
        }, 1000);

        document.body.appendChild(timer);
    };

    // 3. SIDEBAR PROGRESS TRACKER (FIXED: Integrated & Live Updates)
    const injectProgressTracker = () => {
        const list = document.querySelector('.units__list');
        if (!list) return;

        let card = document.getElementById('iitm-progress-card');
        if (!card) {
            card = document.createElement('div');
            card.id = 'iitm-progress-card';
            card.style.cssText = `
                margin: 15px; padding: 15px; border-radius: 12px;
                position: relative; z-index: 10;
            `;
            list.insertBefore(card, list.firstChild);
        }

        // Gather Stats accurately from the sidebar elements
        const subItems = Array.from(document.querySelectorAll('.units__subitems'));
        let stats = {
            videos: 0, totalVideos: 0,
            graded: 0, totalGraded: 0,
            grpa: 0, totalGrpa: 0,
            quizzes: 0, totalQuizzes: 0
        };
        
        subItems.forEach(item => {
            const t = item.innerText.toLowerCase();
            const tag = item.querySelector('.units__subitems-videos')?.innerText.toLowerCase() || '';
            const isDone = !!item.querySelector('.submitted-icon');
            
            // Core Filters
            const isNote = t.includes('not graded') || t.includes('practice') || t.includes('mock') || t.includes('non-graded');
            const isGrPA = t.includes('grpa'); 
            const isQuiz = t.includes('quiz') || t.includes('exam');
            const isGraded = t.includes('graded') && !isGrPA && !isQuiz && !isNote;

            if (tag.includes('video')) {
                stats.totalVideos++;
                if (isDone) stats.videos++;
            } else if (isGrPA) {
                stats.totalGrpa++;
                if (isDone) stats.grpa++;
            } else if (isQuiz) {
                if (isNote) return; 
                stats.totalQuizzes++;
                if (isDone) stats.quizzes++;
            } else if (isGraded) {
                stats.totalGraded++;
                if (isDone) stats.graded++;
            }
        });

        const done = stats.graded + stats.grpa + stats.quizzes;
        const total = stats.totalGraded + stats.totalGrpa + stats.totalQuizzes;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        // Only update if content changed or if it was 0/0
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span class="progress-label" style="font-weight:800; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Course Progress</span>
                <span style="font-weight:900; color:#1e88e5; font-size:13px;">${progress}%</span>
            </div>
            <div class="progress-bg" style="width:100%; height:8px; border-radius:4px; margin-bottom:12px; overflow:hidden;">
                <div style="width:${progress}%; height:100%; background:#1e88e5; border-radius:4px; transition: width 1.2s cubic-bezier(0.19, 1, 0.22, 1);"></div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:10px; font-weight:700;">
                <div style="display:flex; align-items:center; gap:6px;"><span style="filter:grayscale(0.6);">🎬</span> Videos: ${stats.videos}/${stats.totalVideos}</div>
                <div style="display:flex; align-items:center; gap:6px;"><span style="filter:grayscale(0.6);">📝</span> Graded: ${stats.graded}/${stats.totalGraded}</div>
                <div style="display:flex; align-items:center; gap:6px;"><span style="color:#9c27b0;">💻</span> GrPA: ${stats.grpa}/${stats.totalGrpa}</div>
                <div style="display:flex; align-items:center; gap:6px;"><span style="color:#ef6c00;">🏆</span> Quizzes: ${stats.quizzes}/${stats.totalQuizzes}</div>
            </div>
        `;
    };



    // Auto-Loader loop (Reduced frequency for site speed)
    setInterval(() => {
        injectHeaderUtils();
        injectHeaderSearch();
        injectSpotlight();
        injectFocusBar();
        injectProgressTracker();
        injectScoreCheckerTools();
        injectGlobalTimer();
        autoCloseSidebar();
    }, 2500);

    // Global Trigger for Bulk Export
    window.addEventListener('iitm-trigger-bulk-export', bulkScrapeAll);

})();
