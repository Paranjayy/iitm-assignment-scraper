(function() {
    'use strict';

    console.log('IITM Explorer: Enhancing Productivity...');

    const body = document.body;
    let activeFilter = 'all';
    let isTimerDismissed = false; 
    const selectedItems = new Set(); // Persistent selection storage
    const normalizeLooseText = (value = '') => value.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // === DOM SELECTOR HELPERS (New Portal v2 Compatibility) ===
    // These helpers detect which portal version is active and use the correct selectors.
    const isNewPortal = () => !!document.querySelector('.unit-container, .app-side-nav, .child-row');

    const sidebarWeekSelectors = () => isNewPortal()
        ? '.unit-container'
        : '.units__items, .mat-expansion-panel';

    const sidebarWeekTitleSelector = () => isNewPortal()
        ? '.unit-header .unit-title'
        : '.units__items-title span, .units__items-title, .mat-expansion-panel-header-title';

    const sidebarSubItemSelector = () => isNewPortal()
        ? '.child-row'
        : '.units__subitems';

    const sidebarSubItemTitleSelector = () => isNewPortal()
        ? '.child-title'
        : '.units__subitems-title span, .units__subitems-title';

    const sidebarSubItemTypeSelector = () => isNewPortal()
        ? '.child-type'
        : '.units__subitems-videos';

    const getSelectedSubItem = () => document.querySelector(
        isNewPortal() ? '.child-row.selected' : '.units__subitems-selected'
    );

    const getSelectedWeek = () => document.querySelector(
        isNewPortal() ? '.unit-header[aria-expanded="true"]' : '.units__items-selected'
    );

    const getSidebarToggle = () => document.querySelector(
        isNewPortal() ? '.pin-button' : '.hide-outline-btn, .modules__content-head-menu'
    );

    const getSidebarList = () => document.querySelector(
        isNewPortal() ? '.side-nav-content' : '.units__list, mat-nav-list, mat-sidenav .mat-drawer-inner-container'
    );
    const getSelectionKey = (itemOrText, breadcrumb = '') => {
        if (typeof itemOrText === 'string') {
            return `${normalizeLooseText(breadcrumb)}::${normalizeLooseText(itemOrText)}`;
        }
        const item = itemOrText || {};
        return `${normalizeLooseText(item.breadcrumb || '')}::${normalizeLooseText(item.text || '')}`;
    };
    const persistSelectedItems = () => {
        localStorage.setItem('iitm-selected-items', JSON.stringify(Array.from(selectedItems)));
    };
    const hydrateSelectedItems = () => {
        try {
            const raw = JSON.parse(localStorage.getItem('iitm-selected-items') || '[]');
            if (!Array.isArray(raw)) return;
            raw.forEach(entry => {
                if (typeof entry === 'string' && entry.trim()) selectedItems.add(entry);
            });
        } catch (e) {
            console.warn('Failed to load selected items from storage:', e);
        }
    };
    const isItemSelected = (item) => {
        if (!item) return false;
        return selectedItems.has(getSelectionKey(item)) || selectedItems.has(item.text || '');
    };
    const setItemSelected = (item, shouldSelect) => {
        if (!item || !item.text) return;
        const key = getSelectionKey(item);
        const legacy = item.text;
        if (shouldSelect) {
            selectedItems.add(key);
            selectedItems.delete(legacy);
            return;
        }
        selectedItems.delete(key);
        selectedItems.delete(legacy);
    };
    const toggleItemSelection = (item) => {
        const nextState = !isItemSelected(item);
        setItemSelected(item, nextState);
        return nextState;
    };
    hydrateSelectedItems();
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
        if (window.__iitm_bulk_run_active) {
            alert('Bulk export is already running. Please wait or cancel the current run.');
            return;
        }

        // Ensure Spotlight never masks the bulk confirmation modal.
        isSpotlightOpen = false;
        const spotlightEl = document.getElementById('iitm-spotlight');
        if (spotlightEl) spotlightEl.style.display = 'none';
        const staleActionSubmenu = document.getElementById('spotlight-action-submenu');
        if (staleActionSubmenu) staleActionSubmenu.remove();

        window.__iitm_bulk_run_active = true;
        window.__iitm_is_bulk_scraping = false;

        const verboseBulkLogs = localStorage.getItem('iitm-bulk-debug') === 'true';
        const bulkLog = (...args) => { if (verboseBulkLogs) console.log(...args); };

        const staleOverlay = document.getElementById('iitm-bulk-overlay');
        if (staleOverlay) staleOverlay.remove();

        let overlay = null;
        let clearSelectionOnExit = false;

        try {
        let subItems = [];
        const zip = typeof JSZip !== 'undefined' ? new JSZip() : null;
        const titleLooksLikeMatch = (expected, current) => {
            const e = normalizeLooseText(expected || '');
            const c = normalizeLooseText(current || '');
            if (!e || !c) return false;
            if (e === c) return true;
            return (e.length > 8 && c.includes(e)) || (c.length > 8 && e.includes(c));
        };
        const getActiveSidebarTitle = () => {
            if (isNewPortal()) {
                return (
                    document.querySelector('.child-row.selected .child-title')?.innerText ||
                    document.querySelector('.unit-header[aria-expanded="true"] .unit-title')?.innerText ||
                    ''
                ).trim();
            }
            return (
                document.querySelector('.units__subitems-selected .units__subitems-title span')?.innerText ||
                document.querySelector('.units__subitems-selected .units__subitems-title')?.innerText ||
                document.querySelector('.units__subitems-text.opened .units__subitems-title span')?.innerText ||
                ''
            ).trim();
        };
        const getCurrentPortalTitle = () => {
            return (
                document.querySelector('.programming-code-editor-container .title')?.innerText ||
                document.querySelector('.title-row .title')?.innerText ||
                document.querySelector('.left-content .assignment-title')?.innerText ||
                document.querySelector('.assignment-title')?.innerText ||
                document.querySelector('.title-container')?.innerText ||
                document.querySelector('.modules__content-head-title h2')?.innerText ||
                document.querySelector('.modules__content-head-title')?.innerText ||
                ''
            ).trim();
        };
        const findItemNode = (itemData, title, breadcrumb) => {
            const directNode = itemData?.el;
            if (directNode && document.body.contains(directNode)) return directNode;

            const normalizedTitle = normalizeLooseText(title);
            const normalizedBreadcrumb = normalizeLooseText(breadcrumb || '');

            if (isNewPortal()) {
                const headers = Array.from(document.querySelectorAll('.unit-container'));
                const targetHeader = headers.find(h => {
                    if (!normalizedBreadcrumb) return true;
                    const headerTitle = (h.querySelector('.unit-title')?.innerText || '').trim();
                    return normalizeLooseText(headerTitle).includes(normalizedBreadcrumb);
                });

                if (!targetHeader) return null;

                const isExpanded = targetHeader.querySelector('.child-container');
                if (!isExpanded) {
                    (targetHeader.querySelector('.unit-header') || targetHeader).click();
                }

                const subItems = Array.from(targetHeader.querySelectorAll('.child-row'));
                return subItems.find(s => {
                    const nodeTitle = (s.querySelector('.child-title')?.innerText || s.innerText.split('\n')[0] || '').trim();
                    const normalizedNode = normalizeLooseText(nodeTitle);
                    return normalizedNode === normalizedTitle || normalizedNode.includes(normalizedTitle) || normalizedTitle.includes(normalizedNode);
                }) || null;
            }

            const headers = Array.from(document.querySelectorAll('.units__items, .mat-expansion-panel'));
            const targetHeader = headers.find(h => {
                if (!normalizedBreadcrumb) return true;
                const headerTitle = (
                    h.querySelector('.units__items-title span')?.innerText ||
                    h.querySelector('.units__items-title')?.innerText ||
                    h.querySelector('.mat-expansion-panel-header-title')?.innerText ||
                    ''
                ).trim();
                return normalizeLooseText(headerTitle).includes(normalizedBreadcrumb);
            });

            if (!targetHeader) return null;

            if (!targetHeader.classList.contains('mat-expanded') && !targetHeader.querySelector('.mat-expansion-panel-content')) {
                (targetHeader.querySelector('.units__items-title, .mat-expansion-panel-header') || targetHeader).click();
            }

            const subitems = Array.from(targetHeader.querySelectorAll('.units__subitems'));
            return subitems.find(s => {
                const nodeTitle = (s.querySelector('.units__subitems-title span')?.innerText || s.innerText.split('\n')[0] || '').trim();
                const normalizedNode = normalizeLooseText(nodeTitle);
                return normalizedNode === normalizedTitle || normalizedNode.includes(normalizedTitle) || normalizedTitle.includes(normalizedNode);
            }) || null;
        };
        const waitForNavigation = async (title, timeoutMs = 10000) => {
            const started = Date.now();
            while (Date.now() - started < timeoutMs) {
                const sidebarTitle = getActiveSidebarTitle();
                const portalTitle = getCurrentPortalTitle();
                const sidebarMatch = titleLooksLikeMatch(title, sidebarTitle);
                const portalMatch = titleLooksLikeMatch(title, portalTitle);
                if (sidebarMatch && (portalMatch || !portalTitle)) {
                    await new Promise(r => setTimeout(r, 500));
                    return true;
                }
                await new Promise(r => setTimeout(r, 250));
            }
            return false;
        };
        const requestBulkConfirmation = async (unitCount) => {
            if (document.visibilityState !== 'visible') {
                console.warn('⚠️ Bulk start ignored because tab is not visible. Activate the tab and try again.');
                return false;
            }

            return new Promise((resolve) => {
                const existing = document.getElementById('iitm-bulk-confirm-overlay');
                if (existing) existing.remove();

                const modalOverlay = document.createElement('div');
                modalOverlay.id = 'iitm-bulk-confirm-overlay';
                modalOverlay.style.cssText = `
                    position: fixed; inset: 0; z-index: 210001;
                    background: rgba(0,0,0,0.45);
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: none;
                `;

                const card = document.createElement('div');
                card.style.cssText = `
                    width: min(440px, 90vw);
                    background: #101214;
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 14px;
                    box-shadow: 0 24px 80px rgba(0,0,0,0.65);
                    padding: 18px;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                `;

                card.innerHTML = `
                    <div style="font-size:13px; font-weight:800; opacity:0.8; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:10px; color:#db2777;">Bulk Content Pack</div>
                    <div style="font-size:14px; line-height:1.45; opacity:0.92; margin-bottom:16px;">This will scrape <b>${unitCount}</b> units and bundle them into a ZIP.</div>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button id="iitm-bulk-confirm-cancel" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#fff; padding:8px 14px; border-radius:9px; cursor:pointer; font-size:12px; font-weight:700;">Cancel</button>
                        <button id="iitm-bulk-confirm-ok" style="background:#1f9bff; border:none; color:#fff; padding:8px 14px; border-radius:9px; cursor:pointer; font-size:12px; font-weight:700;">Start Bulk Export</button>
                    </div>
                `;

                modalOverlay.appendChild(card);
                document.body.appendChild(modalOverlay);

                let settled = false;
                const close = (result) => {
                    if (settled) return;
                    settled = true;
                    modalOverlay.remove();
                    resolve(result);
                };

                const cancelBtn = card.querySelector('#iitm-bulk-confirm-cancel');
                const okBtn = card.querySelector('#iitm-bulk-confirm-ok');
                cancelBtn.onclick = () => close(false);
                okBtn.onclick = () => close(true);
                modalOverlay.onclick = (e) => { if (e.target === modalOverlay) close(false); };

                const escHandler = (e) => {
                    if (e.key === 'Escape') close(false);
                };
                document.addEventListener('keydown', escHandler, { once: true, capture: true });

                setTimeout(() => {
                    if (!settled) close(false);
                }, 60000);
            });
        };
        
        // Force-expand all weeks to ensure items are rendered in DOM
        const weeks = document.querySelectorAll(sidebarWeekSelectors());
        for (const week of weeks) {
            const isExpanded = isNewPortal()
                ? week.querySelector('.child-container')
                : week.querySelector('.units__subitems');
            const header = isNewPortal()
                ? week.querySelector('.unit-header')
                : (week.querySelector('.units__section-title') || week.querySelector('mat-panel-header'));
            if (!isExpanded && header) {
                bulkLog('📂 Expanding week:', header.innerText.trim());
                header.click();
                await new Promise(r => setTimeout(r, 600)); // Wait for expansion animation
            }
        }

        const indexedItems = (typeof window.__iitm_get_items === 'function' ? window.__iitm_get_items() : [])
            .filter(item => item && item.isSub && item.el && !item.actionId && !item.url);

        if (selectedItems.size > 0) {
            subItems = indexedItems.filter(item => {
                const isMatched = isItemSelected(item);
                if (isMatched) bulkLog(`🎯 Bulk Scraper: Matched selected item "${item.text}"`);
                return isMatched;
            });
            bulkLog(`📦 Bulk Scraper: Starting capture for ${subItems.length} selected items.`);
        }

        if (subItems.length === 0) {
            subItems = indexedItems;
        }

        if (subItems.length === 0) {
            subItems = Array.from(document.querySelectorAll('.units__subitems')).map(item => {
                const title = item.querySelector('.units__subitems-title span')?.innerText.trim() || item.innerText.split('\n')[0].trim();
                const breadcrumb = item.closest('.units__items')?.querySelector('.units__items-title')?.innerText.trim() || '';
                return {
                    text: title,
                    breadcrumb,
                    el: item,
                    isSub: true,
                    isProgramming: item.innerText.toLowerCase().includes('programming') || item.innerText.toLowerCase().includes('grpa')
                };
            });
        }

        if (subItems.length === 0) {
            return alert('No items found. Please expand the weeks in the sidebar first.');
        }
        
        const count = subItems.length;
        const userApproved = await requestBulkConfirmation(count);
        if (!userApproved) return;
        clearSelectionOnExit = true;

        overlay = document.createElement('div');
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
        const navigationDurations = [];
        const captureDurations = [];
        const startTimeTotal = Date.now();
        let totalCountProcessed = 0;

        const averageOr = (arr, fallback) => arr.length > 0
            ? (arr.reduce((sum, value) => sum + value, 0) / arr.length)
            : fallback;

        const waitUntilVisible = (timeoutMs = 45000) => new Promise((resolve) => {
            if (document.visibilityState === 'visible') {
                resolve(true);
                return;
            }

            let settled = false;
            const finish = (isVisible) => {
                if (settled) return;
                settled = true;
                document.removeEventListener('visibilitychange', onVisibilityChange, true);
                resolve(isVisible);
            };

            const onVisibilityChange = () => {
                if (document.visibilityState === 'visible') finish(true);
            };

            document.addEventListener('visibilitychange', onVisibilityChange, true);
            setTimeout(() => finish(document.visibilityState === 'visible'), timeoutMs);
        });

        const estimateRemainingSeconds = (nextIndex, isProgramming) => {
            const remaining = Math.max(0, count - nextIndex);
            const fallbackCapture = isProgramming ? 26 : 11;
            const avgNavigation = averageOr(navigationDurations, 3.5);
            const avgCapture = averageOr(captureDurations, fallbackCapture);
            const avgPerItem = Math.max(4, avgNavigation + avgCapture + 1.5);
            return Math.ceil(remaining * avgPerItem);
        };

        const renderEta = (seconds, paused) => {
            const safeSeconds = Math.max(0, Number(seconds) || 0);
            const mins = Math.floor(safeSeconds / 60);
            const secs = safeSeconds % 60;
            const prefix = paused ? 'ETA paused' : 'ETA';
            return `${prefix}: ~${mins > 0 ? mins + 'm ' : ''}${secs}s remaining`;
        };

        for (let i = 0; i < subItems.length; i++) {
            if (cancelled || forceFinish) break;
            const itemData = subItems[i];
            const item = itemData.el || itemData; // Handle both metadata objects or raw DOM
            const title = itemData.text || item.innerText.split('\n')[0].trim();
            const breadcrumb = itemData.breadcrumb || '';
            
            const isProgramming = (itemData.isProgramming !== undefined) ? itemData.isProgramming : (item.innerText.toLowerCase().includes('programming') || item.innerText.toLowerCase().includes('grpa'));

            if (document.visibilityState !== 'visible') {
                progressText.innerText = 'Tab inactive. Waiting for focus to keep capture accurate...';
                etaText.innerText = 'ETA paused: bring this tab to foreground';
                const becameVisible = await waitUntilVisible(45000);
                if (!becameVisible) {
                    console.warn('⚠️ Bulk Scraper: Tab remained inactive for 45s. Continuing, but capture speed may degrade.');
                }
            }

            const startTimeItem = Date.now();
            const navigationStart = Date.now();
            
            progressText.innerText = `Scraping: ${title} (${i+1}/${count})`;
            progressBar.style.width = `${(i / count) * 100}%`;
            etaText.innerText = renderEta(estimateRemainingSeconds(i, isProgramming), document.visibilityState !== 'visible');
            
            bulkLog(`🚀 [${i+1}/${count}] Beginning ${isProgramming ? 'GrPA' : 'Standard'} Capture: ${title}`);
            
            // ROBUST CLICKER: Force Sidebar Open and Click Native Node
            window.__iitm_is_bulk_scraping = true; // Shield against autoCloseSidebar
            let navigated = false;
            for (let navAttempt = 0; navAttempt < 3 && !navigated; navAttempt++) {
                const leftToggle = getSidebarToggle();
                if (leftToggle) {
                    const isCollapsed = isNewPortal()
                        ? leftToggle.getAttribute('aria-label')?.includes('Unpin')
                        : (leftToggle.innerHTML?.includes('rotate(180deg)') || document.querySelector('mat-sidenav')?.getAttribute('opened') !== 'true');
                    if (isCollapsed) leftToggle.click();
                }

                await new Promise(r => setTimeout(r, 350));

                const node = findItemNode(itemData, title, breadcrumb);
                if (node) {
                    (node.closest('button') || node).click();
                    if (!itemData.isSub) setTimeout(() => node.querySelector('.mat-expansion-indicator')?.click(), 50);
                } else {
                    console.warn(`⚠️ [${i+1}] Could not locate node for "${title}" (attempt ${navAttempt + 1}/3).`);
                }

                navigated = await waitForNavigation(title, 9000 + (navAttempt * 1500));
                if (!navigated) {
                    console.warn(`⚠️ [${i+1}] Navigation mismatch for "${title}" (attempt ${navAttempt + 1}/3). Retrying...`);
                }
            }
            navigationDurations.push((Date.now() - navigationStart) / 1000);

            if (!navigated) {
                console.warn(`⚠️ [${i+1}] Could not reliably navigate to "${title}". Skipping this unit to avoid wrong capture.`);
                progressBar.style.width = `${((i + 1) / count) * 100}%`;
                continue;
            }

            const captureToken = `bulk-${Date.now()}-${i}`;
            const captureStart = Date.now();
            // === AUTO-START: If on start page, click checkbox + Start Assessment ===
            try {
                const startPage = document.querySelector('app-assessment-start-page, app-pa-start-page');
                if (startPage) {
                    bulkLog(`📋 [${i+1}] Auto-clicking guidelines checkbox + Start Assessment...`);
                    const checkbox = startPage.querySelector('input[type="checkbox"]');
                    if (checkbox && !checkbox.checked) {
                        checkbox.click();
                        await new Promise(r => setTimeout(r, 300));
                    }
                    const startBtn = startPage.querySelector('button[aria-label="Start Assessment"], button[aria-label="Start Assignment"], .page-footer button.btn-success');
                    if (startBtn) {
                        startBtn.click();
                        for (let w = 0; w < 50; w++) {
                            await new Promise(r => setTimeout(r, 100));
                            if (document.querySelector('.assessment-question-view, .assessment-paginator, button.chip, app-assessment-question-view, app-programming-assignment-view, .pa-code-editor')) {
                                bulkLog(`✅ [${i+1}] Assessment loaded after ${(w*100)}ms`);
                                await new Promise(r => setTimeout(r, 500));
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`⚠️ [${i+1}] Auto-start failed:`, e);
            }

            const capturedData = await new Promise((resolve) => {
                let timeoutId = null;
                let settled = false;
                const complete = (data) => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('iitm-markdown-captured', handler);
                    if (timeoutId) clearTimeout(timeoutId);
                    resolve(data);
                };

                const handler = (e) => {
                    if (e.detail?.captureToken && e.detail.captureToken !== captureToken) return;
                    complete(e.detail);
                };
                window.addEventListener('iitm-markdown-captured', handler);
                window.__scraperMode = 'capture';
                // Trigger actual capture message with real sidebar title
                try {
                    chrome.runtime.sendMessage({ action: 'triggerScraper', mode: 'capture', title: title, token: captureToken }, () => {
                        const runtimeError = chrome.runtime?.lastError;
                        if (runtimeError) {
                            console.warn(`⚠️ [${i + 1}] triggerScraper message failed for "${title}":`, runtimeError.message);
                            complete(null);
                        }
                    });
                } catch (err) {
                    console.warn(`⚠️ [${i + 1}] triggerScraper dispatch failed for "${title}":`, err?.message || err);
                    complete(null);
                }
                
                timeoutId = setTimeout(() => {
                    complete(null);
                }, 40000); // 40s timeout for slow IITM servers
            });
            captureDurations.push((Date.now() - captureStart) / 1000);

            const durationItem = (Date.now() - startTimeItem) / 1000;
            processedDurations.push(durationItem);
            bulkLog(`✅ [${i+1}] Captured in ${durationItem.toFixed(1)}s`);
            
            if (capturedData?.titleMismatch) {
                console.warn(`⚠️ [${i+1}] Capture title mismatch for "${title}". Expected ${capturedData.expectedTitle || 'unknown'}, got ${capturedData.detectedTitle || 'unknown'}. Skipping.`);
                continue;
            }

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
                bulkLog(`✅ [${i+1}] Capture SUCCESS: "${fullFileName}" (${durationItem}s).`);
            } else {
                console.warn(`⚠️ [${i+1}] Capture failed for "${title}" after ${durationItem}s. Skipping to next.`);
            }

            progressBar.style.width = `${((i + 1) / count) * 100}%`;
            const remainingAfter = Math.max(0, count - (i + 1));
            etaText.innerText = remainingAfter > 0
                ? renderEta(estimateRemainingSeconds(i + 1, isProgramming), document.visibilityState !== 'visible')
                : 'ETA: finalizing bundle...';
        }
        
        const totalDuration = ((Date.now() - startTimeTotal) / 1000).toFixed(1);
        console.info(`🏁 Bulk completed: ${totalCountProcessed}/${count} items in ${totalDuration}s.`);
        
        if (hasVideos) {
            masterAssetMarkdown += `\n---\n\n` + masterVideoList;
        }
        
        if (hasAnyAssets || hasVideos) {
            zip.file('Asset_Links_Backup.md', masterAssetMarkdown);
        }

        const files = zip ? Object.keys(zip.files).filter(k => !zip.files[k].dir) : [];

        if (!cancelled && zip && files.length > 0) {
            bulkLog(`📦 Bulk Scraper: Finalizing ${files.length} items for bundle...`);

            if (files.length <= 50) {
                // SMALL BATCH: Direct in-page ZIP generation (High Reliability)
                progressText.innerText = `Generating ZIP bundle in-page (${files.length} items)...`;
                try {
                    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
                    const url = URL.createObjectURL(content);
                    const a = document.createElement('a');
                    const zipName = `IITM_Course_ZIP_${Date.now()}.zip`;
                    a.href = url;
                    a.download = zipName;
                    document.body.appendChild(a);
                    a.click();
                    bulkLog('✅ ZIP Download Triggered:', zipName);
                    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 15000);
                    overlay.innerHTML = `<div style="font-size: 32px; font-weight: 800; color: #4caf50;">✅ DONE!</div><div style="margin-top:20px; opacity:0.6;">${files.length} items saved.</div>`;
                } catch (err) {
                    console.error('❌ In-page ZIP generation failed:', err);
                    progressText.innerText = "Error building ZIP. Try smaller batch.";
                }
            } else {
                // LARGE BATCH: Offscreen relay for extremely large bundles
                progressText.innerText = `Stabilizing & Shifting to Offscreen (${files.length} items)...`;
                try {
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

                    const zipName = `IITM_Course_ZIP_${Date.now()}.zip`;
                    const relayResult = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: 'generateZip',
                            data: { files: zipFiles, zipName }
                        }, (response) => {
                            const runtimeError = chrome.runtime?.lastError;
                            if (runtimeError) {
                                resolve({ success: false, error: runtimeError.message });
                                return;
                            }
                            resolve(response || { success: false, error: 'No response from background ZIP relay.' });
                        });
                    });

                    if (!relayResult?.success) {
                        throw new Error(relayResult?.error || 'Offscreen ZIP relay failed.');
                    }

                    overlay.innerHTML = `<div style="font-size: 32px; font-weight: 800; color: #4caf50;">✅ DONE!</div><div style="margin-top:20px; opacity:0.6;">Large bundle relay started. Check downloads.</div>`;
                } catch (err) {
                    console.error('❌ Offscreen ZIP relay failed:', err);
                    overlay.innerHTML = `<div style="font-size: 24px; font-weight: 800; color: #f59e0b;">⚠️ ZIP Relay Failed</div><div style="margin-top:14px; opacity:0.7; text-align:center;">Captured files are ready but relay failed. Retry bulk with smaller selection.</div>`;
                }
            }
            setTimeout(() => { if (document.body.contains(overlay)) overlay.remove(); }, 4000);
        } else if (!cancelled && zip && files.length === 0) {
            console.info('ℹ️ Bulk Scraper: Completed run with zero successful captures; no ZIP generated.');
            overlay.innerHTML = `<div style="font-size: 24px; font-weight: 800; color: #f59e0b;">⚠️ No Files Exported</div><div style="margin-top:14px; opacity:0.7; text-align:center;">No unit produced valid markdown in this run. Try re-running with the tab kept active.</div>`;
            setTimeout(() => { if (document.body.contains(overlay)) overlay.remove(); }, 5000);
        } else {
            console.info('ℹ️ Bulk Scraper: Run cancelled before ZIP generation.');
            if (overlay && document.body.contains(overlay)) overlay.remove();
        }
        } catch (err) {
            console.error('❌ Bulk export aborted due to an unexpected error:', err);
            alert('Bulk export hit an unexpected error. Please retry.');
        } finally {
            if (clearSelectionOnExit) selectedItems.clear();
            if (overlay && document.body.contains(overlay)) overlay.remove();
            window.__iitm_is_bulk_scraping = false;
            window.__iitm_bulk_run_active = false;
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
        const week = (
            isNewPortal()
                ? (getSelectedWeek()?.querySelector('.unit-title')?.innerText || document.querySelector('.side-nav-title')?.innerText)
                : document.querySelector('.units__items-selected .units__items-title')?.innerText
        )?.trim() || 'General';
        const unit = (
            isNewPortal()
                ? (getSelectedSubItem()?.querySelector('.child-title')?.innerText || document.querySelector('.title-row .title')?.innerText)
                : (document.querySelector('.units__subitems-selected .units__subitems-title span')?.innerText || document.querySelector('.assignment-title')?.innerText)
        )?.trim() || 'Lesson';
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

    let lastUrlProcessed = '';
    const autoCloseSidebar = () => {
        if (isSpotlightOpen) return;

        if (location.href.includes('/courses/') && location.href !== lastUrlProcessed) {
            lastUrlProcessed = location.href;

            // Wait for both the initial spinner AND the skeleton loading frames to resolve completely
            let waitAttempts = 0;
            const delayClose = setInterval(() => {
                const subitems = document.querySelectorAll(sidebarSubItemSelector());
                
                // 1. Are sidebar units populated?
                const isSidebarReady = isNewPortal()
                    ? subitems.length > 5
                    : (subitems.length > 20 && subitems[0].innerText.trim().length > 5);
                
                // 2. Are skeleton/spinners dead?
                const isGhostLoaderActive = document.querySelector('.ghost-loader, .skeleton') !== null;
                const isSpinnerActive = document.querySelector('.spinner-overlay, app-spinner') !== null;
                
                const isGetItemsReady = typeof window.__iitm_get_items === 'function';
                
                // Strict Gate: Wait AT LEAST 2.5 seconds (5 attempts) for Angular to begin its routing and spawn the skeleton loaders,
                // THEN evaluate if those loaders have died.
                const isFullyLoaded = waitAttempts > 5 && 
                                      isSidebarReady && 
                                      isGetItemsReady && 
                                      !isGhostLoaderActive && 
                                      !isSpinnerActive;
                                      
                if (isFullyLoaded || waitAttempts > 40) { // max timeout 20 seconds
                    clearInterval(delayClose);
                    if (typeof window.__iitm_get_items === 'function') window.__iitm_get_items();
                    
                    // Desktop Sidebar
                    const leftToggle = getSidebarToggle();
                    if (isNewPortal()) {
                        // New portal: sidebar is always visible, no auto-collapse needed
                    } else {
                        const isCollapsed = document.querySelector('.hide-outline-btn')?.innerHTML?.includes('rotate(180deg)');
                        if (leftToggle && !isCollapsed && !isSpotlightOpen) leftToggle.click();
                    }
                    
                    // Mobile Sidebar (legacy)
                    const sidenav = document.querySelector('mat-sidenav');
                    if (sidenav && (sidenav.classList.contains('mat-drawer-opened') || sidenav.getAttribute('opened') === 'true' || sidenav.offsetWidth > 100)) {
                        const mobileToggle = document.querySelector('.mobile-menu button, .header button[aria-label="Menu"], app-button.mobile-menu button');
                        if (mobileToggle && !isSpotlightOpen) mobileToggle.click();
                    }
                }
                waitAttempts++;
            }, 500);
        }
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
        const header = document.querySelector('.app-bar-container') || document.querySelector('.header__right') || document.querySelector('.header');
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
                background: transparent !important; z-index: 100000;
                display: none; align-items: flex-start; justify-content: center; padding-top: 10vh;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
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
            openBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const activeItem = currentMatches[selectedIndex];
                if (activeItem) {
                    triggerSelection(activeItem, null);
                } else if (currentMatches.length > 0) {
                    triggerSelection(currentMatches[0], null);
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
                    const targetState = !isItemSelected(item);
                    for (let r = start; r <= end; r++) {
                        const rItem = currentMatches[r];
                        if (rItem && !rItem.actionId && !rItem.url) { // Only select actual assignment items
                            setItemSelected(rItem, targetState);
                        }
                    }
                    persistSelectedItems();
                    renderResults(currentMatches, true);
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
                } else if (item.actionId === 'examSim') {
                    spotlight.style.display = 'none';
                    showStrategicHub();
                } else if (item.actionId === 'globalGPA') {
                    spotlight.style.display = 'none';
                    showGlobalProjection();
                } else if (item.actionId === 'academicHeatmap') {
                    spotlight.style.display = 'none';
                    showAcademicHeatmap();
                } else if (item.actionId === 'navDash') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/current_courses';
                } else if (item.actionId === 'navScore') {
                    window.location.href = 'https://score-checker-379619009600.asia-south1.run.app/course_wise';
                } else if (item.actionId === 'navCurrentCourses') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/current_courses';
                } else if (item.actionId === 'navCompletedCourses') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_courses';
                } else if (item.actionId === 'navProjects') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_projects';
                } else if (item.actionId === 'navHallTicket') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/exam_cities_and_hall_ticket';
                } else if (item.actionId === 'navCalendar') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/calender';
                } else if (item.actionId === 'navCertificates') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_certificates';
                } else if (item.actionId === 'navDocuments') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_documents';
                } else if (item.actionId === 'navSubmittedDocs') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/submitted_forms_and_receipt';
                } else if (item.actionId === 'navPayments') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/pending_payment/list';
                } else if (item.actionId === 'navDisciplinary') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_disciplinary_action';
                } else if (item.actionId === 'navLatestUpdates') {
                    window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/latest_updates';
                } else if (item.actionId === 'navSupport') {
                    window.location.href = 'https://study-supportdesk.freshdesk.com/support/login';
                } else if (item.actionId === 'showTour') {
                    spotlight.style.display = 'none';
                    showFeatureTour();
                } else if (item.actionId === 'syncScores') {
                    spotlight.style.display = 'none';
                    syncCurrentPageScores(false);
                } else if (item.actionId === 'bulkExport') {
                    isSpotlightOpen = false;
                    spotlight.style.display = 'none';
                    const existing = document.getElementById('spotlight-action-submenu');
                    if (existing) existing.remove();
                    bulkScrapeAll();
                } else if (item.actionId === 'unlockPage') {
                    document.oncontextmenu = null; document.onselectstart = null;
                    document.querySelectorAll('*').forEach(el => { el.style.userSelect = 'auto'; el.style.pointerEvents = 'auto'; });
                    showToast('Editor Unlocked');
                } else if (item.actionId.includes('explain')) {
                    spotlight.style.display = 'none';
                    openInAI(item.actionId.replace('explain', '').toLowerCase());
                } else {
                    spotlight.style.display = 'none';
                    if (typeof enhancedHandleUIToggle === 'function') enhancedHandleUIToggle(item.actionId);
                    else handleUIToggle(item.actionId);
                }
            } else {
                toggleItemSelection(item);
                
                lastSelectedIndex = currentMatches.indexOf(item);
                persistSelectedItems();
                renderResults(currentMatches, true);

                // Option: If NOT clicking a checkbox/meta area, just navigate? 
                // User's request suggests they WANT selection for bulk, so we toggle.
                // But if they press ENTER (no event), we navigate.
                if (!event) {
                    spotlight.style.display = 'none';
                    if (item.url) {
                        window.location.href = item.url;
                        return;
                    }
                    if (!item.el) return;

                    // If the element is technically in the DOM but Angular hid it (offsetWidth === 0) or destroyed it, we must force-open the sidebar
                    const isVisible = document.body.contains(item.el) && item.el.offsetWidth > 0;

                    if (isVisible) {
                        (item.el.closest('button') || item.el).click();
                        if (!item.isSub) setTimeout(() => item.el.querySelector('.mat-expansion-indicator')?.click(), 50);
                    } else {
                        // Fallback: If Angular erased or hid the sidebar, we must re-open it to orchestrate the route change natively!
                        const leftToggle = getSidebarToggle();
                        if (leftToggle) leftToggle.click();

                        setTimeout(() => {
                            const headers = Array.from(document.querySelectorAll(sidebarWeekSelectors()));
                            const targetHeader = headers.find(h => h.innerText.includes(item.breadcrumb));
                            if (targetHeader) {
                                if (isNewPortal()) {
                                    const isExpanded = targetHeader.querySelector('.child-container');
                                    if (!isExpanded) targetHeader.querySelector('.unit-header')?.click();
                                } else {
                                    if (!targetHeader.classList.contains('mat-expanded') && !targetHeader.querySelector('.mat-expansion-panel-content')) {
                                        targetHeader.click();
                                    }
                                }
                                setTimeout(() => {
                                    const subitems = Array.from(targetHeader.querySelectorAll(sidebarSubItemSelector()));
                                    const exactNode = subitems.find(s => s.innerText.includes(item.text));
                                    if (exactNode) (exactNode.closest('button') || exactNode).click();
                                }, 300);
                            }
                        }, 500); // Give Angular 500ms to recreate the DOM tree
                    }
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
                'DASHBOARD LINKS': [],
                'SYSTEM COMMANDS': [],
                'PROGRAMMING EXAMS (OPPE/NPPE)': [],
                'LECTURE VIDEOS': [],
                'PROGRAMMING ASSIGNMENTS': [],
                'GRADED ASSIGNMENTS': [],
                'GRADED QUIZZES': [],
                'COURSE OUTLINE': []
            };
            
            items.forEach(item => {
                const group = item.group || 'COURSE OUTLINE';
                groupMap[group] = groupMap[group] || [];
                groupMap[group].push(item);
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
                        const selectableGroupItems = groupItems.filter(gi => !gi.actionId && !gi.url);
                        const allInGroupSelected = selectableGroupItems.every(gi => isItemSelected(gi));
                        selectableGroupItems.forEach(gi => setItemSelected(gi, !allInGroupSelected));
                        persistSelectedItems();
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
                        const isSelectedStored = isItemSelected(item);
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
            window.__iitm_prev_query = (input.value || '').toLowerCase().trim();

            if (!preserveSelection) selectedIndex = currentMatches.length > 0 ? 0 : -1;
            updateSelection(results.querySelectorAll('.spotlight-item'));
        };

        let cachedItems = null;

        const getItems = () => {
            let headers = Array.from(document.querySelectorAll(sidebarWeekSelectors()));
            if (headers.length === 0 && isNewPortal()) {
                headers = Array.from(document.querySelectorAll('.unit-container'));
            }
            if (headers.length === 0) headers = Array.from(document.querySelectorAll('.mat-expansion-panel'));
            if (headers.length === 0) headers = Array.from(document.querySelectorAll('app-course-unit-header'));
            
            // CACHE RESCUE: If the sidebar is closed, IITM destroys the syllabus DOM. 
            // We return the memory-cached items if no DOM headers are present.
            if (headers.length === 0 && cachedItems && cachedItems.length > 50) {
                return cachedItems;
            }

            const allItems = [];
            
            // ⚡ ACADEMIC COMMANDS (FIRST-CLASS RESULTS)
            [
                { text: '🎮 Strategic Command Center', group: 'SYSTEM COMMANDS', actionId: 'examSim', typeLabel: 'HUB', color: '#db2777', description: 'Simulate targets across all courses' },
                { text: '📈 Global GPA Projector', group: 'SYSTEM COMMANDS', actionId: 'globalGPA', typeLabel: 'TOOL', color: '#64FFDA', description: 'Detailed Term CGPA breakdown' },
                { text: '🔥 Academic Heatmap', group: 'SYSTEM COMMANDS', actionId: 'academicHeatmap', typeLabel: 'COMMAND', color: '#FFC107', description: 'Visualize 12-week academic progress' },
                { text: '🏠 Go to My Dashboard', group: 'SYSTEM COMMANDS', actionId: 'navDash', typeLabel: 'NAV', color: '#1565c0', description: 'Jump to current course outline' },
                { text: '📊 Open Score Checker', group: 'SYSTEM COMMANDS', actionId: 'navScore', typeLabel: 'NAV', color: '#2e7d32', description: 'Jump to detailed quiz grades' },
                { text: '✨ Feature Tour (What\'s New)', group: 'SYSTEM COMMANDS', actionId: 'showTour', typeLabel: 'COMMAND', color: '#7b1fa2', description: 'Show all academic suite features' },
                { text: '📥 Bulk Export All (Active)', group: 'SYSTEM COMMANDS', actionId: 'bulkExport', typeLabel: 'COMMAND', color: '#ef6c00', description: 'Export all selected course units' },
                { text: '🔓 Unlock Editor/Copy', group: 'SYSTEM COMMANDS', actionId: 'unlockPage', typeLabel: 'COMMAND', color: '#455a64', description: 'Force enable text selection/copy' },
                { text: '🔄 Sync Scores from Page', group: 'SYSTEM COMMANDS', actionId: 'syncScores', typeLabel: 'TOOL', color: '#0288d1', description: 'Manually scrape and save scores' }
            ].forEach(cmd => allItems.push({ ...cmd, breadcrumb: 'Academic Engine', isSub: true }));

            headers.forEach(weekEl => {
                const weekTitle = (
                    isNewPortal()
                        ? (weekEl.querySelector('.unit-title')?.innerText.trim() || 'General')
                        : (
                            weekEl.querySelector('.units__items-title span')?.innerText.trim() || 
                            weekEl.querySelector('.units__items-title')?.innerText.trim() || 
                            weekEl.querySelector('.mat-expansion-panel-header-title')?.innerText.trim() || 
                            weekEl.querySelector('mat-panel-title')?.innerText.trim() || 
                            'General'
                          )
                ).split('\n')[0].trim();
                
                // Add the Week itself
                const weekHeader = isNewPortal()
                    ? weekEl.querySelector('.unit-header')
                    : weekEl.querySelector('.units__items-title');
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
                const subItems = weekEl.querySelectorAll(sidebarSubItemSelector());
                subItems.forEach(sub => {
                    const titleText = (
                        isNewPortal()
                            ? (sub.querySelector('.child-title')?.innerText.trim() || sub.innerText.split('\n')[0].trim())
                            : (sub.querySelector('.units__subitems-title span')?.innerText.trim() || sub.innerText.split('\n')[0].trim())
                    );
                    const subText = sub.innerText.toLowerCase();
                    const subTagText = (
                        isNewPortal()
                            ? (sub.querySelector('.child-type')?.innerText.trim() || 'Lesson')
                            : (sub.querySelector('.units__subitems-videos')?.innerText.trim() || 'Lesson')
                    );
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
                    
                    // New portal uses icon SVGs for status; old uses mat-icon with color styles
                    const isDone = !!(
                        sub.querySelector('.submitted-icon, .units__subitems-videos-done, mat-icon.done, .submitted, .units__subitems--completed, .completed') || 
                        sub.innerHTML.includes('done') ||
                        sub.innerHTML.includes('check_circle') ||
                        sub.querySelector('mat-icon[style*="rgb(46, 125, 50)"]') || 
                        sub.querySelector('mat-icon[style*="rgb(239, 108, 0)"]') ||
                        sub.querySelector('mat-icon[style*="rgb(103, 58, 183)"]') || 
                        sub.querySelector('.mat-icon-no-color.done') ||
                        sub.querySelector('.units__subitems--progress-icon.done') ||
                        // New portal: check for SVG icons with green/completed colors
                        (isNewPortal() && sub.querySelector('app-icon svg path[fill="#2e7d32"], app-icon svg path[fill="#4caf50"]'))
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
                { text: '🚀 ENABLE ACADEMIC OS (SPEEDY UI)', typeLabel: 'Action', el: null, action: 'enableAcademicOS' },
                { text: '🔄 RELOAD Extension (Developer)', typeLabel: 'Action', el: null, action: 'reloadExtension' }
            ];

            [
                ['↗ My Dashboard', 'navCurrentCourses'],
                ['↗ Completed & Pending Courses', 'navCompletedCourses'],
                ['↗ My Completed Projects', 'navProjects'],
                ['↗ Hall Ticket & Exam Cities', 'navHallTicket'],
                ['↗ Academic Calendar', 'navCalendar'],
                ['↗ Certificates', 'navCertificates'],
                ['↗ Documents for Download', 'navDocuments'],
                ['↗ Submitted Documents', 'navSubmittedDocs'],
                ['↗ Payments & Transactions', 'navPayments'],
                ['↗ Disciplinary Action', 'navDisciplinary'],
                ['↗ Latest Updates', 'navLatestUpdates'],
                ['↗ Issues & Queries', 'navSupport']
            ].forEach(([text, actionId]) => {
                actions.push({ text, typeLabel: 'Nav', el: null, action: actionId, group: 'DASHBOARD LINKS' });
            });

            actions.forEach(act => {
                allItems.push({
                    text: act.text,
                    breadcrumb: 'System Command',
                    el: null,
                    isSub: true,
                    typeLabel: act.typeLabel,
                    color: '#c2185b',
                    actionId: act.action,
                    group: act.group || 'SYSTEM COMMANDS'
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
                        toggleItemSelection(itemData);
                        persistSelectedItems();
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
                { name: 'Bulk Export All Weeks', key: 'B', run: () => {
                    isSpotlightOpen = false;
                    spotlight.style.display = 'none';
                    bulkScrapeAll();
                }, global: true },
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
                { name: 'Go to My Dashboard', key: 'H', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/current_courses', global: true },
                { name: 'Open Score Checker', key: 'O', run: () => window.location.href = 'https://score-checker-379619009600.asia-south1.run.app/course_wise', global: true },
                { name: 'Completed & Pending Courses', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_courses', global: true },
                { name: 'My Completed Projects', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_projects', global: true },
                { name: 'Hall Ticket & Exam Cities', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/exam_cities_and_hall_ticket', global: true },
                { name: 'Academic Calendar', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/calender', global: true },
                { name: 'Certificates', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_certificates', global: true },
                { name: 'Documents for Download', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_documents', global: true },
                { name: 'Submitted Documents', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/submitted_forms_and_receipt', global: true },
                { name: 'Payments & Transactions', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/pending_payment/list', global: true },
                { name: 'Disciplinary Action', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/student_disciplinary_action', global: true },
                { name: 'Latest Updates', key: 'NAV', run: () => window.location.href = 'https://ds.study.iitm.ac.in/student_dashboard/latest_updates', global: true },
                { name: 'Issues & Queries', key: 'NAV', run: () => window.location.href = 'https://study-supportdesk.freshdesk.com/support/login', global: true },
                { name: 'Exam Simulator (Path to S)', key: 'V', run: () => {
                    const selector = document.getElementById('iitm-exam-simulator');
                    if (selector) selector.remove();
                    showExamSimulator();
                }, global: true },
                { name: 'Global GPA Projector', key: 'G', run: () => showGlobalProjection(), global: true },
                { name: 'Strategic Command Center', key: 'Z', run: () => showStrategicHub(), global: true },
                { name: 'Feature Tour (What\'s New)', key: '?', run: () => showFeatureTour(), global: true },
                { name: 'Reload Extension', key: 'R', run: () => {
                    spotlight.style.display = 'none';
                    chrome.runtime.sendMessage({ action: 'reloadExtension' });
                }, global: true }
            ];
            if (item) {
                allActions.unshift(
                    { name: `Open "${item.text.substring(0,20)}..."`, key: '↵', run: () => triggerSelection(item) },
                    { name: 'Toggle Selection', key: 'Tab', run: () => {
                        toggleItemSelection(item);
                        persistSelectedItems();
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
            const count = document.querySelectorAll(sidebarSubItemSelector()).length;
            input.placeholder = count < 10 ? "Expand weeks in sidebar to search..." : "Search for apps and commands...";
        };

        // Filter chips logic
        spotlight.querySelectorAll('.filter-chip').forEach(chip => {
            chip.onclick = () => {
                spotlight.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeFilter = chip.dataset.filter;
                input.oninput(null, true); // preserveSelection = true when clicking filters
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
                const tag = (item.typeLabel || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                
                // INTERNAL FILTERING (Unified logic)
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
                    else if (activeFilter === 'selected') matchesFilter = isItemSelected(item);
                    else matchesFilter = false;
                }
                
                if (!matchesFilter) return { ...item, score: -1 };

                // Group assignments for renderResults
                let group = 'COURSE OUTLINE';
                if (item.group) group = item.group;
                else if (item.actionId && item.actionId.startsWith('nav')) group = 'DASHBOARD LINKS';
                else if (item.actionId || bread.includes('system')) group = 'SYSTEM COMMANDS';
                else if (isExam) group = 'PROGRAMMING EXAMS (OPPE/NPPE)';
                else if (tag.includes('video') && !isNote) group = 'LECTURE VIDEOS';
                else if (isGrPA) group = 'PROGRAMMING ASSIGNMENTS';
                else if (isQuiz) group = 'GRADED QUIZZES';
                else if (isGraded) group = 'GRADED ASSIGNMENTS';
                item.group = group;

                words.forEach(word => {
                    if (text === word) score += 100;
                    else if (text.startsWith(word)) score += 50;
                    else if (text.includes(word)) score += 10;
                    if (bread.includes(word)) score += 5;
                    if (tag.includes(word)) score += 5;
                    if (deep && deep.includes(word)) score += 3;
                });
                return { ...item, score };
            }).filter(item => item.score >= 0 && (words.length === 0 || item.score > 0))
              .sort((a, b) => b.score - a.score);

            renderResults(matches, preserveSelection);
        };

        input.onfocus = () => { 
            updatePlaceholder();
            const items = getItems();
            renderResults(items, true); 
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
                    
                    // AUTO-SYNC ALL COURSES FROM SCORE CHECKER TABLE
                    const rows = document.querySelectorAll('table tr');
                    rows.forEach(row => {
                        const courseCode = row.querySelector('td:nth-child(3)')?.innerText.trim();
                        const totalScore = parseFloat(row.querySelector('td:nth-child(4)')?.innerText.trim());
                        if (courseCode && !isNaN(totalScore)) {
                            const key = `iitm_scores_${courseCode}`;
                            chrome.storage.local.get(key, (data) => {
                                const current = data[key] || { assignments: [], quizzes: [], total: 0 };
                                if (current.total !== totalScore) {
                                    current.total = totalScore;
                                    chrome.storage.local.set({ [key]: current });
                                }
                            });
                        }
                    });
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

                    // Sync scores for Simulator
                    const quizScores = {};
                    rows.forEach(r => {
                        const name = r.querySelector('td:first-child')?.innerText.toLowerCase() || '';
                        const score = parseFloat(r.querySelector('td:last-child')?.innerText);
                        if (!isNaN(score)) {
                            if (name.includes('quiz 1')) quizScores.q1 = score;
                            if (name.includes('quiz 2')) quizScores.q2 = score;
                        }
                    });
                    if (Object.keys(quizScores).length > 0) {
                        const course = document.querySelector('.course-title')?.innerText || 'Active course';
                        chrome.storage.local.get('iitm_quiz_cache', (d) => {
                            const cache = d.iitm_quiz_cache || {};
                            cache[course] = { ...cache[course], ...quizScores };
                            chrome.storage.local.set({ iitm_quiz_cache: cache });
                        });
                    }
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
        const list = getSidebarList();
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

        // Gather Stats - Try portal's built-in summary first (works even with collapsed weeks)
        // Falls back to counting individual items if summary not found
        let stats = {
            videos: 0, totalVideos: 0,
            graded: 0, totalGraded: 0,
            grpa: 0, totalGrpa: 0,
            quizzes: 0, totalQuizzes: 0
        };

        // NEW PORTAL: Parse the portal's own summary from the sidebar header
        // Shows like "🎥 Videos: 0/27  📝 Graded: 0/2  💻 GrPA/GA: 0/10  🏆 Quizzes: 0/0"
        const summaryEl = document.querySelector('.graded-prog-completion, .progress-summary, .sidebar-summary');
        const summaryText = summaryEl ? summaryEl.innerText : document.querySelector('.side-nav-content')?.innerText || '';
        
        const parseSummary = (label) => {
            const regex = new RegExp(label + '[:\\s]*(\\d+)\\s*/\\s*(\\d+)', 'i');
            const match = summaryText.match(regex);
            if (match) return { done: parseInt(match[1]) || 0, total: parseInt(match[2]) || 0 };
            return null;
        };

        const videoSummary = parseSummary('Videos');
        const gradedSummary = parseSummary('Graded');
        const grpaSummary = parseSummary('GrPA/GA');
        const quizSummary = parseSummary('Quizzes');

        if (videoSummary || gradedSummary || grpaSummary || quizSummary) {
            // Use portal's own summary (accurate even with collapsed weeks)
            if (videoSummary) { stats.videos = videoSummary.done; stats.totalVideos = videoSummary.total; }
            if (gradedSummary) { stats.graded = gradedSummary.done; stats.totalGraded = gradedSummary.total; }
            if (grpaSummary) { stats.grpa = grpaSummary.done; stats.totalGrpa = grpaSummary.total; }
            if (quizSummary) { stats.quizzes = quizSummary.done; stats.totalQuizzes = quizSummary.total; }
        } else {
            // FALLBACK: Count individual items (only works for expanded weeks)
            let subItems = Array.from(document.querySelectorAll(sidebarSubItemSelector()));
            if (subItems.length === 0) {
                subItems = Array.from(document.querySelectorAll('app-course-unit-item'));
            }
        
        subItems.forEach(item => {
            const t = item.innerText.toLowerCase();
            const tag = item.querySelector(sidebarSubItemTypeSelector())?.innerText.toLowerCase() || '';
            // ULTIMATE Completion Detection: Checks icons, text, classes, and styles (Orange/Green/Purple)
            const isDone = !!(
                item.querySelector('.submitted-icon, .units__subitems-videos-done, mat-icon.done, .submitted, .units__subitems--completed, .completed') || 
                item.innerHTML.includes('done') ||
                item.innerHTML.includes('check_circle') ||
                item.querySelector('mat-icon[style*="rgb(46, 125, 50)"]') || 
                item.querySelector('mat-icon[style*="rgb(239, 108, 0)"]') ||
                item.querySelector('mat-icon[style*="rgb(103, 58, 183)"]') || // Purple GrPA done
                item.querySelector('.mat-icon-no-color.done') ||
                item.querySelector('.units__subitems--progress-icon.done') ||
                // New portal
                (isNewPortal() && item.querySelector('app-icon svg path[fill="#2e7d32"], app-icon svg path[fill="#4caf50"]'))
            );
            
            const parentWeek = item.closest(sidebarWeekSelectors());
            const weekText = parentWeek ? (parentWeek.querySelector(sidebarWeekTitleSelector())?.innerText || parentWeek.innerText).toLowerCase() : '';
            
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
        } // end fallback else

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



    // 4. DEADLINE OS HUD (Urgent tracking)
    const DEADLINE_THRESHOLD = 48 * 60 * 60 * 1000; // 48 Hours
    let discoveredDeadlines = []; 

    const injectDeadlineOS = () => {
        // Old portal selectors
        const dueElements = document.querySelectorAll('.gcb-submission-due-date, .due-date, .deadline');
        const now = new Date();

        dueElements.forEach(el => {
            const text = el.innerText;
            const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/);
            if (dateMatch) {
                const dueDate = new Date(dateMatch[0].includes('-') ? dateMatch[0] : dateMatch[0]); // Simple parse
                const diff = dueDate - now;
                
                if (diff > 0 && diff < DEADLINE_THRESHOLD) {
                    const title = (
                        isNewPortal()
                            ? (document.querySelector('.title-row .title')?.innerText || document.querySelector('.side-nav-title')?.innerText)
                            : (document.querySelector('.assignment-title, h1, .title, .units__subitems--selected .units__subitems-title')?.innerText)
                    ) || "Upcoming Assignment";
                    if (!discoveredDeadlines.find(d => d.title === title)) {
                        discoveredDeadlines.push({ title, date: dateMatch[0], dueDate, diff });
                    }
                }
            }
        });

        // New portal: parse app-submission-timer
        const newPortalTimer = document.querySelector('.submission-timer .due-label');
        if (newPortalTimer && isNewPortal()) {
            const timerText = newPortalTimer.innerText;
            const dueMatch = timerText.match(/Due\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) || 
                            timerText.match(/(\d{1,2}[a-z]{0,2}\s+[A-Za-z]+\s+\d{4})/i);
            if (dueMatch) {
                const dueDate = new Date(dueMatch[1]);
                const diff = dueDate - now;
                if (diff > 0 && diff < DEADLINE_THRESHOLD) {
                    const title = document.querySelector('.title-row .title')?.innerText || 
                                  document.querySelector('.side-nav-title')?.innerText || 
                                  "Upcoming Assignment";
                    if (!discoveredDeadlines.find(d => d.title === title)) {
                        discoveredDeadlines.push({ title, date: dueMatch[1], dueDate, diff });
                    }
                }
            }
        }

        if (discoveredDeadlines.length === 0) return;

        let hud = document.getElementById('iitm-deadline-hud');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'iitm-deadline-hud';
            hud.style.cssText = `
                position: fixed; bottom: 85px; right: 25px; z-index: 9999;
                display: flex; flex-direction: column; gap: 10px; pointer-events: none;
            `;
            document.body.appendChild(hud);
        }

        hud.innerHTML = discoveredDeadlines.map(d => {
            const timeLeft = d.dueDate - new Date();
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const mins = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            if (timeLeft <= 0) return '';
            
            return `
                <div style="
                    background: rgba(185, 28, 28, 0.95); backdrop-filter: blur(15px);
                    color: white; padding: 14px 20px; border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    min-width: 220px; animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: auto;
                    font-family: 'Inter', sans-serif;
                " onclick="this.remove()">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size: 9px; opacity: 0.7; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Deadline Critical</span>
                        <span style="width:8px; height:8px; background:#fff; border-radius:50%; box-shadow:0 0 10px #fff; animation: pulse 1.5s infinite;"></span>
                    </div>
                    <div style="font-size: 13px; font-weight: 800; margin-bottom: 10px; line-height: 1.3;">${d.title.split('\n')[0].substring(0,35)}</div>
                    <div style="display:flex; align-items:baseline; gap:4px;">
                        <span style="font-size: 24px; font-weight: 900; color: #fff;">${hours}</span>
                        <span style="font-size: 10px; opacity: 0.8; font-weight: 700;">HRS</span>
                        <span style="font-size: 24px; font-weight: 900; color: #fff; margin-left: 8px;">${mins}</span>
                        <span style="font-size: 10px; opacity: 0.8; font-weight: 700;">MINS</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    function showStrategicHub() {
        chrome.storage.local.get(null, (data) => {
            const courseKeys = Object.keys(data).filter(k => k.startsWith('iitm_scores_'));
            if (courseKeys.length === 0) {
                alert('No course data found! Visit your Course Pages to sync scores first.');
                return;
            }

            const quizCache = data.iitm_quiz_cache || {};
            const modal = document.createElement('div');
            modal.id = 'iitm-strat-hub';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(10, 10, 10, 0.98); backdrop-filter: blur(40px);
                z-index: 100000; color: white; font-family: 'Inter', sans-serif;
                display: flex; flex-direction: column; overflow-y: auto;
                animation: spotlightIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            `;

            let coursesHtml = '';
            courseKeys.forEach(key => {
                const name = key.replace('iitm_scores_', '');
                const scores = data[key];
                const sim = quizCache[name] || {};
                const avgA = (scores.assignments || []).reduce((a,b)=>a+b, 0) / (scores.assignments || []).length || 100;
                
                // Real Quiz data if available
                const realQuizzes = scores.quizzes || [];
                const q1Val = realQuizzes[0] !== undefined ? realQuizzes[0] : (sim.q1 || 80);
                const q2Val = realQuizzes[1] !== undefined ? realQuizzes[1] : (sim.q2 || 80);
                const q3Val = realQuizzes[2] !== undefined ? realQuizzes[2] : (sim.q3 || 80);

                coursesHtml += `
                    <div class="strat-row" data-course="${name}" style="background:rgba(255,255,255,0.03); padding:25px; border-radius:24px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                            <div>
                                <h3 style="margin:0; font-size:18px; color:#fff;">${name}</h3>
                                <div style="font-size:11px; opacity:0.5; margin-top:4px;">Asst Avg: ${avgA.toFixed(1)}% | ${realQuizzes.length > 0 ? 'Sync: OK' : 'No Quiz Data'}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:11px; opacity:0.5;">Target Grade</div>
                                <div id="target-grade-${name}" style="font-size:18px; font-weight:950; color:#db2777;">S</div>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px;">
                            ${[
                                {id:'Q1', type:'q1', val: q1Val},
                                {id:'Q2', type:'q2', val: q2Val},
                                {id:'Q3', type:'q3', val: q3Val},
                                {id:'Final', type:'final', val: sim.final || 80}
                            ].map(q => `
                                <div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                        <div style="font-size:9px; opacity:0.5; text-transform:uppercase; letter-spacing:1px;">${q.id}</div>
                                        ${(realQuizzes[['q1','q2','q3'].indexOf(q.type)] !== undefined) ? '<div style="font-size:8px; background:#64FFDA; color:#000; padding:1px 4px; border-radius:4px; font-weight:800;">ACTUAL</div>' : ''}
                                    </div>
                                    <input type="range" class="sim-input" data-course="${name}" data-type="${q.type}" min="0" max="100" value="${q.val}" style="width:100%; accent-color:#db2777;">
                                    <div style="text-align:center; font-size:12px; font-weight:800; margin-top:8px;" id="val-${name}-${q.type}">${q.val}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });

            modal.innerHTML = `
                <div style="max-width:900px; margin: 0 auto; width:100%; padding: 60px 20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:50px;">
                        <div>
                            <h1 style="margin:0; font-size:32px; font-weight:950; letter-spacing:-1px;">Strategic Command Hub <span style="font-size:12px; vertical-align:middle; background:#db2777; padding:4px 10px; border-radius:10px; margin-left:10px;">v2.0.0</span></h1>
                            <p style="margin:5px 0 0 0; opacity:0.5; font-size:14px;">Master your academic destiny across all active courses.</p>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:12px; opacity:0.5; text-transform:uppercase; letter-spacing:2px;">Target Term CGPA</div>
                            <div id="hub-cgpa" style="font-size:48px; font-weight:950; color:#64FFDA; line-height:1;">0.00</div>
                        </div>
                    </div>
                    
                    ${coursesHtml}

                    <div style="display:flex; gap:20px; margin-top:40px;">
                        <button id="sync-hub" style="flex:1; padding:20px; border-radius:16px; background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1); cursor:pointer; font-weight:800; transition:0.3s; font-size:15px; display:flex; align-items:center; justify-content:center; gap:10px;">
                            <span id="sync-spinner" style="display:none; width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span>
                            Force Global Sync
                        </button>
                        <button id="save-hub" style="flex:1; padding:20px; border-radius:16px; background:#db2777; color:white; border:none; cursor:pointer; font-weight:800; transition:0.3s; font-size:15px; box-shadow: 0 20px 60px rgba(219,39,119,0.3);">Commit Strategic Plan</button>
                    </div>
                    <button id="close-hub" style="margin-top:15px; width:100%; background:none; border:none; color:rgba(255,255,255,0.3); font-size:12px; cursor:pointer;">Dismiss Commander</button>
                </div>
            `;

            document.body.appendChild(modal);

            const update = () => {
                let totalGP = 0;
                let count = 0;
                const rows = modal.querySelectorAll('.strat-row');
                rows.forEach(row => {
                    const cName = row.dataset.course;
                    const scores = data[`iitm_scores_${cName}`];
                    const avgA = (scores.assignments || []).reduce((a,b)=>a+b, 0) / (scores.assignments || []).length || 100;
                    
                    const q1 = parseFloat(row.querySelector('[data-type="q1"]').value);
                    const q2 = parseFloat(row.querySelector('[data-type="q2"]').value);
                    const q3 = parseFloat(row.querySelector('[data-type="q3"]').value);
                    const fin = parseFloat(row.querySelector('[data-type="final"]').value);

                    document.getElementById(`val-${cName}-q1`).innerText = q1;
                    document.getElementById(`val-${cName}-q2`).innerText = q2;
                    document.getElementById(`val-${cName}-q3`).innerText = q3;
                    document.getElementById(`val-${cName}-final`).innerText = fin;

                    const qs = [q1, q2, q3].sort((a,b)=>b-a);
                    const best2 = (qs[0] + qs[1]) / 2;
                    const t = (0.1 * avgA) + (0.4 * best2) + (0.5 * fin);
                    
                    let g = 'U', gp = 0;
                    if (t >= 90) { g = 'S'; gp = 10; }
                    else if (t >= 80) { g = 'A'; gp = 9; }
                    else if (t >= 70) { g = 'B'; gp = 8; }
                    else if (t >= 60) { g = 'C'; gp = 7; }
                    else if (t >= 50) { g = 'D'; gp = 6; }
                    else if (t >= 40) { g = 'E'; gp = 4; }

                    document.getElementById(`target-grade-${cName}`).innerText = `${g} (${t.toFixed(1)})`;
                    totalGP += gp;
                    count++;
                });

                document.getElementById('hub-cgpa').innerText = (totalGP / count).toFixed(2);
            };

            modal.querySelectorAll('input').forEach(i => i.oninput = update);
            update();

            document.getElementById('save-hub').onclick = () => {
                const rows = modal.querySelectorAll('.strat-row');
                const newCaches = { ...quizCache };
                rows.forEach(row => {
                    const cName = row.dataset.course;
                    newCaches[cName] = {
                        q1: row.querySelector('[data-type="q1"]').value,
                        q2: row.querySelector('[data-type="q2"]').value,
                        q3: row.querySelector('[data-type="q3"]').value,
                        final: row.querySelector('[data-type="final"]').value,
                        avgA: (data[`iitm_scores_${cName}`].assignments || []).reduce((a,b)=>a+b, 0) / (data[`iitm_scores_${cName}`].assignments || []).length || 100
                    };
                });
                chrome.storage.local.set({ iitm_quiz_cache: newCaches }, () => {
                    showToast('Strategic Plan Committed to Memory');
                    modal.remove();
                });
            };

            document.getElementById('sync-hub').onclick = () => {
                const spinner = document.getElementById('sync-spinner');
                spinner.style.display = 'block';
                universalBackgroundSync().then(() => {
                    spinner.style.display = 'none';
                    showToast('Automatic Core Sync Successful');
                    modal.remove();
                    showStrategicHub(); // Reload
                });
            };

            document.getElementById('close-hub').onclick = () => modal.remove();

            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

      function syncCurrentPageScores() {
        // Source 1: Dashboard Cards (Multiple Courses)
        if (window.location.href.includes('student_dashboard/current_courses')) {
            const courseCards = document.querySelectorAll('.card, .course-card, mat-card');
            courseCards.forEach(card => {
                const titleEl = card.querySelector('h1, h2, h3, h4, .course-title, .course-name');
                const courseName = titleEl?.innerText.trim().substring(0, 30);
                if (!courseName) return;

                const scoreItems = Array.from(card.querySelectorAll('p, span, li')).filter(el => {
                    const txt = el.innerText;
                    return (txt.includes('Assignment') || txt.includes('Quiz')) && txt.includes('-');
                });

                if (scoreItems.length > 0) {
                    processScoreElements(courseName, scoreItems);
                }
            });
            return;
        }

        // Source 2: Active Course Page (Single Course)
        const courseName = (document.querySelector('.course-title, .course-header h1, h2.title')?.innerText || 'Active Content').trim().substring(0, 30);
        if (!courseName) return;
        const rawElements = Array.from(document.querySelectorAll('.assignment-text, .score-item, .qt-feedback .correct, .courses-assignment p, .card-body p, .completion-status, .graded-prog-completion'));
        processScoreElements(courseName, rawElements);
    }

    function processScoreElements(courseName, elements) {
        if (!chrome?.runtime?.id || !chrome?.storage?.local) return;

        const storageKey = `iitm_scores_${courseName}`;
        try {
            chrome.storage.local.get(null, (data) => {
                if (chrome.runtime?.lastError) return;

                const current = (data[storageKey] || { assignments: [], quizzes: [] });
                let updated = false;

                elements.forEach(el => {
                    const text = el.innerText.trim();
                    const scoreMatch = text.match(/(\d+(?:\.\d+)?)\s*\/\s*100/) || text.match(/-\s*(\d+(?:\.\d+)?)/);
                    const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

                    if (score !== null && !isNaN(score)) {
                        if (text.toLowerCase().includes('assignment') && !current.assignments.includes(score)) {
                            current.assignments.push(score);
                            updated = true;
                        } else if (text.toLowerCase().includes('quiz') && !current.quizzes.includes(score)) {
                            current.quizzes.push(score);
                            updated = true;
                        }
                    }
                });

                if (updated) {
                    chrome.storage.local.set({ [storageKey]: current }, () => {
                        if (chrome.runtime?.lastError) return;
                    });
                }
            });
        } catch (err) {
            console.info('IITM Engine: score sync skipped due to stale extension context.', err?.message || err);
        }
    }

    function showFeatureTour() {
        const modal = document.createElement('div');
        modal.id = 'iitm-feature-tour';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 520px; background: rgba(15, 15, 15, 0.98); 
            border: 1px solid rgba(255,255,255,0.1); border-radius: 28px;
            box-shadow: 0 50px 150px rgba(0,0,0,1); color: white;
            padding: 40px; z-index: 100005; font-family: 'Inter', sans-serif;
            backdrop-filter: blur(30px); animation: spotlightIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        
        modal.innerHTML = `
            <div style="text-align:center; margin-bottom:30px;">
                <div style="font-size: 10px; font-weight: 800; color: #db2777; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Academic Engine v2.0</div>
                <div style="font-size: 28px; font-weight: 950; letter-spacing: -1px;">Unlock Your Full Potential</div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:24px;">
                <div style="display:flex; gap:18px; align-items:start;">
                    <div style="background:rgba(219,39,119,0.1); color:#db2777; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:22px; border:1px solid rgba(219,39,119,0.2);">🎓</div>
                    <div>
                        <div style="font-weight:800; font-size:16px; margin-bottom:4px; color:#fff;">Strategic Command Center (⌘ K → P)</div>
                        <div style="font-size:12px; opacity:0.6; line-height:1.6;">Your multi-course war room. Simulate target grades across every active course simultaneously. Features real-time sync with Score Checker and live CGPA projections.</div>
                    </div>
                </div>
                
                <div style="display:flex; gap:18px; align-items:start;">
                    <div style="background:rgba(220, 38, 38, 0.1); color:#dc2626; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:22px; border:1px solid rgba(220,38,38,0.2);">🚨</div>
                    <div>
                        <div style="font-weight:800; font-size:16px; margin-bottom:4px; color:#fff;">Deadline HUD (Automated)</div>
                        <div style="font-size:12px; opacity:0.6; line-height:1.6;">Never miss a submission. A persistent, urgent HUD appears in the bottom-right when a deadline is within 48 hours for any currently open course unit.</div>
                    </div>
                </div>

                <div style="display:flex; gap:18px; align-items:start;">
                    <div style="background:rgba(234, 179, 8, 0.1); color:#eab308; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:22px; border:1px solid rgba(234,179,8,0.2);">⚡</div>
                    <div>
                        <div style="font-weight:800; font-size:16px; margin-bottom:4px; color:#fff;">Universal Spotlight (⌘ K)</div>
                        <div style="font-size:12px; opacity:0.6; line-height:1.6;">Instant command palette for everything. Quick jumping: Press <b>H</b> for Home Dashboard or <b>S</b> for Score Checker directly from the menu.</div>
                    </div>
                </div>
            </div>

            <button id="close-tour" style="width:100%; height:48px; background:#db2777; border:none; border-radius:16px; color:white; font-weight:800; margin-top:35px; cursor:pointer; font-size:15px; transition:0.3s; box-shadow: 0 10px 40px rgba(219,39,119,0.3);">Got it, let's crush it!</button>
            <div style="text-align:center; margin-top:15px; font-size:10px; opacity:0.4;">Built for IIT Madras Scholars • Press ESC to close</div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('close-tour').onclick = () => modal.remove();
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    function showGlobalProjection() {
        chrome.storage.local.get(null, (data) => {
            const courseKeys = Object.keys(data).filter(k => k.startsWith('iitm_scores_'));
            if (courseKeys.length === 0) {
                alert('No course data found! Visit your Course Pages to sync scores first.');
                return;
            }

            let totalPoints = 0;
            let coursesCount = 0;
            let detailHtml = '';

            const quizCache = data.iitm_quiz_cache || {};
            
            courseKeys.forEach(key => {
                const courseData = data[key];
                const scores = courseData.assignments || [];
                const courseName30 = key.replace('iitm_scores_', '');
                const sim = quizCache[courseName30]; // Match simulator data by name
                
                // Current Avg
                const currentAvg = courseData.total !== undefined ? courseData.total : (scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0);
                
                // Project Path (Using Simulator if available)
                let finalT = currentAvg;
                let isSimulated = false;
                
                if (sim) {
                    const q = [parseFloat(sim.q1)||0, parseFloat(sim.q2)||0, parseFloat(sim.q3)||0].sort((a,b)=>b-a);
                    const best2 = (q[0] + q[1]) / 2;
                    const avgA = parseFloat(sim.avgA) || currentAvg;
                    const offset = parseFloat(sim.offset) || 0;
                    // Formula: 10% Assignment + 40% Best-2-Quiz (20 each) + 50% Final (Assuming same as Best2 for path)
                    finalT = (0.1 * avgA) + (0.4 * best2) + (0.5 * best2) + offset;
                    isSimulated = true;
                }

                function getGP(val) {
                    if (val >= 90) return { gp: 10, g: 'S' };
                    if (val >= 80) return { gp: 9, g: 'A' };
                    if (val >= 70) return { gp: 8, g: 'B' };
                    if (val >= 60) return { gp: 7, g: 'C' };
                    if (val >= 50) return { gp: 6, g: 'D' };
                    if (val >= 40) return { gp: 4, g: 'E' };
                    return { gp: 0, g: 'U' };
                }

                const currentRes = getGP(currentAvg);
                const projectedRes = getGP(finalT);

                totalPoints += projectedRes.gp;
                coursesCount++;
                
                const simBadge = isSimulated ? `<span style="background:#db2777; color:#fff; font-size:9px; padding:2px 6px; border-radius:10px; margin-left:8px;">SIMULATED</span>` : '';
                
                detailHtml += `
                    <div style="display:flex; flex-direction:column; padding:15px; border-bottom:1px solid #222; background:rgba(255,255,255,0.02); margin-bottom:8px; border-radius:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="color:#eee; font-weight:bold; font-size:14px;">${courseName30} ${simBadge}</span>
                            <span style="color:#64FFDA; font-weight:bold; font-size:16px;">${projectedRes.g} (${projectedRes.gp})</span>
                        </div>
                        <div style="display:flex; gap:20px; font-size:11px; color:#888;">
                            <span>Current: ${currentRes.g} (${currentAvg.toFixed(1)})</span>
                            <span style="color:${isSimulated ? '#db2777' : '#888'}">Potential Path: ${finalT.toFixed(1)}</span>
                        </div>
                    </div>
                `;
            });

            const cgpa = (totalPoints / coursesCount).toFixed(2);
            const overlay = document.createElement('div');
            overlay.id = 'iitm-gpa-modal';
            overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px);";
            overlay.innerHTML = `
                <div style="background:#111; width:500px; padding:30px; border-radius:15px; border:1px solid #333; color:#fff; font-family:sans-serif; box-shadow:0 10px 50px rgba(0,0,0,0.5);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h2 style="margin:0; font-size:24px; color:#64FFDA;">Global GPA Projector</h2>
                        <button id="close-gpa" style="background:none; border:none; color:#aaa; font-size:24px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="text-align:center; margin-bottom:30px; padding:20px; background:#1a1a1a; border-radius:20px; border:1px solid #333;">
                        <div style="font-size:12px; color:#aaa; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;">Projected Term CGPA</div>
                        <div style="font-size:54px; font-weight:950; color:#64FFDA; margin:0; letter-spacing:-2px;">${cgpa}</div>
                        <div style="font-size:12px; color:#888; margin-top:10px;">Strategic path based on current performance & simulations</div>
                    </div>
                    <div style="max-height:200px; overflow-y:auto; margin-bottom:20px; border-radius:10px; background:#080808;">
                        ${detailHtml}
                    </div>
                    <button id="close-gpa-btn" style="width:100%; padding:15px; border-radius:8px; border:none; background:#64FFDA; color:#000; font-weight:bold; cursor:pointer;">Great, Thanks!</button>
                </div>
            `;
            document.body.appendChild(overlay);
            const close = () => overlay.remove();
            document.getElementById('close-gpa').onclick = close;
            document.getElementById('close-gpa-btn').onclick = close;
        });
    }

    function showAcademicHeatmap() {
        chrome.storage.local.get(null, (data) => {
            const courseKeys = Object.keys(data).filter(k => k.startsWith('iitm_scores_'));
            
            // Generate Grid
            let gridHtml = '';
            const labels = ['Assignments', 'Quizzes', 'Projects', 'Videos']; // Projects and Videos are placeholders for now
            
            for (let r = 0; r < labels.length; r++) {
                gridHtml += `<div style="display:flex; align-items:center; margin-bottom:4px;">`;
                gridHtml += `<div style="width:80px; font-size:10px; color:#666; text-transform:uppercase;">${labels[r]}</div>`;
                for (let w = 1; w <= 12; w++) {
                    let completed = false;
                    courseKeys.forEach(k => {
                        const c = data[k];
                        if (r === 0 && (c.assignments || []).length >= w) completed = true; // Assignments
                        if (r === 1 && (c.quizzes || []).length >= w) completed = true;    // Quizzes
                        // Add logic for Projects/Videos if data becomes available
                    });
                    
                    const color = completed ? '#64FFDA' : '#222';
                    const title = completed ? `Week ${w} Completed` : `Week ${w} Pending`;
                    gridHtml += `<div title="${title}" style="width:20px; height:20px; margin:2px; background:${color}; border-radius:3px; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>`;
                }
                gridHtml += `</div>`;
            }

            const overlay = document.createElement('div');
            overlay.id = 'iitm-heatmap-modal';
            overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:100000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(40px);";
            overlay.innerHTML = `
                <div style="background:#111; padding:30px; border-radius:20px; border:1px solid #333; color:#fff; font-family:sans-serif;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <div>
                            <h2 style="margin:0; font-size:22px;">Academic Progress Heatmap</h2>
                            <div style="font-size:12px; color:#888;">12-Week Course Milestone Tracker</div>
                        </div>
                        <button id="close-heat" style="background:none; border:none; color:#aaa; font-size:24px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="background:#080808; padding:20px; border-radius:10px; margin-bottom:20px;">
                        <div style="display:flex; margin-left:80px; margin-bottom:10px;">
                            ${Array.from({length:12}, (_,i)=>`<div style="width:24px; text-align:center; font-size:10px; color:#555;">W${i+1}</div>`).join('')}
                        </div>
                        ${gridHtml}
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; color:#888;">
                        <span>Progress based on all courses synced to date</span>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="display:flex; align-items:center; gap:5px;"><div style="width:10px; height:10px; background:#222; border-radius:2px;"></div> Pending</div>
                            <div style="display:flex; align-items:center; gap:5px;"><div style="width:10px; height:10px; background:#64FFDA; border-radius:2px;"></div> Done</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            document.getElementById('close-heat').onclick = () => overlay.remove();
        });
    }

    // Auto-Loader loop (Reduced frequency for site speed)
    setInterval(() => {
        setupSpotlightListeners();
        if (!document.getElementById('iitm-header-utils')) injectHeaderUtils();
        if (!document.getElementById('iitm-header-search')) injectHeaderSearch();
        if (!document.getElementById('iitm-spotlight')) injectSpotlight();
        if (!document.getElementById('iitm-focus-bar-container')) injectFocusBar();
        injectProgressTracker(); 
        injectDeadlineOS();
        injectScoreCheckerTools(); 
        autoCloseSidebar();
        
        // AUTO-SYNC SCORES
        if (window.location.href.includes('course') || window.location.href.includes('dashboard')) {
             syncCurrentPageScores();
        }
    }, 2500);

    // 🏆 UNIVERSAL BACKGROUND SYNC (The "Automatic" Engine)
    // Silently fetches and parses the Score Checker without navigating there.
    async function universalBackgroundSync() {
        if (window.location.hostname.includes('score-checker')) return; 
        if (!chrome?.runtime?.id) return;
        const verboseEngineLogs = localStorage.getItem('iitm-engine-debug') === 'true';

        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ action: 'fetchScores' }, (response) => {
                    const runtimeError = chrome.runtime?.lastError;
                    if (runtimeError) {
                        if (verboseEngineLogs) console.info('IITM Engine: Universal Sync skipped:', runtimeError.message);
                        resolve();
                        return;
                    }

                    if (response?.success && response?.data) {
                        const html = response.data;
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        const rows = doc.querySelectorAll('table tr');
                        let foundAny = false;

                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length < 4) return;
                            const courseCode = cells[2]?.innerText.trim();
                            const totalScore = parseFloat(cells[3]?.innerText.trim());

                            if (courseCode && !isNaN(totalScore)) {
                                foundAny = true;
                                const key = `iitm_scores_${courseCode}`;
                                chrome.storage.local.get(key, (data) => {
                                    if (chrome.runtime?.lastError) return;
                                    const current = data[key] || { assignments: [], quizzes: [], total: 0 };
                                    if (current.total !== totalScore) {
                                        current.total = totalScore;
                                        chrome.storage.local.set({ [key]: current }, () => {
                                            if (chrome.runtime?.lastError) return;
                                        });
                                    }
                                });
                            }
                        });

                        if (foundAny && verboseEngineLogs) console.log('IITM Engine: Universal Sync Successful (Background)');
                        resolve();
                    } else {
                        if (verboseEngineLogs) console.log('IITM Engine: Universal Sync (Background) offline or session expired.');
                        resolve();
                    }
                });
            } catch (err) {
                if (verboseEngineLogs) console.info('IITM Engine: Universal Sync aborted due to stale extension context.');
                resolve();
            }
        });
    }

    // Run universal sync once on load, then every 30 mins
    universalBackgroundSync();
    setInterval(universalBackgroundSync, 30 * 60 * 1000); 

    // Global Trigger for Bulk Export
    window.addEventListener('iitm-trigger-bulk-export', bulkScrapeAll);
})();
