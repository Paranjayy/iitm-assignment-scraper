(function() {
    console.log('IITM Explorer: Enhancing Productivity...');

    const body = document.body;
    let activeFilter = 'all';
    let isTimerDismissed = false; 
    const selectedItems = new Set(); // Persistent selection storage
    let includeAssets = localStorage.getItem('iitm-include-assets') !== 'false';
    let spotlightInitialized = false;
    let collapsedGroups = new Set(JSON.parse(localStorage.getItem('iitm-collapsed-groups') || '[]'));

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

        // Copy to clipboard with synchronous fallback
        try {
            // Primary Async modern method
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
            console.warn('Clipboard primary async fail, attempting synchronous execCommand...', err);
            try {
                const ta = document.createElement('textarea');
                ta.value = md;
                ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                if (btn) btn.innerHTML = '<span style="font-size:10px;color:#4caf50;">Copied!</span>';
            } catch (fallbackErr) {
                console.error('Clipboard completely blocked:', fallbackErr);
            }
        }
        
        setTimeout(() => { if(btn) btn.innerHTML = originalText; }, 2000);

        const prompt = `I have copied the contents of an IIT Madras Online Degree lesson/assignment/code to my clipboard. 
        Please analyze the content, explain any complex concepts, and help me understand the key takeaways. 
        If it's a programming assignment, explain the logic and edge cases without just giving the solution.
        I will paste the content below:`;

        const urls = {
            chatgpt: `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
            claude: `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
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
        let subItems = [];
        const zip = typeof JSZip !== 'undefined' ? new JSZip() : null;
        
        // Force-expand all weeks to ensure items are rendered in DOM
        const weeks = document.querySelectorAll('.units__section');
        for (const week of weeks) {
            const isExpanded = week.querySelector('.units__subitems'); // If subitems exist, it's probably expanded
            const header = week.querySelector('.units__section-title') || week.querySelector('mat-panel-header');
            if (!isExpanded && header) {
                console.log('📂 Expanding week:', header.innerText.trim());
                header.click();
                await new Promise(r => setTimeout(r, 600)); // Wait for expansion animation
            }
        }

        if (selectedItems.size > 0) {
            subItems = Array.from(document.querySelectorAll('.units__subitems')).filter(item => {
                const titleNode = item.querySelector('.unit__item-title');
                const title = titleNode ? titleNode.textContent.trim() : item.innerText.split('\n')[0].trim();
                const isMatched = selectedItems.has(title);
                if (isMatched) console.log(`🎯 Bulk Scraper: Matched selected item "${title}"`);
                return isMatched;
            });
            console.log(`📦 Bulk Scraper: Starting capture for ${subItems.length} selected items.`);
        }

        if (subItems.length === 0) {
            subItems = Array.from(document.querySelectorAll('.units__subitems'));
        }

        if (subItems.length === 0) {
            return alert('No items found. Please expand the weeks in the sidebar first.');
        }
        
        const count = subItems.length;
        if (!confirm(`This will scrape ${count} units and bundle them into a ZIP. Proceed?`)) return;

        const overlay = document.createElement('div');
        overlay.id = 'iitm-bulk-overlay';
        overlay.style.cssText = `
            position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
            width: 450px; background: rgba(18,18,18,0.95); color: white; z-index: 20000;
            padding: 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
            display: flex; flex-direction: column; align-items: center;
            box-shadow: 0 20px 80px rgba(0,0,0,0.8);
            font-family: system-ui, sans-serif;
            animation: slideUp 0.4s ease;
            backdrop-filter: blur(10px);
        `;
        overlay.innerHTML = `
            <div style="font-size: 20px; font-weight: 800; margin-bottom: 15px; color: #db2777; width: 100%; text-align: left; display: flex; align-items: center; gap: 10px;">
                <span>📦</span> Building Course ZIP
            </div>
            <div id="bulk-progress-text" style="font-size: 13px; opacity: 0.7; margin-bottom: 20px; width: 100%; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Initializing sequencer...</div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px;">
                <div id="bulk-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #db2777, #7e22ce); transition: 0.5s;"></div>
            </div>
            <div id="bulk-eta" style="font-size: 10px; color: #444; width: 100%; text-align: right; margin-bottom: 20px; font-weight: 700;">ETA: Calculating...</div>
            <div style="display:flex; gap:10px; width:100%;">
                <button id="finish-bulk-btn" style="flex:1; background: #db2777; border: none; color: white; padding: 10px; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 12px; transition: 0.2s;">Stop & Download</button>
                <button id="cancel-bulk-btn" style="flex:1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px; border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 12px; transition: 0.2s;">Cancel Scrape</button>
            </div>
        `;
        document.body.appendChild(overlay);

        let cancelled = false;
        let forceFinish = false;
        document.getElementById('cancel-bulk-btn').onclick = () => { cancelled = true; overlay.remove(); };
        document.getElementById('finish-bulk-btn').onclick = () => { forceFinish = true; };

        const progressText = document.getElementById('bulk-progress-text');
        const progressBar = document.getElementById('bulk-progress-bar');
        const etaText = document.getElementById('bulk-eta');
        let masterAssetMarkdown = `# 📦 Master Asset Links Backup\n\n*This file contains direct links to all scraped PDF resources, Images, and Video Lectures for offline reference.*\n\n`;
        let hasAnyAssets = false;
        let masterVideoList = `### 🎥 Consolidated Video Playlist\n\n`;
        let hasVideos = false;

        const processedDurations = [];
        const startTimeTotal = Date.now();
        let totalCountProcessed = 0;
        for (let i = 0; i < subItems.length; i++) {
            if (cancelled || forceFinish) break;
            const itemData = subItems[i];
            const item = itemData.el || itemData; // Handle both metadata objects or raw DOM
            const title = itemData.text || item.innerText.split('\n')[0].trim();
            const breadcrumb = itemData.breadcrumb || '';
            
            const isProgramming = (itemData.isProgramming !== undefined) ? itemData.isProgramming : (item.innerText.toLowerCase().includes('programming') || item.innerText.toLowerCase().includes('grpa'));
            const startTimeItem = Date.now();
            
            // SMART ETA: Start with 25/10 baseline, then use moving average of actual capture times
            const remaining = count - i;
            let avgDuration = isProgramming ? 25 : 10;
            if (processedDurations.length > 0) {
                const total = processedDurations.reduce((a, b) => a + b, 0);
                avgDuration = total / processedDurations.length;
            }
            
            const etaSeconds = Math.ceil(remaining * avgDuration); 
            const mins = Math.floor(etaSeconds / 60);
            const secs = etaSeconds % 60;
            
            progressText.innerText = `Scraping: ${title} (${i+1}/${count})`;
            progressBar.style.width = `${((i + 1) / count) * 100}%`;
            etaText.innerText = `ETA: ~${mins > 0 ? mins + 'm ' : ''}${secs}s remaining`;
            
            console.log(`🚀 [${i+1}/${count}] Beginning ${isProgramming ? 'GrPA' : 'Standard'} Capture: ${title}`);
            item.click(); 
            
            // Wait for sidebar title to match selection (Verifies navigation)
            let navigated = false;
            for (let navW = 0; navW < 30; navW++) {
                const currentPortalTitle = (document.querySelector('.assignment-title, .title-container, .modules__content-head-title h2')?.innerText || '').trim();
                // A lax check to see if the title changed or is at least visible
                if (currentPortalTitle && (currentPortalTitle.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(currentPortalTitle.toLowerCase()))) {
                    navigated = true;
                    // Add an extra small layout breather for stability
                    await new Promise(r => setTimeout(r, 600));
                    break;
                }
                await new Promise(r => setTimeout(r, 250));
            }
            if (!navigated) console.warn(`⚠️ [${i+1}] Navigation timer long for "${title}". Proceeding anyway...`);

            const capturedData = await new Promise((resolve) => {
                const handler = (e) => {
                    window.removeEventListener('iitm-markdown-captured', handler);
                    resolve(e.detail);
                };
                window.addEventListener('iitm-markdown-captured', handler);
                window.__scraperMode = 'capture';
                // Trigger actual capture message with real sidebar title
                chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'capture', title: title });
                
                setTimeout(() => {
                    window.removeEventListener('iitm-markdown-captured', handler);
                    resolve(null);
                }, 40000); // 40s timeout for slow IITM servers
            });

            const durationItem = (Date.now() - startTimeItem) / 1000;
            processedDurations.push(durationItem);
            console.log(`✅ [${i+1}] Captured in ${durationItem.toFixed(1)}s`);
            
            if (zip && capturedData?.markdown) {
                totalCountProcessed++;
                const courseFolder = zip.folder((capturedData.course || 'Course').replace(/[^\w\s-]/g, '').trim());
                
                // Smart filename: Prepend week name from captured metadata for better organization
                const weekForFile = capturedData.week || breadcrumb || '';
                const baseTitle = capturedData.title || title;
                const cleanWeek = weekForFile.replace(/[^\w\s-]/g, '').trim();
                
                // Avoid redundant week prefix if title already contains it
                const needsWeekPrefix = cleanWeek && !baseTitle.toLowerCase().includes(cleanWeek.toLowerCase());
                const weekPrefix = needsWeekPrefix ? `${cleanWeek} - ` : '';
                
                let fullFileName = `${capturedData.course || 'Course'} - ${weekPrefix}${baseTitle}.md`.replace(/[^\w\s\.-]/g, '');
                
                // ZIP Time Fix: Set current date to avoid epoch (1970) artifacts on extraction
                courseFolder.file(fullFileName, capturedData.markdown, { date: new Date() });
                
                if (includeAssets && capturedData.resources && capturedData.resources.length > 0) {
                    hasAnyAssets = true;
                    masterAssetMarkdown += `## ${fullFileName.replace('.md', '')}\n`;
                    const resFolder = courseFolder.folder(`Resources/${(capturedData.title || title).replace(/[^\w\s-]/g, '').trim()}`);
                    for (const res of capturedData.resources) {
                        try {
                            const resBlob = res.blob || await fetch(res.url).then(r => r.blob());
                            let filename = res.title;
                            if (!res.blob) filename = res.title.replace(/[^\w\s\.]/g, '') + '.pdf';
                            resFolder.file(filename, resBlob, { date: new Date() });
                            masterAssetMarkdown += `- **${filename}**: ${res.url ? `[Original Cloud Source](${res.url})` : '*[Local Image Extracted]*'}\n`;
                        } catch (e) {
                            console.error('Resource fetch failed:', res.url);
                        }
                    }
                    masterAssetMarkdown += `\n`;
                }

                if (capturedData.videos && capturedData.videos.length > 0) {
                    hasVideos = true;
                    capturedData.videos.forEach(v => {
                        masterVideoList += `- **${v.title}**: [Watch on YouTube](${v.url})\n`;
                    });
                }
                console.log(`✅ [${i+1}] Capture SUCCESS: "${fullFileName}" (${durationItem}s).`);
            } else {
                console.error(`❌ [${i+1}] Capture FAILED: "${title}" after ${durationItem}s. Skipping to next.`);
            }
        }
        
        const totalDuration = ((Date.now() - startTimeTotal) / 1000).toFixed(1);
        console.log(`🏁 BULK COMPLETED: Processed ${totalCountProcessed}/${count} items in ${totalDuration}s.`);
        
        if (hasVideos) {
            masterAssetMarkdown += `\n---\n\n` + masterVideoList;
        }
        
        if (hasAnyAssets || hasVideos) {
            zip.file('Asset_Links_Backup.md', masterAssetMarkdown);
        }

        if (!cancelled && zip && Object.keys(zip.files).length > 0) {
            const files = Object.keys(zip.files).filter(k => !zip.files[k].dir);
            console.log(`📦 Bulk Scraper: Finalizing ${files.length} items for bundle...`);

            if (files.length <= 10) {
                // SMALL BATCH: Direct in-page ZIP generation (High Reliability)
                progressText.innerText = "Generating ZIP bundle in-page...";
                try {
                    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
                    const url = URL.createObjectURL(content);
                    const a = document.createElement('a');
                    const zipName = `IITM_Course_ZIP_${Date.now()}.zip`;
                    a.href = url;
                    a.download = zipName;
                    document.body.appendChild(a);
                    a.click();
                    console.log('✅ ZIP Download Triggered:', zipName);
                    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 15000);
                    overlay.innerHTML = `<div style="font-size: 32px; font-weight: 800; color: #4caf50;">✅ DONE!</div><div style="margin-top:20px; opacity:0.6;">${files.length} items saved.</div>`;
                } catch (err) {
                    console.error('❌ In-page ZIP generation failed:', err);
                    progressText.innerText = "Error building ZIP. Try smaller batch.";
                }
            } else {
                // LARGE BATCH: Offscreen relay to prevent UI freezing
                progressText.innerText = "Stabilizing & Finalizing ZIP (Offscreen)...";
                const zipFiles = [];
                for (const name in zip.files) {
                    const file = zip.files[name];
                    if (!file.dir) {
                        const ext = name.split('.').pop().toLowerCase();
                        const isBinary = ['png', 'jpg', 'jpeg', 'pdf', 'gif', 'webp'].includes(ext);
                        const content = await file.async(isBinary ? "base64" : "string");
                        zipFiles.push({ name, content, isBinary });
                    }
                }
                
                chrome.runtime.sendMessage({ 
                    action: 'generateZip', 
                    data: { files: zipFiles, zipName: `IITM_Course_ZIP_${Date.now()}.zip` } 
                });
                overlay.innerHTML = `<div style="font-size: 32px; font-weight: 800; color: #4caf50;">✅ DONE!</div><div style="margin-top:20px; opacity:0.6;">Large bundle relay started. Check downloads.</div>`;
            }
            setTimeout(() => { if (document.body.contains(overlay)) overlay.remove(); }, 4000);
        } else {
            console.warn('⚠️ Bulk Scraper: No files to zip or cancelled.');
            overlay.remove();
        }
        selectedItems.clear();
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

        if (location.href.includes('/courses/')) {
            sidebarClosedThisSession = true;

            // Wait an absolute fixed 4 seconds to guarantee Angular downloads/hydrates all the sidebar text strings before caching
            setTimeout(() => {
                if (typeof window.__iitm_get_items === 'function') window.__iitm_get_items();
                
                // Desktop Sidebar
                const leftToggle = document.querySelector('.hide-outline-btn, .modules__content-head-menu');
                const isCollapsed = document.querySelector('.hide-outline-btn')?.innerHTML?.includes('rotate(180deg)');
                if (leftToggle && !isCollapsed && !isSpotlightOpen) leftToggle.click();
                
                // Mobile Sidebar
                const sidenav = document.querySelector('mat-sidenav');
                if (sidenav && (sidenav.classList.contains('mat-drawer-opened') || sidenav.getAttribute('opened') === 'true' || sidenav.offsetWidth > 100)) {
                    const mobileToggle = document.querySelector('.mobile-menu button, .header button[aria-label="Menu"], app-button.mobile-menu button');
                    if (mobileToggle && !isSpotlightOpen) mobileToggle.click();
                }
            }, 4000);
        }
        autoCloseAttempts++;
    };

    const setupSpotlightListeners = () => {
        if (spotlightInitialized) return;
        
        document.addEventListener('keydown', (e) => {
            const spotlight = document.getElementById('iitm-spotlight');
            if (!spotlight) return;

            const isTrigger = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
            const isAction = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j';

            if (isTrigger) {
                e.preventDefault();
                isSpotlightOpen = !isSpotlightOpen;
                spotlight.style.display = isSpotlightOpen ? 'flex' : 'none';
                if (isSpotlightOpen) {
                    const input = document.getElementById('spotlight-input');
                    if (input) {
                        input.value = '';
                        input.focus();
                        input.oninput();
                    }
                }
            } else if (isAction && e.isTrusted) {
                // Cmd+J: Trigger Action Mode directly (even if closed)
                e.preventDefault();
                
                // Open spotlight if it's not open already
                if (!isSpotlightOpen) {
                    isSpotlightOpen = true;
                    spotlight.style.display = 'flex';
                    const input = document.getElementById('spotlight-input');
                    if (input) {
                        input.value = '';
                        input.focus();
                        input.oninput();
                    }
                }
                
                const existing = document.getElementById('spotlight-action-submenu');
                if (existing) existing.remove();
                else if (typeof showActionSubmenu === 'function') {
                    showActionSubmenu(null);
                }
            }
            
            if (e.key === 'Escape') {
                isSpotlightOpen = false;
                spotlight.style.display = 'none';
            }
        }, true); // Use capture phase to beat browser defaults
        spotlightInitialized = true;


        document.addEventListener('mousedown', (e) => {
            const spotlight = document.getElementById('iitm-spotlight');
            if (spotlight && spotlight.style.display === 'flex') {
                const box = spotlight.querySelector('.spotlight-box');
                
                // CRITICAL: If an element is removed from DOM during click (re-render), 
                // isConnected will be false but we still want to count it as "inside".
                const isClickInside = box && (box.contains(e.target) || !e.target.isConnected);
                
                // IGNORE clicks from search toggle AND sidebar toggle (prevents auto-close bug)
                const isHeaderBtn = !!e.target.closest('#iitm-header-search');
                const isSidebarBtn = !!e.target.closest('.mobile-menu button, .header button[aria-label="Menu"], app-button.mobile-menu button');
                
                if (!isClickInside && !isHeaderBtn && !isSidebarBtn && e.target.isConnected) {
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
        
        btn.onclick = () => {
             isSpotlightOpen = true;
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
                <button id="unlock-code-btn" style="margin-right: 8px; background: #c2185b; border-radius:4px; border:none; color:white; padding:4px 8px; font-size:12px; cursor:pointer;" title="Unlock Native Copy/Paste/Right-Click">🔓 Unlock</button>
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
    addGlobalListener('click', '#unlock-code-btn', () => {
        // Broadcast message to background.js to execute the brutal unlock script inside the MAIN world
        chrome.runtime.sendMessage({ action: 'unlockPage' });
        const btn = document.getElementById('unlock-code-btn');
        if (btn) {
            btn.innerHTML = '✅ Freedom!';
            btn.style.background = '#388E3C';
        }
    });

    // 2. SPOTLIGHT SEARCH (Cmd+K)
    let indexedTranscripts = [];
    const injectSpotlight = () => {
        if (document.getElementById('iitm-spotlight')) return;
        
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local) {
                chrome.storage.local.get(['iitm_transcripts'], (res) => {
                    if (chrome.runtime?.id) indexedTranscripts = res.iitm_transcripts || [];
                });
            }
        } catch (e) {
            // Context invalidated or storage unavailable during reload
        }

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
            #iitm-spotlight {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.1); z-index: 100000;
                display: none; align-items: flex-start; justify-content: center; padding-top: 10vh;
                backdrop-filter: none !important;
            }
            #iitm-spotlight .spotlight-box {
                width: 680px;
                height: 600px;
                max-height: 85vh;
                background: #121212;
                color: #fff;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 40px 120px rgba(0,0,0,0.8);
                font-family: 'Inter', -apple-system, system-ui, sans-serif;
                animation: zoomIn 0.2s cubic-bezier(0.19, 1, 0.22, 1);
            }
            #spotlight-results { 
                flex: 1; 
                overflow-y: auto; 
                overflow-x: hidden;
                scrollbar-width: thin; 
                scrollbar-color: rgba(255,255,255,0.1) transparent; 
                min-height: 0; 
                pointer-events: auto !important; 
            }
            .spotlight-item { 
                padding: 14px 25px; color: #aaa; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); 
                display: flex; justify-content: space-between; gap: 20px; transition: 0.1s;
                align-items: center; border-left: 5px solid transparent; flex-shrink: 0;
            }
            .spotlight-item.active { 
                background: rgba(219, 39, 119, 0.2) !important; 
                color: #fff !important; 
                border-left-color: #db2777 !important;
                box-shadow: inset 10px 0 30px rgba(219,39,119,0.25);
            }
            .group-header {
                padding: 15px 25px 8px 25px; font-size: 10px; font-weight: 900; color: #666;
                text-transform: uppercase; letter-spacing: 1.5px; background: #1a1a1a;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.04);
                position: sticky; top: 0; z-index: 10;
            }
            .spotlight-footer {
                padding: 15px 25px; 
                border-top: 1px solid rgba(255,255,255,0.1); 
                font-size: 11px; color: #888; 
                display: flex; justify-content: space-between; align-items: center; 
                background: #0f0f0f; 
                flex-shrink: 0;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.4);
            }
            .spotlight-item:hover { background: rgba(255, 255, 255, 0.03); }
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
            @keyframes zoomIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        `;

        const spotlightEl = document.getElementById('iitm-spotlight');
        if (spotlightEl) {
            spotlightEl.style.display = isSpotlightOpen ? 'flex' : 'none';
            return;
        }

        const spotlight = document.createElement('div');
        spotlight.id = 'iitm-spotlight';
        spotlight.style.display = 'none'; 
        spotlight.innerHTML = `
            <div class="spotlight-box">
                <div id="spotlight-main" style="display: flex; flex-direction: column; height: 100%;">
                    <div style="padding: 20px 30px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 15px;">
                        <svg viewBox="0 0 24 24" width="20" height="20" style="color: #666;"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <div style="display:flex; flex-direction:column; flex:1;">
                            <div style="font-size: 10px; font-weight: 800; color: #db2777; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 2px; opacity: 0.8;">IITM Spotlight</div>
                            <input type="text" id="spotlight-input" placeholder="Search for commands and course units..." autocomplete="off" spellcheck="false" style="background: none; border: none; color: #fff; font-size: 16px; outline: none; width: 100%; font-family: inherit;">
                        </div>
                    </div>
                    <div class="spotlight-filters" style="padding: 12px 25px; gap: 8px; display: flex; flex-wrap: nowrap; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;">
                        <div class="filter-chip active" data-filter="all">All</div>
                        <div class="filter-chip" data-filter="video">Videos</div>
                        <div class="filter-chip" data-filter="graded">Graded</div>
                        <div class="filter-chip" data-filter="grpa">GrPA</div>
                        <div class="filter-chip" data-filter="pending" style="border-color: rgba(244, 67, 54, 0.4); color: #f44336; background: rgba(244, 67, 54, 0.05);">Pending</div>
                        <div class="filter-chip" data-filter="assets">Assets</div>
                        <div class="filter-chip" data-filter="command">Commands</div>
                        <div class="filter-chip" data-filter="selected">Selected</div>
                    </div>
                    <div id="spotlight-results"></div>
                    <div class="spotlight-footer">
                        <div id="selection-counter" style="color:#db2777; font-weight:800; font-family: 'JetBrains Mono', monospace;"></div>
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <div id="footer-open-btn" style="display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;">
                                <span style="opacity: 0.8; font-weight: 600;">Open</span> <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #ccc; border: 1px solid rgba(255,255,255,0.1);">↵</span>
                            </div>
                            <div id="footer-actions-btn" style="display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s;">
                                <span style="opacity: 0.8; font-weight: 600;">Actions</span>
                                <span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #ccc; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.4);">⌘ J</span>
                                <span id="footer-assets-status" style="margin-left:5px; font-size:9px; color:#db2777; font-weight:900;">(${includeAssets ? 'ASSETS ON' : 'ASSETS OFF'})</span>
                            </div>
                            <div id="asset-indicator" style="display: ${includeAssets ? 'flex' : 'none'}; align-items: center; gap: 6px; background: rgba(219,39,119,0.1); padding: 4px 10px; border-radius: 20px; color: #db2777; font-weight: 800; font-size: 9px; animation: pulse 2s infinite;">
                                <span style="width: 6px; height: 6px; background: #db2777; border-radius: 50%;"></span>
                                ASSETS ACTIVE
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(spotlight);

        const input = document.getElementById('spotlight-input');
        const results = document.getElementById('spotlight-results');

        const assetBtn = document.getElementById('asset-toggle-btn');
        if (assetBtn) {
            assetBtn.onclick = () => {
                includeAssets = !includeAssets;
                localStorage.setItem('iitm-include-assets', includeAssets);
                assetBtn.classList.toggle('active', includeAssets);
                assetBtn.innerText = `📦 Assets: ${includeAssets ? 'ON' : 'OFF'}`;
                const indicator = document.getElementById('asset-indicator');
                if (indicator) indicator.style.display = includeAssets ? 'flex' : 'none';
                input.oninput(null, true);
            };
        }

        const footerActions = document.getElementById('footer-actions-btn');
        const openBtn = document.getElementById('footer-open-btn');
        if (openBtn) {
            openBtn.onmousedown = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (selectedIndex >= 0 && currentMatches[selectedIndex]) {
                    triggerSelection(currentMatches[selectedIndex], null);
                }
            };
        }
        if (footerActions) {
            footerActions.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const existing = document.getElementById('spotlight-action-submenu');
                if (existing) existing.remove();
                else {
                    const input = document.getElementById('spotlight-input');
                    showActionSubmenu(null);
                }
            };
        }

        let lastSelectedIndex = -1; // For Shift+Click selection

        const triggerSelection = (item, event = null) => {
            if (!item) return;

            // Handle Shift+Click range selection
            if (event && event.shiftKey && lastSelectedIndex >= 0) {
                const currentIndex = currentMatches.indexOf(item);
                if (currentIndex >= 0) {
                    const [start, end] = [Math.min(lastSelectedIndex, currentIndex), Math.max(lastSelectedIndex, currentIndex)];
                    // Decide whether to select or deselect based on the FIRST item in range's toggle state? 
                    // Usually, Shift-click ADDS to selection if the range wasn't selected, or preserves state.
                    // Implementation: Toggle ALL items in range to the state of the TARGET item's toggle.
                    const targetState = !selectedItems.has(item.text);
                    for (let r = start; r <= end; r++) {
                        const rItem = currentMatches[r];
                        if (rItem && !rItem.actionId && !rItem.url) { // Only select actual assignment items
                            if (targetState) selectedItems.add(rItem.text);
                            else selectedItems.delete(rItem.text);
                        }
                    }
                    localStorage.setItem('iitm-selected-items', JSON.stringify(Array.from(selectedItems)));
                    renderResults(items, true);
                    return;
                }
            }

            if (item.actionId) {
                if (item.actionId === 'toggleAssets') {
                    includeAssets = !includeAssets;
                    localStorage.setItem('iitm-include-assets', includeAssets);
                    const indicator = document.getElementById('asset-indicator');
                    if (indicator) indicator.style.display = includeAssets ? 'flex' : 'none';
                    const status = document.getElementById('footer-assets-status');
                    if (status) status.innerText = `(${includeAssets ? 'ASSETS ON' : 'ASSETS OFF'})`;
                    input.oninput(null, true);
                } else if (item.actionId === 'reloadExtension') {
                    spotlight.style.display = 'none';
                    chrome.runtime.sendMessage({ action: 'reloadExtension' });
                } else if (item.actionId.includes('explain')) {
                    spotlight.style.display = 'none';
                    openInAI(item.actionId.replace('explain', '').toLowerCase());
                } else {
                    spotlight.style.display = 'none';
                    handleUIToggle(item.actionId);
                }
            } else {
                // If the click happened on an item (NOT an action), toggle its selection
                if (selectedItems.has(item.text)) selectedItems.delete(item.text);
                else selectedItems.add(item.text);
                
                lastSelectedIndex = currentMatches.indexOf(item);
                localStorage.setItem('iitm-selected-items', JSON.stringify(Array.from(selectedItems)));
                renderResults(items, true);

                // Option: If NOT clicking a checkbox/meta area, just navigate? 
                // User's request suggests they WANT selection for bulk, so we toggle.
                // But if they press ENTER (no event), we navigate.
                if (!event) {
                    spotlight.style.display = 'none';
                    if (item.el) (item.el.closest('button') || item.el).click();
                    else if (item.url) window.location.href = item.url;
                }
            }
        };

        const updatePreview = (item) => {
            // Preview removed as per user request
        };

        const renderResults = (items, preserveSelection = false) => {
            const counter = document.getElementById('selection-counter');
            if (counter) counter.innerText = selectedItems.size > 0 ? `📦 ${selectedItems.size} Selected` : '';
            
            const q = input.value.toLowerCase().trim();
            results.innerHTML = '';
            
            // GROUPING DATA
            const groupMap = {
                'SYSTEM COMMANDS': [],
                'PROGRAMMING EXAMS (OPPE/NPPE)': [],
                'LECTURE VIDEOS': [],
                'PROGRAMMING ASSIGNMENTS': [],
                'GRADED ASSIGNMENTS': [],
                'GRADED QUIZZES': [],
                'COURSE OUTLINE': []
            };
            
            items.forEach(item => {
                const q = input.value.toLowerCase().trim();
                const tag = (item.typeLabel || '').toLowerCase();
                const text = (item.text || '').toLowerCase();
                const bread = (item.breadcrumb || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                
                const matchesSearch = text.includes(q) || bread.includes(q) || desc.includes(q) || tag.includes(q);
                if (q && !matchesSearch) return;

                const isNote = text.includes('practice') || text.includes('not graded') || text.includes('non-graded') || text.includes('mock') || text.includes('ungraded');
                const isExam = (text.includes('oppe') || text.includes('nppe') || bread.includes('oppe') || bread.includes('nppe')) && !isNote;
                const isProgrammingFlag = item.isProgramming || text.includes('programming') || tag.includes('grpa');
                const isGrPA_Explicit = isProgrammingFlag && (item.isGraded || text.includes('graded') || tag.includes('grpa') || desc.includes('graded'));
                const isGrPA = isGrPA_Explicit && !isExam && !isNote; 
                const isQuiz = (tag.includes('quiz') || text.includes('quiz')) && !isGrPA && !isExam && !isNote;
                const isGraded = (item.isGraded || tag.includes('graded') || text.includes('graded assignment') || desc.includes('graded')) && !isProgrammingFlag && !isGrPA && !isExam && !isNote && !isQuiz;

                let matchesFilter = true;
                if (activeFilter !== 'all') {
                    if (activeFilter === 'video') matchesFilter = tag.includes('video') && !isNote;
                    else if (activeFilter === 'graded') matchesFilter = isGraded;
                    else if (activeFilter === 'grpa') matchesFilter = isGrPA;
                    else if (activeFilter === 'assets') matchesFilter = item.hasAssets;
                    else if (activeFilter === 'command') matchesFilter = item.actionId || bread.includes('system');
                    else if (activeFilter === 'pending') matchesFilter = (isGraded || isGrPA || isQuiz || isExam) && !item.isDone;
                    else matchesFilter = false;
                }
                
                if (matchesFilter) {
                   let group = 'COURSE OUTLINE';
                   if (item.actionId || bread.includes('system')) group = 'SYSTEM COMMANDS';
                   else if (isExam) group = 'PROGRAMMING EXAMS (OPPE/NPPE)';
                   else if (tag.includes('video') && !isNote) group = 'LECTURE VIDEOS';
                   else if (isGrPA) group = 'PROGRAMMING ASSIGNMENTS';
                   else if (isQuiz) group = 'GRADED QUIZZES';
                   else if (isGraded) group = 'GRADED ASSIGNMENTS';
                   
                   groupMap[group] = groupMap[group] || [];
                   groupMap[group].push(item);
                }
            });

            currentMatches = [];
            Object.keys(groupMap).forEach(groupName => {
                const groupItems = groupMap[groupName];
                if (groupItems.length === 0) return;

                const currentQuery = (input.value || '').toLowerCase().trim();
                let isCollapsed = collapsedGroups.has(groupName);
                
                // Only auto-expand if the query WAS empty and now isn't
                if (currentQuery.length > 0 && (!window.__iitm_prev_query || window.__iitm_prev_query === '')) {
                    isCollapsed = false;
                    collapsedGroups.delete(groupName);
                }
                window.__iitm_prev_query = currentQuery;
                
                const header = document.createElement('div');
                header.className = `group-header ${isCollapsed ? 'collapsed' : ''}`;
                header.style.cursor = 'pointer';
                header.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:8px; transition:0.2s; transform: rotate(${isCollapsed ? '-90deg' : '0deg'})">▼</span>
                        <span>${groupName}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${groupName !== 'SYSTEM COMMANDS' ? 
                          `<span class="group-select-btn" style="font-size:8px; padding:2px 8px; background:rgba(219,39,119,0.1); color:#db2777; border-radius:10px; font-weight:900;">SELECT GROUP</span>` 
                          : ''}
                        <span style="opacity:0.8; font-weight:800; color:#fff; font-size:10px;">${groupItems.length}</span>
                    </div>
                `;
                
                header.onmousedown = (e) => {
                    const selectBtn = e.target.closest('.group-select-btn');
                    if (selectBtn) {
                        e.preventDefault();
                        e.stopPropagation();
                        const allNames = groupItems.map(gi => gi.text);
                        const allInGroupSelected = allNames.every(name => selectedItems.has(name));
                        if (allInGroupSelected) allNames.forEach(name => selectedItems.delete(name));
                        else allNames.forEach(name => selectedItems.add(name));
                        localStorage.setItem('iitm-selected-items', JSON.stringify(Array.from(selectedItems)));
                        renderResults(items, true);
                        return;
                    }
                    if (collapsedGroups.has(groupName)) collapsedGroups.delete(groupName);
                    else collapsedGroups.add(groupName);
                    localStorage.setItem('iitm-collapsed-groups', JSON.stringify(Array.from(collapsedGroups)));
                    renderResults(items, true);
                };
                results.appendChild(header);

                if (!isCollapsed) {
                    groupItems.forEach(item => {
                        currentMatches.push(item);
                        const isSelectedStored = selectedItems.has(item.text);
                        const div = document.createElement('div');
                        const isCurrentlySelected = selectedIndex >= 0 && currentMatches.length - 1 === selectedIndex;
                        div.className = `spotlight-item ${isCurrentlySelected ? 'active' : ''}`;
                        
                        div.innerHTML = `
                            <div style="flex: 1;">
                                <div class="breadcrumb" style="font-size: 9px; opacity: 0.5; margin-bottom: 2px;">${item.breadcrumb || 'Course'}</div>
                                <div class="title" style="color: ${isSelectedStored ? '#db2777' : '#eee'}; font-weight: ${isSelectedStored ? '800' : '500'}; font-size: 14px;">
                                    ${isSelectedStored ? '✨ ' : ''}${item.text}
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${isSelectedStored ? '<span style="font-size:9px; color:#db2777; font-weight:900; background:rgba(219,39,119,0.1); padding:2px 8px; border-radius:10px;">SELECTED</span>' : ''}
                                <div class="type" style="font-size: 9px; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.05); color: #888; border: 1px solid rgba(255,255,255,0.1); text-transform: uppercase; font-weight: 800;">${item.typeLabel}</div>
                            </div>
                        `;

                        div.onmousedown = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerSelection(item, e);
                        };
                        results.appendChild(div);
                    });
                }
            });

            if (!preserveSelection) selectedIndex = currentMatches.length > 0 ? 0 : -1;
            updateSelection(results.querySelectorAll('.spotlight-item'));
        };

        let cachedItems = null;

        const getItems = () => {
            // Sites uses Angular's units__items for weeks and unit__subitems for contents
            let headers = Array.from(document.querySelectorAll('.units__items'));
            // Refined fallback: Iterate sequentially to avoid double-counting nested Angular fragments
            if (headers.length === 0) headers = Array.from(document.querySelectorAll('.mat-expansion-panel'));
            if (headers.length === 0) headers = Array.from(document.querySelectorAll('app-course-unit-header'));
            
            // CACHE RESCUE: If the sidebar is closed, IITM destroys the syllabus DOM. 
            // We return the memory-cached items if no DOM headers are present.
            if (headers.length === 0 && cachedItems && cachedItems.length > 50) {
                return cachedItems;
            }

            const allItems = [];
            
            headers.forEach(weekEl => {
                const weekTitle = (
                    weekEl.querySelector('.units__items-title span')?.innerText.trim() || 
                    weekEl.querySelector('.units__items-title')?.innerText.trim() || 
                    weekEl.querySelector('.mat-expansion-panel-header-title')?.innerText.trim() || 
                    weekEl.querySelector('mat-panel-title')?.innerText.trim() || 
                    'General'
                ).split('\n')[0].trim();
                
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
                    const subText = sub.innerText.toLowerCase();
                    const subTagText = sub.querySelector('.units__subitems-videos')?.innerText.trim() || 'Lesson';
                    let isProgramming = subText.includes('programming assignment') || subText.includes('programming question') || subText.includes('grpa');
                    
                    let color = '#2e7d32';
                    let label = subTagText;
                    
                    if (subTagText.toLowerCase().includes('video') || titleText.startsWith('L') || titleText.toLowerCase().includes('lecture')) {
                        color = '#c62828';
                        label = 'Video';
                        isProgramming = false; // Prevent cross-pollution
                    } else if (isProgramming) {
                        color = '#6a1b9a';
                        label = 'GrPA';
                    } else if (subTagText.toLowerCase().includes('assignment') || titleText.toLowerCase().includes('assignment') || subText.includes('quiz')) {
                        color = '#ef6c00';
                        const isNotGraded = titleText.toLowerCase().includes('not graded') || titleText.toLowerCase().includes('un-graded') || titleText.toLowerCase().includes('practice');
                        label = isNotGraded ? 'Practice' : 'Graded';
                    }
                    
                    const hasAssets = !!(sub.querySelector('mat-icon') && subText.includes('resource')) || !!sub.querySelector('.units__subitems-resources') || (subText.includes('pdf') || subText.includes('slides'));
                    const isGraded_Explicit = label === 'Graded' || label === 'GrPA' || subText.includes('graded');
                    const isGraded = isGraded_Explicit && (!titleText.toLowerCase().includes('not graded') && !titleText.toLowerCase().includes('practice') && !titleText.toLowerCase().includes('mock') && !titleText.toLowerCase().includes('ungraded'));
                    
                    const isDone = !!(
                        sub.querySelector('.submitted-icon, .units__subitems-videos-done, mat-icon.done, .submitted, .units__subitems--completed, .completed') || 
                        sub.innerHTML.includes('done') ||
                        sub.innerHTML.includes('check_circle') ||
                        sub.querySelector('mat-icon[style*="rgb(46, 125, 50)"]') || 
                        sub.querySelector('mat-icon[style*="rgb(239, 108, 0)"]') ||
                        sub.querySelector('mat-icon[style*="rgb(103, 58, 183)"]') || 
                        sub.querySelector('.mat-icon-no-color.done') ||
                        sub.querySelector('.units__subitems--progress-icon.done')
                    );
                    
                    allItems.push({
                        text: titleText,
                        breadcrumb: weekTitle,
                        description: subText, // Include the gray subtitle for search
                        el: sub,
                        isSub: true,
                        typeLabel: label,
                        color: color,
                        hasAssets: hasAssets,
                        isProgramming: isProgramming,
                        isGraded: isGraded,
                        isDone: isDone
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
                { text: `📦 ${includeAssets ? 'DISABLE' : 'ENABLE'} Asset Scraper (PDFs/Resources)`, typeLabel: 'Action', el: null, action: 'toggleAssets' },
                { text: '📦 Bulk Export All Weeks (Export All)', typeLabel: 'Action', el: null, action: 'bulkExport' },
                { text: '🔄 RELOAD Extension (Developer)', typeLabel: 'Action', el: null, action: 'reloadExtension' }
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

            // ADD INDEXED TRANSCRIPTS TO SEARCH
            indexedTranscripts.forEach(t => {
                allItems.push({
                    text: `Deep: ${t.title}`,
                    breadcrumb: `Transcript: ${t.course}`,
                    el: null,
                    isSub: true,
                    typeLabel: 'Transcript',
                    color: '#00897b',
                    url: t.url,
                    searchText: t.text // Used for indexing but not displayed directly
                });
            });
            
            if (headers.length > 0) cachedItems = allItems;
            
            return allItems;
        };

        window.__iitm_get_items = getItems;

        // KEYBOARD NAVIGATION
        let selectedIndex = -1;
        let currentMatches = [];

        // GLOBAL SPOTLIGHT NAVIGATION (Works even when not focusing input specifically)
        spotlight.onkeydown = (e) => {
            const items = results.querySelectorAll('.spotlight-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + (e.altKey ? 5 : 1), items.length - 1);
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - (e.altKey ? 5 : 1), -1);
                updateSelection(items);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (selectedIndex >= 0) {
                    const itemData = currentMatches[selectedIndex];
                    if (itemData) {
                        if (selectedItems.has(itemData.text)) selectedItems.delete(itemData.text);
                        else selectedItems.add(itemData.text);
                        input.oninput(null, true);
                    }
                }
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                const itemData = currentMatches[selectedIndex];
                if (itemData) triggerSelection(itemData, null);
            } else if (e.key === 'j' && e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                
                const existing = document.getElementById('spotlight-action-submenu');
                if (existing) existing.remove();
                else showActionSubmenu(currentMatches[selectedIndex] || null);
            }
        };

        const showActionSubmenu = (item) => {
            const container = document.createElement('div');
            container.id = 'spotlight-action-submenu';
            container.style.cssText = `
                position: absolute; bottom: 65px; right: 25px; width: 260px;
                background: rgba(22, 22, 22, 0.98); border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px; box-shadow: 0 10px 50px rgba(0,0,0,0.9);
                display: flex; flex-direction: column; overflow: hidden; z-index: 10005;
                animation: slideUp 0.15s cubic-bezier(0.19, 1, 0.22, 1);
            `;
            
            let allActions = [
                { name: 'Bulk Export All Weeks', key: 'B', run: () => bulkScrapeAll(), global: true },
                { name: 'Export Course Syllabus', key: 'S', run: () => chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'exportSyllabus' }), global: true },
                { name: 'Deep Search Transcription', key: 'T', run: () => { input.value = 'transcript:'; input.focus(); }, global: true },
                { name: 'Toggle Assets Scraper', key: 'A', run: () => {
                    includeAssets = !includeAssets;
                    localStorage.setItem('iitm-include-assets', includeAssets);
                    const indicator = document.getElementById('asset-indicator');
                    if (indicator) indicator.style.display = includeAssets ? 'flex' : 'none';
                    const status = document.getElementById('footer-assets-status');
                    if (status) status.innerText = `(${includeAssets ? 'ASSETS ON' : 'ASSETS OFF'})`;
                    input.oninput(null, true);
                }, global: true },
                { name: 'Toggle Floating Buttons', key: 'F', run: () => {
                    const btns = document.getElementById('iitm-btn-container');
                    if (btns) btns.style.display = btns.style.display === 'none' ? 'flex' : 'none';
                }, global: true },
                { name: 'Toggle Dark Mode', key: 'D', run: () => (typeof toggleDarkMode === 'function') ? toggleDarkMode() : console.log('Dark mode toggle failed'), global: true },
                { name: 'Unlock Editor/Copy', key: 'U', run: () => {
                    document.oncontextmenu = null; document.onselectstart = null;
                    document.querySelectorAll('*').forEach(el => { el.style.userSelect = 'auto'; el.style.pointerEvents = 'auto'; });
                    showToast('Editor Unlocked');
                }, global: true },
                { name: 'AI Explain (ChatGPT)', key: 'C', run: () => window.dispatchEvent(new CustomEvent('iitm-trigger-ai', { detail: { service: 'chatgpt' } })), global: true },
                { name: 'AI Solve (Claude)', key: 'K', run: () => window.dispatchEvent(new CustomEvent('iitm-trigger-ai', { detail: { service: 'claude' } })), global: true },
                { name: 'AI Brainstorm (Gemini)', key: 'G', run: () => window.dispatchEvent(new CustomEvent('iitm-trigger-ai', { detail: { service: 'gemini' } })), global: true },
                { name: 'Sync Ace Editors', key: 'E', run: () => chrome.runtime.sendMessage({ action: 'syncAce' }), global: true },
                { name: 'Clear History', key: 'X', run: () => {
                   localStorage.removeItem('iitm_spotlight_history');
                   showToast('History Purged');
                }, global: true },
                { name: 'Reload Extension', key: 'R', run: () => {
                    spotlight.style.display = 'none';
                    chrome.runtime.sendMessage({ action: 'reloadExtension' });
                }, global: true }
            ];

            if (item) {
                allActions.unshift(
                    { name: `Open "${item.text.substring(0,20)}..."`, key: '↵', run: () => triggerSelection(item) },
                    { name: 'Toggle Selection', key: 'Tab', run: () => {
                        if (selectedItems.has(item.text)) selectedItems.delete(item.text);
                        else selectedItems.add(item.text);
                        input.oninput(null, true); 
                    } },
                    { name: 'Scrape Unit Only', key: 'S', run: () => {
                        if (item.el) (item.el.closest('button') || item.el).click();
                        setTimeout(() => chrome.runtime.sendMessage({ action: 'triggerScraper' }), 1000);
                    } }
                );
            }

            container.innerHTML = `
                <div style="padding:10px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05);">
                    <input type="text" id="action-search" placeholder="Search actions..." style="width:100%; background:none; border:none; color:#eee; font-size:11px; outline:none; height:20px;">
                </div>
                <div id="action-list" style="max-height: 300px; overflow-y: auto;"></div>
            `;
            
            const renderActions = (filter = '') => {
                const list = container.querySelector('#action-list');
                const filtered = allActions.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()));
                list.innerHTML = filtered.map((a, i) => `
                    <div class="action-item ${i === 0 ? 'selected' : ''}" data-index="${i}" style="padding:10px 15px; display:flex; justify-content:space-between; cursor:pointer; font-size:12px; border-bottom:1px solid rgba(255,255,255,0.03); ${i === 0 ? 'background:rgba(219,39,119,0.1);' : ''}">
                        <span style="color:#eee;">${a.name}</span>
                        <span style="color:#666; font-size:10px; font-weight:900;">${a.key}</span>
                    </div>
                `).join('');
                
                list.querySelectorAll('.action-item').forEach((div, i) => {
                    div.onclick = () => { filtered[i].run(); container.remove(); };
                });
            };

            results.parentNode.appendChild(container);
            renderActions();
            
            const actionInput = container.querySelector('#action-search');
            actionInput.focus();
            actionInput.oninput = () => renderActions(actionInput.value);
            actionInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const first = container.querySelector('.action-item');
                    if (first) first.click();
                } else if (e.key === 'Escape' || (e.key === 'j' && e.metaKey)) {
                    e.preventDefault();
                    container.remove();
                }
            };

            const closeSub = (e) => {
                if (!container.contains(e.target)) {
                    container.remove();
                    document.removeEventListener('mousedown', closeSub);
                }
            };
            setTimeout(() => document.addEventListener('mousedown', closeSub), 10);
        };

        const updateSelection = (resultsList) => {
            resultsList.forEach((el, i) => {
                if (i === selectedIndex) {
                    el.classList.add('active');
                    el.scrollIntoView({ block: 'nearest' });
                    updatePreview(currentMatches[i]);
                } else {
                    el.classList.remove('active');
                }
            });
        };

        const updatePlaceholder = () => {
            const count = document.querySelectorAll('.units__subitems').length;
            input.placeholder = count < 10 ? "Expand weeks in sidebar to search..." : "Search for apps and commands...";
        };

        // Filter chips logic
        spotlight.querySelectorAll('.filter-chip').forEach(chip => {
            chip.onclick = () => {
                spotlight.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeFilter = chip.dataset.filter;
                input.oninput();
            };
        });

        input.oninput = (e, preserveSelection = false) => {
            const query = input.value.toLowerCase().trim();
            const items = getItems();
            
            const words = query.split(/\s+/).filter(Boolean);
            const matches = items.map(item => {
                let score = 0;
                const text = (item.text || '').toLowerCase();
                const bread = (item.breadcrumb || '').toLowerCase();
                const deep = (item.searchText || '').toLowerCase();
                words.forEach(word => {
                    if (text === word) score += 100;
                    else if (text.startsWith(word)) score += 50;
                    else if (text.includes(word)) score += 10;
                    if (bread.includes(word)) score += 5;
                    if (deep && deep.includes(word)) score += 3;
                });
                return { ...item, score };
            }).filter(item => item.score > 0 || words.length === 0)
              .sort((a, b) => b.score - a.score);

            renderResults(matches, preserveSelection);
        };

        input.onfocus = () => { 
            updatePlaceholder();
            const items = getItems();
            renderResults(items); 
        };

        // Populate results immediately on first load
        renderResults(getItems());
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
                            <h4 style="margin:0; font-size:16px; font-weight:700; color:#333;">Quiz Scraper Toolkit</h4>
                            <p style="margin:0; font-size:12px; opacity:0.6;">Export your Quiz (Quiz 1/2/3) results as Markdown.</p>
                        </div>
                        <button class="btn btn-primary" id="iitm-export-all-btn" style="font-weight: bold; border-radius: 10px; padding: 10px 20px; box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);">🚀 Export All Detailed Quiz Scores</button>
                        <button class="btn btn-outline-secondary" id="iitm-export-this-btn" style="border-radius: 10px; padding: 10px 20px;">📝 Save Quiz Overview Only</button>
                    `;
                    container.insertBefore(tools, container.firstChild);
                    document.getElementById('iitm-export-all-btn').onclick = () => chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'consolidateAll' });
                    document.getElementById('iitm-export-this-btn').onclick = () => chrome.runtime.sendMessage({ action: 'triggerScraper' });
                } else if (isDetail) {
                    tools.innerHTML = `
                        ${closeBtn}
                        <div style="flex:1; min-width:150px;">
                            <h4 style="margin:0; font-size:16px; font-weight:700; color:#333;">Detailed Quiz Scraper</h4>
                        </div>
                        <button class="btn btn-info text-white" id="iitm-export-detail-btn" style="border-radius: 10px; font-weight: bold; padding: 10px 20px; border:none; background: #17a2b8;">📝 Export Quiz Result</button>
                        <a href="/course_wise" class="btn btn-link btn-sm" style="color: #6c757d;">← Back to Overview</a>
                    `;
                    container.insertBefore(tools, container.firstChild);
                    document.getElementById('iitm-export-detail-btn').onclick = () => chrome.runtime.sendMessage({ action: 'triggerScraper' });
                    
                    // Grade Projection Logic
                    const rows = Array.from(document.querySelectorAll('table tr')).slice(1);
                    let gradedTotal = 0, gradedCount = 0;
                    rows.forEach(r => {
                        const score = parseFloat(r.querySelector('td:last-child')?.innerText);
                        if (!isNaN(score)) { gradedTotal += score; gradedCount++; }
                    });
                    
                    const totalCount = rows.length;
                    const remainingCount = totalCount - gradedCount;
                    const avg = gradedCount > 0 ? (gradedTotal / gradedCount).toFixed(2) : 0;
                    const reqForS = remainingCount > 0 ? Math.max(0, (85 * totalCount - gradedTotal) / remainingCount).toFixed(2) : 'N/A';
                    
                    const projection = document.createElement('div');
                    projection.style.cssText = "width:100%; margin-top:15px; padding:15px; background:rgba(219,39,119,0.05); border:1px dashed #db2777; border-radius:12px; font-size:13px; color:#444;";
                    projection.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>🎯 <b>Grade Projection:</b> Quiz Avg: <b>${avg}</b></span>
                            <span style="color:#db2777; font-weight:800;">To get 'S': Need <b>${reqForS}</b> in remaining ${remainingCount} quizzes</span>
                        </div>
                    `;
                    tools.appendChild(projection);
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
        const list = document.querySelector('.units__list') || document.querySelector('mat-nav-list') || document.querySelector('mat-sidenav .mat-drawer-inner-container');
        if (!list) return;

        let card = document.getElementById('iitm-progress-card');
        if (!card) {
            card = document.createElement('div');
            card.id = 'iitm-progress-card';
            card.style.cssText = `
                margin: 15px; padding: 15px; border-radius: 12px;
                position: relative; z-index: 10; background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
            `;
            list.insertBefore(card, list.firstChild);
        }

        // Gather Stats accurately from the sidebar elements
        // Accurate stat discovery using robust iterative Angular component queries
        let subItems = Array.from(document.querySelectorAll('.units__subitems'));
        if (subItems.length === 0) {
            subItems = Array.from(document.querySelectorAll('app-course-unit-item'));
        }
        let stats = {
            videos: 0, totalVideos: 0,
            graded: 0, totalGraded: 0,
            grpa: 0, totalGrpa: 0,
            quizzes: 0, totalQuizzes: 0
        };
        
        subItems.forEach(item => {
            const t = item.innerText.toLowerCase();
            const tag = item.querySelector('.units__subitems-videos')?.innerText.toLowerCase() || '';
            // ULTIMATE Completion Detection: Checks icons, text, classes, and styles (Orange/Green/Purple)
            const isDone = !!(
                item.querySelector('.submitted-icon, .units__subitems-videos-done, mat-icon.done, .submitted, .units__subitems--completed, .completed') || 
                item.innerHTML.includes('done') ||
                item.innerHTML.includes('check_circle') ||
                item.querySelector('mat-icon[style*="rgb(46, 125, 50)"]') || 
                item.querySelector('mat-icon[style*="rgb(239, 108, 0)"]') ||
                item.querySelector('mat-icon[style*="rgb(103, 58, 183)"]') || // Purple GrPA done
                item.querySelector('.mat-icon-no-color.done') ||
                item.querySelector('.units__subitems--progress-icon.done')
            );
            
            const parentWeek = item.closest('.units__items, .mat-expansion-panel, app-course-unit-header');
            const weekText = parentWeek ? (parentWeek.querySelector('.units__items-title, .mat-expansion-panel-header-title')?.innerText || parentWeek.innerText).toLowerCase() : '';
            
            const isNote = t.includes('not graded') || t.includes('practice') || t.includes('mock') || t.includes('non-graded') || t.includes('ungraded');
            const isExam = t.includes('oppe') || t.includes('nppe') || weekText.includes('oppe') || weekText.includes('nppe');
            
            const isProgrammingFlag = t.includes('programming') || tag.includes('grpa') || t.includes('grpa');
            const isGrPA = isProgrammingFlag && !isExam && !isNote;
            const isQuiz = (t.includes('quiz') || t.includes('exam')) && !isNote && !isGrPA && !isExam;
            const isGraded = (t.includes('graded') && t.includes('assignment')) && !isGrPA && !isExam && !isNote && !isQuiz;

            if (tag.includes('video') || t.includes('lecture')) {
                stats.totalVideos++;
                if (isDone) stats.videos++;
            } else if (isGrPA) {
                stats.totalGrpa++;
                if (isDone) stats.grpa++;
            } else if (isGraded) {
                stats.totalGraded++;
                if (isDone) stats.graded++;
            } else if (isQuiz) {
                stats.totalQuizzes++;
                if (isDone) stats.quizzes++;
            }
        });

        const totalPoints = (stats.totalGraded + stats.totalGrpa) || 1;
        const totalDone = stats.graded + stats.grpa;
        const progress = Math.round((totalDone / totalPoints) * 100);

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:10px; font-weight:800; color:#444; letter-spacing:0.05em; text-transform:uppercase;">Graded Prog Completion</span>
                <span style="font-size:14px; font-weight:900; color:#d32f2f;">${progress}%</span>
            </div>
            <div style="height:6px; background:#f0f0f0; border-radius:3px; overflow:hidden; margin-bottom:15px; border:1px solid #eee;">
                <div style="width:${progress}%; height:100%; background:linear-gradient(90deg, #d32f2f, #f44336); transition: width 1s ease;"></div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div style="font-size:10px; color:#666;">🎥 Videos: <b>${stats.videos}/${stats.totalVideos}</b></div>
                <div style="font-size:10px; color:#e65100;">📝 Graded: <b>${stats.graded}/${stats.totalGraded}</b></div>
                <div style="font-size:10px; color:#4527a0;">💻 GrPA/GA: <b>${stats.grpa}/${stats.totalGrpa}</b></div>
                <div style="font-size:10px; color:#2e7d32;">🏆 Quizzes: <b>${stats.quizzes}/${stats.totalQuizzes}</b></div>
            </div>
        `;
    };



    // Auto-Loader loop (Reduced frequency for site speed)
    setInterval(() => {
        setupSpotlightListeners();
        if (!document.getElementById('iitm-header-utils')) injectHeaderUtils();
        if (!document.getElementById('iitm-header-search')) injectHeaderSearch();
        if (!document.getElementById('iitm-spotlight')) injectSpotlight();
        if (!document.getElementById('iitm-focus-bar-container')) injectFocusBar();
        injectProgressTracker(); // Always run to capture dynamic Angular DOM/Icon updates
        injectScoreCheckerTools(); // Has its own check
        autoCloseSidebar();
    }, 2500);

    // Global Trigger for Bulk Export
    window.addEventListener('iitm-trigger-bulk-export', bulkScrapeAll);

})();
