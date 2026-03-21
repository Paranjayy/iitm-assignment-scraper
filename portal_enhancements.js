(function() {
    console.log('IITM Explorer: Enhancing Productivity...');

    const body = document.body;
    let activeFilter = 'all';
    let isTimerDismissed = false; 
    let isCleanMode = localStorage.getItem('iitm-clean-mode-enabled') === 'true';
    let isFocusBarVisible = localStorage.getItem('iitm-focus-bar-visible') !== 'false';
    let isNotesBtnVisible = localStorage.getItem('iitm-notes-btn-visible') !== 'false';
    let isProgressVisible = localStorage.getItem('iitm-progress-visible') !== 'false';
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
        if (sidebarClosedThisSession || autoCloseAttempts > 20) return;
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
                const isHidden = spotlight.style.display === 'none' || !spotlight.style.display;
                spotlight.style.display = isHidden ? 'flex' : 'none';
                if (isHidden) {
                    const input = document.getElementById('spotlight-input');
                    if (input) {
                        input.focus();
                        // Trigger an initial "empty" search to show recent or all items
                        input.dispatchEvent(new Event('input'));
                    }
                }
            }
            if (e.key === 'Escape') spotlight.style.display = 'none';
        });

        document.addEventListener('click', (e) => {
            const spotlight = document.getElementById('iitm-spotlight');
            if (spotlight && spotlight.style.display === 'flex') {
                const box = spotlight.querySelector('.spotlight-box');
                const isClickInside = box && box.contains(e.target);
                const isToggleBtn = !!e.target.closest('#iitm-header-search');
                
                if (!isClickInside && !isToggleBtn) {
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
                background: rgba(255,255,255,0.1); border: 1px solid rgba(0,0,0,0.05);
                transition: 0.2s; font-size: 16px; color: #333;
            `;
            btn.onmouseenter = () => btn.style.background = 'rgba(0,0,0,0.1)';
            btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.1)';
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
            <span style="font-size: 10px; font-weight: 800; color: #666; font-family: 'Inter';">⌘ K</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        `;
        
        btn.onclick = () => {
            const spotlight = document.getElementById('iitm-spotlight');
            if (spotlight) {
                spotlight.style.display = 'flex';
                document.getElementById('spotlight-input').focus();
            }
        };

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
                font-family: 'Inter', sans-serif; border: 1px solid #333; border-bottom: none;
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
        if (document.getElementById('iitm-spotlight')) return;

        const spotlight = document.createElement('div');
        spotlight.id = 'iitm-spotlight';
        spotlight.style.display = 'none';
        spotlight.innerHTML = `
            <div class="spotlight-box">
                <div class="spotlight-header">
                    <div style="padding: 24px 30px 4px 30px; font-size: 13px; font-weight: 800; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">
                        Quick Navigation
                    </div>
                    <input id="spotlight-input" type="text" placeholder="Search Lessons, Assignments, Weeks..." autocomplete="off">
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
                <div style="padding: 14px 30px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #555; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                    <div>Tip: Use <span style="background:rgba(21,101,192,0.2); color:#1e88e5; padding:2px 6px; border-radius:4px; font-weight:700;">↑ ↓</span> to navigate, <span style="background:rgba(21,101,192,0.2); color:#1e88e5; padding:2px 6px; border-radius:4px; font-weight:700;">Enter</span> to select</div>
                    <button id="syllabus-export-btn" class="iitm-btn" style="padding: 6px 14px; font-size: 11px;">📊 Export Syllabus</button>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.innerText = `
            #iitm-spotlight {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 10000; display: flex; align-items: flex-start; justify-content: center;
                padding-top: 100px; pointer-events: none;
            }
            .spotlight-box { 
                position: relative; width: 700px; background: #121212; 
                border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); 
                overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.9); 
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                pointer-events: auto;
            }
            .spotlight-header {
                background: rgba(40,40,40,0.8);
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            #spotlight-input { 
                width: 100%; background: transparent; border: none; 
                padding: 12px 30px 24px 30px; color: white; font-size: 24px; outline: none; 
                font-weight: 300;
            }
            .spotlight-filters { 
                padding: 0 30px 20px 30px; display: flex; gap: 10px; 
                flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
            }
            .spotlight-filters::-webkit-scrollbar { display: none; }
            #spotlight-results { max-height: 550px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
            .spotlight-item { 
                padding: 18px 30px; color: #aaa; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); 
                display: flex; justify-content: space-between; gap: 20px; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                align-items: center;
            }
            .spotlight-item:hover { background: rgba(21, 101, 192, 0.15); color: #fff; padding-left: 36px; }
            .spotlight-item .content { flex: 1; }
            .spotlight-item .title { font-size: 15px; font-weight: 500; margin-bottom: 2px; }
            .spotlight-item .type { 
                font-size: 9px; opacity: 0.9; text-transform: uppercase; border: none; 
                padding: 4px 10px; border-radius: 6px; font-weight: 900; letter-spacing: 0.8px;
                background: rgba(255,255,255,0.05); color: #888;
            }
            .spotlight-item:hover .type { background: #1565c0; color: white; }
            
            .filter-chip { 
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #777; 
                padding: 8px 18px; border-radius: 12px; font-size: 11px; font-weight: 700;
                cursor: pointer; white-space: nowrap; transition: 0.25s;
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .filter-chip:hover { background: rgba(255,255,255,0.08); color: #ddd; }
            .filter-chip.active { background: #1e88e5; border-color: #1e88e5; color: white; }

            /* MASTER CLEAN MODE - Hides EVERYTHING at once */
            /* MASTER CLEAN MODE - Hides EVERYTHING at once */
            body.iitm-clean-mode #iitm-header-utils,
            body.iitm-clean-mode #iitm-header-search,
            body.iitm-clean-mode .iitm-scraper-btn,
            body.iitm-clean-mode .iitm-copy-btn,
            body.iitm-clean-mode #iitm-deadline-widget,
            body.iitm-clean-mode #iitm-deadline-popup,
            body.iitm-clean-mode #iitm-global-timer,
            body.iitm-clean-mode #iitm-focus-bar,
            body.iitm-clean-mode #iitm-progress-card,
            body.iitm-clean-mode #iitm-timer-container { display: none !important; }

            /* INDIVIDUAL TOGGLES */
            body.iitm-hide-notes #iitm-toggle-notes { display: none !important; }
            body.iitm-hide-focus #iitm-focus-bar { display: none !important; }
            body.iitm-hide-progress #iitm-progress-card { display: none !important; }
            
            #iitm-notes-drawer {
                position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
                background: white; border-left: 1px solid #ddd;
                box-shadow: -10px 0 50px rgba(0,0,0,0.1); z-index: 10005; display: none;
                flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif;
            }
            .notes-header { 
                background: #121212; color: white; padding: 20px; 
                display: flex; justify-content: space-between; align-items: center;
                font-weight: 800; letter-spacing: 0.5px;
            }
            .notes-list { flex: 1; overflow-y: auto; padding: 15px; background: #fafafa; }
            .note-item { 
                background: white; border: 1px solid #eee; padding: 12px; 
                border-radius: 12px; margin-bottom: 12px; position: relative;
                transition: 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            }
            .note-item:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
            .notes-footer { 
                padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px;
                background: white; box-shadow: 0 -10px 20px rgba(0,0,0,0.02);
            }
            .iitm-btn {
                flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #1e88e5;
                background: white; color: #1e88e5; cursor: pointer; font-size: 11px;
                font-weight: 800; text-transform: uppercase; transition: 0.2s;
            }
            .iitm-btn:hover { background: #1e88e5; color: white; }
            .breadcrumb { font-size: 10px; color: #555; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .spotlight-item:hover .breadcrumb { color: #1565c0; }
        `;
        document.head.appendChild(style);
        document.body.appendChild(spotlight);

        const input = document.getElementById('spotlight-input');
        const results = document.getElementById('spotlight-results');

        // let activeFilter = 'all'; // This line was moved to the top of the file

        // let activeFilter = 'all'; // This line was moved to the top of the file

        const renderResults = (items) => {
            results.innerHTML = '';
            
            let filtered = items;
            if (activeFilter !== 'all') {
                filtered = items.filter(item => {
                    const tag = (item.typeLabel || '').toLowerCase();
                    const text = (item.text || '').toLowerCase();
                    if (activeFilter === 'video') return tag.includes('video');
                    if (activeFilter === 'graded') {
                        // Ensure 'Not Graded' items are excluded from the graded filter
                        const isGradedMatch = tag === 'graded' || text.includes('graded');
                        const isNotGraded = text.includes('not graded') || text.includes('un-graded') || text.includes('practice');
                        return isGradedMatch && !isNotGraded;
                    }
                    if (activeFilter === 'grpa') return tag.includes('grpa') || text.includes('grpa');
                    if (activeFilter === 'command') return tag.includes('action');
                    if (activeFilter === 'week') return !item.isSub;
                    return true;
                });
            }

            // Cap results for performance
            const displayItems = filtered.slice(0, 50);

            if (displayItems.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'spotlight-item';
                empty.style.justifyContent = 'center';
                empty.innerText = input.value ? 'No matches found.' : 'Nothing found in this category yet.';
                results.appendChild(empty);
                return;
            }

            displayItems.forEach(item => {
                const div = document.createElement('div');
                div.className = 'spotlight-item';
                div.innerHTML = `
                    <div class="content">
                        <div class="breadcrumb">${item.breadcrumb || 'Course'}</div>
                        <div class="title">${item.text}</div>
                    </div>
                    <span class="type" style="${item.isSub ? 'background:rgba(21,101,192,0.1);color:#1e88e5;' : 'background:rgba(255,255,255,0.05);'}">${item.typeLabel}</span>
                `;
                div.onclick = () => {
                    if (item.actionId) {
                        // Handle Command Palette Actions
                        if (item.actionId === 'exportSyllabus') chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'exportSyllabus' });
                        else if (item.actionId === 'exportNotes') document.getElementById('export-notes-btn')?.click();
                        else if (item.actionId === 'unlockPage') chrome.runtime.sendMessage({ action: 'unlockPage' });
                        else handleUIToggle(item.actionId);
                    } else {
                        const clickable = item.el.closest('button') || item.el;
                        clickable.click();
                    }
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
                { text: 'Toggle Study Focus Bar', typeLabel: 'Action', el: null, action: 'toggleFocusBar' }
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
        input.onkeydown = (e) => {
            const items = results.querySelectorAll('.spotlight-item');
            if (e.key === 'ArrowDown') {
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items);
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(items);
                e.preventDefault();
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                items[selectedIndex].click();
            }
        };

        const updateSelection = (items) => {
            items.forEach((item, idx) => {
                item.style.background = idx === selectedIndex ? 'rgba(21, 101, 192, 0.3)' : '';
                if (idx === selectedIndex) item.scrollIntoView({ block: 'nearest' });
            });
        };

        input.oninput = () => {
            const query = input.value.toLowerCase().trim();
            const items = getItems();
            selectedIndex = -1; 
            
            if (!query) {
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
            renderResults(getItems()); 
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
            padding: 8px 16px; border-radius: 40px; font-family: 'Inter', sans-serif;
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
                margin: 15px; padding: 15px; background: white;
                border-radius: 8px; border: 1px solid #e0e0e0;
                font-family: 'Inter', sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                position: relative; z-index: 10;
            `;
            list.insertBefore(card, list.firstChild);
        }

        // Gather Stats accurately from the sidebar elements
        const subItems = Array.from(document.querySelectorAll('.units__subitems'));
        let v_total = 0, v_done = 0;
        let g_total = 0, g_done = 0;
        let r_total = 0, r_done = 0;
        let q_total = 0, q_done = 0;
        
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
                v_total++;
                if (isDone) v_done++;
            } else if (isGrPA) {
                r_total++;
                if (isDone) r_done++;
            } else if (isQuiz) {
                if (isNote) return; 
                q_total++;
                if (isDone) q_done++;
            } else if (isGraded) {
                g_total++;
                if (isDone) g_done++;
            }
        });

        const done = g_done + r_done + q_done;
        const total = g_total + r_total + q_total;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        // Only update if content changed or if it was 0/0
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:800; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#666;">Course Progress</span>
                <span style="font-weight:900; color:#1e88e5; font-size:12px;">${percent}%</span>
            </div>
            <div style="width:100%; height:8px; background:#eee; border-radius:4px; margin-bottom:12px; overflow:hidden;">
                <div style="width:${percent}%; height:100%; background:#1e88e5; border-radius:4px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:9px; font-weight:700; color:#444;">
                <div style="display:flex; align-items:center; gap:4px;"><span style="filter:grayscale(0.6);">🎬</span> Videos: ${v_done}/${v_total}</div>
                <div style="display:flex; align-items:center; gap:4px;"><span style="filter:grayscale(0.6);">📝</span> Graded: ${g_done}/${g_total}</div>
                <div style="display:flex; align-items:center; gap:4px;"><span style="color:#9c27b0;">💻</span> GrPA: ${r_done}/${r_total}</div>
                <div style="display:flex; align-items:center; gap:4px;"><span style="color:#ef6c00;">🏆</span> Quizzes: ${q_done}/${q_total || 1}</div>
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

})();
