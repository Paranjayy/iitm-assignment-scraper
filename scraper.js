(function () {
    // Turndown library is now pre-loaded via content script
    function runExporter() {
        if (typeof TurndownService === 'undefined') {
            alert('⚠️ Turndown library not loaded. Please reload the page and try again.');
            return;
        }
        console.log('IITM Scraper Extension: Initializing...');

        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            emDelimiter: '*'
        });

        // Ensure tables are preserved as HTML for better layout
        turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);

        // Custom rule to handle Katex math
        turndownService.addRule('katex-math', {
            filter: (node) => node.nodeName === 'SPAN' && node.classList.contains('katex'),
            replacement: (content, node) => {
                const tex = node.querySelector('annotation[encoding="application/x-tex"]');
                if (!tex) return content;

                // Check if it's a block math element or contains newlines
                const isBlock = node.closest('.math.block') || tex.textContent.includes('\\begin') || tex.textContent.includes('\\\\');
                const math = tex.textContent.trim();

                return isBlock ? `\n\n$$\n${math}\n$$\n\n` : `$${math}$`;
            }
        });

        let markdown = "";
        let detectedWeek = "";
        function scrapeAssignment() {
            console.log("Scraping started...");
            
            // Check if we are in a Programming Assignment (GrPA)
            const progContainer = document.querySelector('app-programming-code-editor');
            
            if (progContainer) {
                return scrapeProgrammingAssignment();
            } else {
                return scrapeRegularAssignment();
            }
        }

        function scrapeRegularAssignment() {
            // FALLBACK: For Mathematics/Regular Assignments
            const title = document.querySelector('.units__subitems-title span')?.innerText || "Assignment";
            const questions = Array.from(document.querySelectorAll('.question-container, mat-card, .mcq-question'));
            
            let markdown = `# ${title}\n\n`;
            
            if (questions.length === 0) {
                // Simple fallback to entire main content if no question containers found
                const mainContent = document.querySelector('main') || document.body;
                const turndownService = new TurndownService();
                markdown += turndownService.turndown(mainContent.innerHTML);
            } else {
                questions.forEach((q, i) => {
                    const turndownService = new TurndownService();
                    markdown += `## Question ${i + 1}\n\n${turndownService.turndown(q.innerHTML)}\n\n---\n\n`;
                });
            }
            
            downloadMarkdown(markdown, `${title.replace(/\s+/g, '_')}.md`);
        }

        function scrapeProgrammingAssignment() {
            const title = document.querySelector('.programming-code-editor-container .title')?.innerText || 
                          document.querySelector('.units__subitems-title span')?.innerText || 
                          "GrPA_Assignment";
            // The rest of the GrPA scraping logic would go here,
            // but for now, we'll just return the title.
            // This function will be further developed.
            return title;
        }

        let assignmentTitle = (
            document.querySelector('.left-content .assignment-title') ||
            document.querySelector('.assignment-title') ||
            document.querySelector('.modules__content-head-title')
        )?.innerText.trim() || 'Graded Assignment';

        let courseTitle = (
            document.querySelector('.course-title') ||
            document.querySelector('app-header .header .content .course-title') ||
            document.querySelector('.modules__content-head-title div:first-child')
        )?.innerText.trim() || 'Course';

        // Custom titles for Score Checker
        if (window.location.hostname.includes('score-checker')) {
            assignmentTitle = document.querySelector('.navbar-brand')?.innerText.trim() || 'Score Checker';
            courseTitle = 'IITM Degree';
            
            // Check if we can refine the title for detailed views
            if (window.location.pathname.includes('view_score')) {
                // Look for course code in the page text (common pattern: CS1002, HS1001, etc.)
                const courseMatch = document.body.innerText.match(/[A-Z]{2}\d{4}/);
                if (courseMatch) assignmentTitle = `${courseMatch[0]} - Detailed Results`;
                else assignmentTitle += ' - Detailed Results';
            }
        }
            
        // Prioritize the Sidebar title if known (passed via bulk scraper)
        assignmentTitle = window.__bulkScrapeTitle || assignmentTitle;

        markdown += `# ${assignmentTitle}\n\n`;
        markdown += `> **Course:** ${courseTitle}\n\n`;

        async function scrapeContent() {
            const includeAssets = localStorage.getItem('iitm-include-assets') === 'true';
            window.__capturedImages = [];

            // --- DEEP BREADCRUMB DETECTION (Shared for all modes) ---
            detectedWeek = "";
            try {
                const openedSubItem = document.querySelector('.units__subitems-text.opened, .units__subitems-text.opened-btn');
                detectedWeek = openedSubItem?.closest('.units__items')?.querySelector('.units__items-title')?.innerText.trim() || '';
            } catch (e) {}

            // Prioritize the Sidebar title if known (passed via bulk scraper)
            assignmentTitle = window.__bulkScrapeTitle || assignmentTitle;

            // Metadata extraction complete. DO NOT prepend to markdown yet.
            if (window.location.hostname.includes('score-checker')) {
                const mode = window.__scraperMode || 'single';
                if (mode === 'consolidateAll') {
                    await scrapeScoreCheckerAll();
                    return;
                }

                console.log('IITM Scraper: Processing Score Checker...');
                
                const alerts = Array.from(document.querySelectorAll('.alert')).map(a => a.innerText.trim());
                if (alerts.length > 0) {
                    markdown += `> ${alerts.join('\n> ')}\n\n`;
                }

                const table = document.querySelector('table');
                if (table) {
                    const tableClone = table.cloneNode(true);
                    
                    // Remove "VIEW" column from overview table
                    const headers = Array.from(tableClone.querySelectorAll('thead th'));
                    const viewIndex = headers.findIndex(th => th.innerText.trim().toUpperCase() === 'VIEW');
                    
                    if (viewIndex !== -1) {
                        tableClone.querySelectorAll('tr').forEach(tr => {
                            const cells = tr.querySelectorAll('th, td');
                            if (cells[viewIndex]) cells[viewIndex].remove();
                        });
                    }

                    processNode(tableClone);
                    markdown += turndownService.turndown(tableClone.outerHTML) + '\n\n';

                    // ADD GRADE PROJECTION TO MARKDOWN
                    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
                    let gradedTotal = 0, gradedCount = 0;
                    rows.forEach(r => {
                        const scoreStr = r.querySelector('td:last-child')?.innerText.trim();
                        const score = parseFloat(scoreStr);
                        if (!isNaN(score)) { gradedTotal += score; gradedCount++; }
                    });
                    if (gradedCount > 0) {
                        const totalCount = rows.length;
                        const remainingCount = totalCount - gradedCount;
                        const avg = (gradedTotal / gradedCount).toFixed(2);
                        const reqForS = remainingCount > 0 ? Math.max(0, (85 * totalCount - gradedTotal) / remainingCount).toFixed(2) : 'N/A';
                        markdown += `### 🎯 Grade Projection\n`;
                        markdown += `- **Current Quiz Average:** \`${avg}\`\n`;
                        markdown += `- **Remaining Needed for 'S' Grade:** \`${reqForS}\` (average needed in remaining ${remainingCount} quizzes/exams)\n\n`;
                    }
                } else {
                    markdown += `*No score table found.*\n\n`;
                }
                
                finalizeExport();
                return;
            }

            if (window.__scraperMode === 'exportSyllabus') {
                await scrapeSyllabus();
                return;
            }

            if (window.__scraperMode === 'copyToClipboard' || window.__scraperMode === 'capture') {
                console.log('IITM Scraper: Fast Scraping Mode...');
            }
            // --- End Specialized Handling ---

            // UI Synchronization: Wait for the main dynamic layout or spinner to settle
            for (let initW = 0; initW < 40; initW++) {
                const spinner = document.querySelector('mat-spinner, .spinner, [role="progressbar"]');
                const tabsAlive = document.querySelectorAll('app-tab-bar .tab-item').length > 0;
                const vidAlive = document.querySelectorAll('.transcript .cue').length > 0;
                const qAlive = document.querySelectorAll('.gcb-question-row, .question-container, mat-card:not(.mat-mdc-card)').length > 0;
                
                if (!spinner && (tabsAlive || vidAlive || qAlive)) {
                    await new Promise(r => setTimeout(r, 150)); // Tiny layout breather (Optimized)
                    break;
                }
                await new Promise(r => setTimeout(r, 100)); // Faster polling
            }

            const tabButtons = document.querySelectorAll('app-tab-bar .tab-item');

            // Helper to sync Ace editor values to data attributes
            // This now sends a message to the background script to run in the MAIN world
            const syncAce = async () => {
                console.log('Syncing Ace editors...');
                return new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn('⚠️ syncAce timed out. Falling back to DOM extraction.');
                        resolve({ success: false, timeout: true });
                    }, 5000); // 5s timeout to avoid freezing if background is busy

                    chrome.runtime.sendMessage({ action: 'syncAce' }, (response) => {
                        clearTimeout(timeout);
                        if (chrome.runtime.lastError) {
                            console.error('❌ syncAce message error:', chrome.runtime.lastError);
                        }
                        resolve(response || { success: false });
                    });
                });
            };

            const initialTabs = document.querySelectorAll('app-tab-bar .tab-item');
            const transcriptCues = document.querySelectorAll('.transcript .cue');
            const ytIframe = document.querySelector('iframe#player');
            
            if (ytIframe && transcriptCues.length > 0) {
                const src = ytIframe.src;
                let wtLink = "";
                let thumbLink = "";
                // Try to extract the video ID
                const vidMatch = src.match(/embed\/([^?]+)/);
                if (vidMatch && vidMatch[1]) {
                    const vidId = vidMatch[1];
                    wtLink = `https://www.youtube.com/watch?v=${vidId}`;
                    thumbLink = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
                } else {
                    wtLink = src;
                }
                
                if (thumbLink) markdown += `![Lecture Thumbnail](${thumbLink})\n\n`;
                markdown += `> 🎥 **Video Link:** [Watch on YouTube](${wtLink})\n\n`;
                
                console.log(`Lecture page detected, scraping ${transcriptCues.length} transcript segments...`);
                markdown += `## 📜 Lecture Transcript\n\n`;
                
                transcriptCues.forEach(cue => {
                    const spans = cue.querySelectorAll('span');
                    if (spans.length >= 2) {
                        const time = spans[0]?.innerText.trim();
                        const text = spans[1]?.innerText.trim();
                        if (time && text) {
                            markdown += `**[${time}]** ${text}  \n`;
                        }
                    }
                });

                // INDEX TRANSCRIPT FOR DEEP SEARCH
                const transcriptText = Array.from(transcriptCues).map(c => c.innerText.replace(/\s+/g, ' ').trim()).join(' ');
                if (transcriptText) {
                    chrome.runtime.sendMessage({
                        action: 'indexTranscript',
                        data: {
                            title: assignmentTitle,
                            course: courseTitle,
                            url: window.location.href,
                            text: transcriptText
                        }
                    });
                }
                
                return finalizeExport(); // Return early for Videos
            }

            if (initialTabs.length > 0) {
                console.log(`%c[GRPA SCRAPER] Detected ${initialTabs.length} tabs. Starting high-fidelity extraction...`, 'color: #db2777; font-weight: bold; font-size: 14px;');
                
                // GLOBAL DE-DUPLICATION: Ensures we literally never print the exact same piece of code twice across tabs
                const capturedCodes = new Set();
                let editorMarkdown = '';

                for (let i = 0; i < initialTabs.length; i++) {
                    const currentBtn = document.querySelectorAll('app-tab-bar .tab-item')[i];
                    if (!currentBtn) continue;
                    
                    const tabName = currentBtn.innerText.trim();
                    const cleanTabName = tabName.toLowerCase().replace(/\s+/g, '');
                    
                    // DEEP LOCKED CHECK: If the tab itself is disabled/locked, do not attempt to open it.
                    // This prevents ghosting content from the previous tab (the Week 6 issue you saw).
                    const isDisabled = currentBtn.classList.contains('disabled') || currentBtn.hasAttribute('disabled') || currentBtn.getAttribute('aria-disabled') === 'true';
                    if (isDisabled) {
                        console.warn(`  └─ 🔒 Tab "${tabName}" is locked (disabled by portal).`);
                        if (cleanTabName.includes('solution')) {
                            markdown += `### 💻 IITM Official Solution\n\n> *Solution code is currently locked and will be available after the deadline.*\n\n---\n\n`;
                        }
                        continue;
                    }

                    const startTimeTab = Date.now();
                    console.log(`%c[STAGE ${i+1}/${initialTabs.length}] Opening: ${tabName}`, 'color: #3b82f6; font-weight: bold; padding: 4px; border-left: 4px solid #3b82f6;');

                    currentBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    currentBtn.click();
                    
                    // Wait for tab content and verify (Smart Polling)
                    let tabSwitched = false;
                    for (let attempt = 0; attempt < 30; attempt++) {
                        await new Promise(r => setTimeout(r, 200)); 
                        const activeTabNode = document.querySelector('app-tab-bar .tab-item.active');
                        // Jump-start if content already exists even if "active" class hasn't hit
                        const contentCheck = document.querySelector('.left-content, .test-case-type-block, .ace_editor');
                        if ((activeTabNode && activeTabNode.innerText.trim().toLowerCase() === tabName.toLowerCase()) || (contentCheck && attempt > 5)) {
                            await new Promise(r => setTimeout(r, 200)); // Layout breather
                            tabSwitched = true; break;
                        }
                    }
                    if (!tabSwitched) {
                        console.warn(`%c  ⚠ Tab switch timed out for ${tabName}. Content might be missing.`, 'color: #f59e0b;');
                    }
                    
                    await syncAce();

                    try {
                        if (cleanTabName === 'testcases') {
                            console.log(`  └─ ⚙️ Parsing Test Case Subgroups...`);
                            const testTypes = document.querySelectorAll('.test-case-type-block');
                            if (testTypes.length > 0) {
                                let seenContent = new Set();
                                for (const typeBtn of testTypes) {
                                    // Fixes formatting like "Private Tests (\n 14/14 \n)" to be inline
                                    const typeName = typeBtn.innerText.trim().replace(/\s+/g, ' ');
                                    const isLocked = typeBtn.querySelector('.locked-case, .lock-img, app-icon[aria-label="Locked"]');
                                    
                                    if (isLocked) {
                                        markdown += `#### 🔒 ${typeName}\n\n> *This test case group is locked and will be revealed after the deadline.*\n\n---\n\n`;
                                        console.log(`    │  └─ 🔒 Group ${typeName} is locked. Skipping.`);
                                        continue;
                                    }

                                    const isAlreadyActive = typeBtn.classList.contains('active') || typeBtn.getAttribute('aria-selected') === 'true';
                                    
                                    console.log(`    ├─ Subgroup: ${typeName}`);
                                    const oldFirstCase = document.querySelector('.case-btn');
                                    typeBtn.click();
                                    
                                    if (!isAlreadyActive) {
                                        for (let sw = 0; sw < 25; sw++) { // Up to 5s
                                            const newFirstCase = document.querySelector('.case-btn');
                                            if (newFirstCase && newFirstCase !== oldFirstCase) break;
                                            await new Promise(r => setTimeout(r, 150));
                                        }
                                    }

                                    const caseButtons = Array.from(document.querySelectorAll('.case-btn'));
                                    console.log(`    │  └─ Found ${caseButtons.length} cases in this group.`);
                                    
                                    let typeMarkdown = `### ${typeName}\n\n`;
                                    let groupAdded = false;

                                    for (let j = 0; j < caseButtons.length; j++) {
                                        const currentCaseBtn = caseButtons[j];
                                        if (!currentCaseBtn) continue;

                                        const caseName = currentCaseBtn.innerText.trim();
                                        console.log(`    │     - Processing Case ${j+1}/${caseButtons.length}: ${caseName}`);
                                        
                                        const oldContent = document.querySelector('.test-case-block-content')?.innerText;
                                        const isCaseActive = currentCaseBtn.classList.contains('active') || currentCaseBtn.getAttribute('aria-selected') === 'true';
                                        
                                        currentCaseBtn.click();
                                        
                                        if (!isCaseActive) {
                                            for (let scw = 0; scw < 15; scw++) { // Up to 2.2s
                                                const currentContent = document.querySelector('.test-case-block-content')?.innerText;
                                                if (currentContent && currentContent !== oldContent) break;
                                                await new Promise(r => setTimeout(r, 150));
                                            }
                                        }
                                        
                                        const currentCaseBlocks = document.querySelectorAll('.test-case-block');
                                        currentCaseBlocks.forEach(block => {
                                            const titleText = block.querySelector('.test-case-block-title')?.innerText.trim();
                                            const contentText = block.querySelector('.test-case-block-content')?.innerText.trim();
                                            if (titleText && contentText) {
                                                const fingerPrint = `${titleText}:${contentText}`;
                                                if (!seenContent.has(fingerPrint)) {
                                                    if (!groupAdded) { markdown += typeMarkdown; groupAdded = true; }
                                                    markdown += `#### ${caseName}\n\n`;
                                                    markdown += `**${titleText}:**\n\`\`\`text\n${contentText}\n\`\`\`\n\n`;
                                                    seenContent.add(fingerPrint);
                                                }
                                            }
                                        });
                                    }
                                }
                            } else {
                                console.log(`  └─ 🗒️ No subgroup buttons. Standard content dump...`);
                                const leftContent = document.querySelector('.left-content');
                                if (leftContent) {
                                    const clone = await processNode(leftContent.cloneNode(true));
                                    markdown += turndownService.turndown(clone.innerHTML) + '\n\n';
                                }
                            }
                        } else {
                            console.log(`  └─ 📄 Capturing pane content...`);
                            const leftContent = document.querySelector('.left-content');
                            const rightPanel = document.querySelector('.right-panel');
                            
                            const contentSource = leftContent || document.querySelector('.mat-tab-body-active .mat-mdc-card-content, .mat-tab-body-active .problem-content, .mat-tab-body-active');
                            if (contentSource) {
                                const clone = await processNode(contentSource.cloneNode(true));
                                // SCRUB: We only remove UI elements. WE DO NOT remove <pre> blocks anymore 
                                // to ensure Template Code isn't accidentally deleted.
                                clone.querySelectorAll('app-tab-bar, button, .mat-mdc-tab-header, .ace_gutter, .ace_content, textarea.ace_text-input').forEach(el => el.remove());
                                
                                const dumpedText = turndownService.turndown(clone.innerHTML).trim();
                                if (dumpedText) {
                                    // If we are in the Solution tab, this text dump IS the Official Solution content
                                    if (cleanTabName.includes('solution') && dumpedText.length > 50) {
                                        markdown += `### 💻 IITM Official Solution\n\n${dumpedText}\n\n---\n\n`;
                                    } else {
                                        markdown += dumpedText + '\n\n';
                                    }
                                }
                                console.log(`  │  └─ Captured ${cleanTabName} text bytes: ${markdown.length}`);
                            }
                            
                            const nameLower = tabName.toLowerCase();
                            // W6 FIX: If solution is locked, we MUST capture his code while scraping the Question tab
                            if ((nameLower.includes('solution') || nameLower.includes('submission') || nameLower.includes('question')) && (rightPanel || document.querySelector('.mat-tab-body-active .ace_editor'))) {
                                // Verify if solution is locked/not released yet
                                const isLocked = document.body.innerText.toLowerCase().includes('solution will be available') || 
                                                 document.body.innerText.toLowerCase().includes('released after the deadline');
                                                 
                                if (isLocked && nameLower.includes('solution')) {
                                    console.warn(`  └─ 🔒 Solution is locked. Skipping code capture.`);
                                    markdown += `\n> *Solution code is currently locked and will be available after the deadline.*\n\n`;
                                } else {
                                    console.log(`  └─ ⌨️ Capturing all visible code editors...`);
                                    await syncAce();
                                    
                                    // Find ALL editors. Scoped to either the active tab body OR the right-panel submission area.
                                    // NO app-code-editor to prevent the wrapper node from returning duplicated values.
                                    const editorNodes = Array.from(document.querySelectorAll('.mat-tab-body-active .ace_editor, .right-panel .ace_editor'));
                                    
                                    // Filter for visibility and uniqueness
                                    const visibleEditors = editorNodes.filter(el => {
                                        const style = window.getComputedStyle(el);
                                        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
                                    });
                                    const uniqueEditors = [...new Set(visibleEditors)];
                                    
                                    if (uniqueEditors.length > 0) {
                                        uniqueEditors.forEach((editor, idx) => {
                                            const code = editor.getAttribute('data-full-code') || editor.querySelector('textarea.ace_text-input')?.value || editor.innerText;
                                            const cleanCode = code ? code.trim() : '';
                                            
                                            // GLOBAL DEDUPLICATION CHECK: Never print the same code twice
                                            if (cleanCode && !capturedCodes.has(cleanCode)) {
                                                capturedCodes.add(cleanCode);
                                                
                                                // UNIFORM COHESIVE IDENTIFICATION:
                                                const tabLower = tabName.toLowerCase();
                                                const isReadOnly = editor.classList.contains('ace_read-only') || editor.getAttribute('readonly') === 'true' || editor.querySelector('.ace_text-input')?.hasAttribute('readonly');
                                                const parentText = (editor.closest('.mat-mdc-card, .right-panel, .left-content')?.innerText || "").toLowerCase();
                                                
                                                let label = `${tabName} Code`;
                                                
                                                // 1. Solution Tab Context
                                                if (tabLower.includes('solution')) {
                                                    if (isReadOnly || parentText.includes('official')) {
                                                        label = `IITM Official Solution`;
                                                    } else if (uniqueEditors.length > 1 && idx === 0) {
                                                        label = `IITM Official Solution`; // Best guess first match if not labeled
                                                    } else {
                                                        label = `My Submitted Code`;
                                                    }
                                                } 
                                                // 2. Question / Submission Tab Context
                                                else if (tabLower.includes('submission') || tabLower.includes('question')) {
                                                    if (parentText.includes('template')) label = `Code Template`;
                                                    else label = `My Submitted Code`;
                                                }
                                                // 3. Uniform Fallback
                                                else if (uniqueEditors.length > 1) {
                                                    label = `Code Editor ${idx + 1}`;
                                                } else {
                                                    label = `My Submitted Code`; // Default for single editor in non-specific context
                                                }

                                                editorMarkdown += `### 💻 ${label}\n\n`;
                                                editorMarkdown += `\`\`\`python\n${code.trimEnd()}\n\`\`\`\n\n---\n\n`;
                                            }
                                        });
                                    } else {
                                        console.warn('  └─ ⚠ No visible editors found even though submission/solution detected.');
                                    }
                                }
                            }
                        }
                        const duration = ((Date.now() - startTimeTab) / 1000).toFixed(1);
                        console.log(`%c  └─ ✅ Stage Success (${duration}s)`, 'color: #10b981;');
                    } catch (err) {
                        console.error(`%c  └─ ❌ ERROR in stage ${tabName}:`, 'color: #ef4444;', err);
                        markdown += `*Error scraping this tab.*\n\n`;
                    }
                    markdown += '---\n\n';
                } // End For Loop (initialTabs)
                
                // FINAL INJECTION: Place collected editor submissions at the very bottom
                if (editorMarkdown) {
                    markdown += editorMarkdown;
                }
            } else {
                // Smart polling for normal assignment content to prevent empty downloads
                console.log('IITM Scraper: Smart polling for normal assignment content...');
                let isLoaded = false;
                for (let w = 0; w < 40; w++) {
                    const qFound = document.querySelectorAll('.gcb-question-row, .question-container, .mcq-question, mat-card').length > 0;
                    const spinner = document.querySelector('mat-spinner, .spinner, [role="progressbar"]');
                    
                    // Stop polling if questions/cards are present and no loading spinner is visible
                    if (qFound && !spinner) {
                        await new Promise(r => setTimeout(r, 500)); // Breather for MathJax to finish rendering
                        isLoaded = true;
                        break;
                    }
                    await new Promise(r => setTimeout(r, 250));
                }
                if (!isLoaded) console.log('⏳ Portal content taking too long or unstructured. Capturing current view...');

                // Regular assignment logic (Dual-mode: GCB & Modern Portal)
                const headerInfo = document.querySelector('.assessment-top-info, .modules__content-head-title, .title-container');
                if (headerInfo) markdown += `> ${headerInfo.innerText.trim().replace(/\n\s*\n/g, '\n> ')}\n\n`;

                const lastSubmitted = document.querySelector('.submission-info .submission-date, .last-submitted-at');
                if (lastSubmitted) markdown += `> **Last Submitted:** ${lastSubmitted.innerText.trim()}\n\n`;

                markdown += `---\n\n`;

                // Try to find the container for questions
                const bodyContent = document.querySelector('.gcb-assessment-body, mat-sidenav-content, .assignment-container, .question-container-parent');
                if (bodyContent) {
                    const introClone = bodyContent.cloneNode(true);

                    // Remove all question rows/cards to get only the intro
                    introClone.querySelectorAll('.gcb-question-row, mat-card, .question-container, .mcq-question, .result-card').forEach(q => q.remove());
                    // Remove empty placeholders, scripts, buttons
                    introClone.querySelectorAll('noscript, script, .qt-warning, button, .mat-mdc-button, .action-bar').forEach(el => el.remove());

                    processNode(introClone);
                    let introMarkdown = turndownService.turndown(introClone.innerHTML).trim();
                    if (introMarkdown && introMarkdown.length > 20) {
                        markdown += `## Introduction\n\n${introMarkdown}\n\n---\n\n`;
                    }
                }

                const questionBlocks = document.querySelectorAll('.gcb-question-row, mat-card, .question-container, .mcq-question');
                console.log(`IITM Scraper: Found ${questionBlocks.length} question blocks.`);

                if (questionBlocks.length === 0 && !ytIframe) {
                    // Fallback to full content if nothing structured found
                    const mainContent = document.querySelector('mat-sidenav-content, main, .modules__content-body, #main-content') || document.body;
                    const clone = mainContent.cloneNode(true);
                    // Remove sidebars and known noise
                    clone.querySelectorAll('mat-sidenav, app-header, app-footer, .header, .footer, script, noscript, .units__list, .nav-container').forEach(el => el.remove());
                    processNode(clone);
                    markdown += turndownService.turndown(clone.innerHTML);
                } else {
                    questionBlocks.forEach((block, index) => {
                        markdown += `### Question ${index + 1}\n\n`;

                        // Try to find question text
                        const questionTextElement = block.querySelector('.qt-question, .question-text, .mcq-question-text, h3, h4');
                        if (questionTextElement) {
                            const questionClone = questionTextElement.cloneNode(true);
                            questionClone.querySelector('.qt-choices, .choices-container')?.remove();
                            processNode(questionClone);
                            markdown += turndownService.turndown(questionClone.innerHTML).replace(/\n\n\n/g, '\n\n') + '\n\n';
                        } else {
                            // If no specific text element, take the whole block but remove choices
                            const blockClone = block.cloneNode(true);
                            blockClone.querySelectorAll('.gcb-mcq-choice, mat-checkbox, mat-radio-button, .choice-container, .qt-feedback, .feedback-container').forEach(el => el.remove());
                            processNode(blockClone);
                            markdown += turndownService.turndown(blockClone.innerHTML).trim() + '\n\n';
                        }

                        // Choices handling (GCB style + Material style)
                        const gcbChoices = block.querySelectorAll('.gcb-mcq-choice');
                        const matChoices = block.querySelectorAll('mat-checkbox, mat-radio-button, .choice-container');
                        const choices = gcbChoices.length > 0 ? gcbChoices : matChoices;

                        if (choices.length > 0) {
                            choices.forEach(choice => {
                                const input = choice.querySelector('input, .mdc-checkbox__native-control, .mdc-radio__native-control');
                                const label = choice.querySelector('label, .mdc-label, span.text, .choice-text');
                                if (!label) return;

                                const labelClone = label.cloneNode(true);
                                processNode(labelClone);

                                const isChecked = input ? (input.checked || input.hasAttribute('checked') || choice.classList.contains('mat-mdc-checkbox-checked') || choice.classList.contains('mat-mdc-radio-checked')) : false;
                                const checkbox = isChecked ? '- [x]' : '- [ ]';
                                const labelMarkdown = turndownService.turndown(labelClone.innerHTML).trim().replace(/\n/g, '  \n    ');
                                markdown += `${checkbox} ${labelMarkdown}\n`;
                            });
                            markdown += '\n';
                        }

                        const textResponseInput = block.querySelector('input[type="number"], input[type="text"], textarea:not(.ace_text-input)');
                        if (textResponseInput && choices.length === 0) {
                            markdown += `**Your Answer:** \`${textResponseInput.value || '(Not answered)'}\`\n\n`;
                        }

                        const feedbackElement = block.querySelector('.qt-feedback[role="alert"], .feedback-container, .explanation');
                        if (feedbackElement) {
                            // Status and Score
                            const statusHeader = feedbackElement.querySelector('h3.feedback-header, .status-header');
                            if (statusHeader) {
                                const statusSpans = Array.from(statusHeader.querySelectorAll('span.correct, .status-text'));
                                const statusText = statusSpans[0]?.innerText.trim();
                                if (statusText) markdown += `**Status:** ${statusText}\n`;

                                const scoreSpan = statusSpans.find(s => s.innerText.toLowerCase().includes('score')) || feedbackElement.querySelector('.score-badge');
                                if (scoreSpan) markdown += `**Score:** ${scoreSpan.innerText.trim()}\n`;
                            }

                            // Detailed Feedback / Explanation
                            const feedbackHeaders = Array.from(feedbackElement.querySelectorAll('h3.feedback-header, .feedback-label')).filter(h => h.innerText.includes('Feedback:'));
                            if (feedbackHeaders.length > 0) {
                                feedbackHeaders.forEach(h => {
                                    let contentDiv = h.nextElementSibling;
                                    if (contentDiv && !contentDiv.classList.contains('faculty-answer')) {
                                        const feedClone = contentDiv.cloneNode(true);
                                        processNode(feedClone);
                                        markdown += `\n**Feedback:**\n${turndownService.turndown(feedClone.innerHTML).trim()}\n\n`;
                                    }
                                });
                            } else if (feedbackElement.innerText.trim().length > 0) {
                                // Just grab the whole feedback content if no headers found
                                const feedClone = feedbackElement.cloneNode(true);
                                feedClone.querySelectorAll('.feedback-header, .status-header').forEach(el => el.remove());
                                processNode(feedClone);
                                const feedContent = turndownService.turndown(feedClone.innerHTML).trim();
                                if (feedContent) markdown += `\n**Feedback/Explanation:**\n${feedContent}\n\n`;
                            }

                            // Accepted Answers
                            const acceptedAnswersContent = feedbackElement.querySelector('div.faculty-answer, .accepted-answers');
                            if (acceptedAnswersContent) {
                                markdown += `\n**Accepted Answers:**\n\n`;
                                const ansClone = acceptedAnswersContent.cloneNode(true);
                                processNode(ansClone);
                                markdown += turndownService.turndown(ansClone.innerHTML).trim() + '\n\n';
                            }
                        }
                        markdown += `---\n\n`;
                    });
                }
            }

            // Clean up the final markdown before saving
            // 1. Force images to be flush left regardless of indentation depth
            markdown = markdown.replace(/^[ \t]+(!\[.*?\]\()/gm, '$1');
            // 2. Remove trailing whitespace on lines
            markdown = markdown.replace(/[ \t]+$/gm, '');
            // 3. Optional: Fix double newlines before images
            markdown = markdown.replace(/\n{2,}(!\[.*?\]\()/gm, '\n\n$1');
            
            finalizeExport();
        }

        /**
         * Cleans a node and processes it for markdown conversion
         * IMPORTANT: This now supports ASYNC image processing for offline reliability
         */
        async function processNode(root) {
            const includeAssets = localStorage.getItem('iitm-include-assets') === 'true';
            
            // 1. Convert Images to Base64 (ONLY if asset mode is ON)
            if (includeAssets) {
                const images = Array.from(root.querySelectorAll('img'));
            for (const img of images) {
                try {
                    const src = img.src;
                    if (src && !src.startsWith('data:')) {
                        console.log('🖼️ IITM Offline Scraper: Processing image:', src);
                        try {
                            const response = await fetch(src);
                            const blob = await response.blob();
                            await saveImage(src, blob, img);
                        } catch (e) {
                            console.warn('⚠️ CORS/Fetch blocked on page, trying background relay for:', src);
                            // FALLBACK: Use background fetch to bypass CORS
                            const relayResult = await new Promise(resolve => {
                                chrome.runtime.sendMessage({ action: 'fetchBlob', url: src }, resolve);
                            });
                            if (relayResult?.success && relayResult?.data) {
                                // Convert DataURI back to blob for consistency
                                const fetchRes = await fetch(relayResult.data);
                                const blob = await fetchRes.blob();
                                await saveImage(src, blob, img);
                                console.log('✅ Background Relay SUCCEEDED for:', src);
                            } else {
                                throw new Error(relayResult?.error || 'Relay failed');
                            }
                        }
                    }
                } catch (e) {
                    console.warn('❌ Image processing failed even with relay:', img.src, e);
                }
            }
        }

            async function saveImage(src, blob, imgEl) {
                if (includeAssets) {
                    const urlParts = src.split('/');
                    let filename = urlParts[urlParts.length - 1].split('?')[0] || `img_${Date.now()}.png`;
                    if (!filename.includes('.')) filename += '.png';
                    
                    const safeTitle = (assignmentTitle || 'Assignment').replace(/[^\w\s-]/g, '').trim();
                    imgEl.src = `Resources/${safeTitle}/${filename}`;
                    window.__capturedImages.push({ title: filename, blob: blob, originalSrc: src });
                } else {
                    const dataURI = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    imgEl.src = dataURI;
                }
            }

            // 2. Remove obvious artifact elements first
            root.querySelectorAll('.CodeMirror-linenumber, .linenumber, .CodeMirror-measure, .CodeMirror-cursors, .CodeMirror-hscrollbar, .CodeMirror-vscrollbar, noscript, .ace_gutter, .ace_tooltip, .ace_print-margin-layer, .ace_marker-layer, .ace_cursor-layer').forEach(el => el.remove());

            // Remove Ace measurement divs
            root.querySelectorAll('.ace_editor > div').forEach(div => {
                if (div.style.visibility === 'hidden' || (div.style.position === 'absolute' && !div.classList.contains('ace_scroller') && !div.classList.contains('ace_gutter'))) {
                    div.remove();
                }
            });

            // 3. Specialized Code Block Reconstruction
            const selector = '.CodeMirror, .codemirror-container-readonly, .code-container, pre, .ace_editor';
            const containers = Array.from(root.querySelectorAll(selector));
            if (root.matches && root.matches(selector)) containers.unshift(root);

            containers.forEach(container => {
                if (container.querySelector('code')) return;

                let lines = [];
                const cmLines = container.querySelectorAll('.CodeMirror-line');
                const aceLines = container.querySelectorAll('.ace_line');
                const ta = container.querySelector('textarea.ace_text-input');
                const fullCode = container.getAttribute('data-full-code') || (ta && ta.value && ta.value.length > 10 ? ta.value : null);

                if (fullCode) {
                    lines = fullCode.split(/\r?\n/);
                } else if (aceLines.length > 0) {
                    aceLines.forEach(lineEl => {
                        const lineClone = lineEl.cloneNode(true);
                        lineClone.querySelectorAll('.ace_indent-guide').forEach(el => el.remove());
                        lines.push(lineClone.textContent.replace(/\u200B/g, ''));
                    });
                } else if (cmLines.length > 0) {
                    cmLines.forEach(lineEl => {
                        lines.push(lineEl.textContent.replace(/\u200B/g, '').replace(/xxxxxxxxxx/g, ''));
                    });
                } else {
                    lines = container.textContent.split('\n').map(l => l.replace(/xxxxxxxxxx/g, '').replace(/^\s*\d+\s{2,}/, ''));
                }

                const pre = document.createElement('pre');
                const code = document.createElement('code');
                let lang = container.getAttribute('data-ace-mode') || container.getAttribute('data-mode') || 'python';
                
                code.className = `language-${lang}`;
                code.textContent = lines.join('\n').trimEnd();
                pre.appendChild(code);

                if (container.parentNode) {
                    container.parentNode.replaceChild(pre, container);
                }
            });

            // 4. Clean xxxxxxxxxx from text nodes
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.includes('xxxxxxxxxx')) {
                    node.textContent = node.textContent.replace(/xxxxxxxxxx/g, '');
                }
            }

            // 5. Ensure tables have borders
            root.querySelectorAll('table').forEach(table => {
                table.setAttribute('border', '1');
                table.style.borderCollapse = 'collapse';
            });

            return root;
        }

        async function finalizeExport() {
            // Build the final markdown string with metadata header
            let finalMarkdown = "---\n";
            finalMarkdown += `Title: ${assignmentTitle || 'Assignment'}\n`;
            finalMarkdown += `Course: ${courseTitle || 'Unknown Course'}\n`;
            finalMarkdown += `Breadcrumb: ${detectedWeek || 'General'}\n`;
            finalMarkdown += "---\n\n";
            
            finalMarkdown += (markdown || "").replace(/xxxxxxxxxx/g, '');

            // Global Metadata Extraction
            const videos = [];
            const ytIframe = document.querySelector('iframe#player');
            if (ytIframe?.src) {
                const src = ytIframe.src;
                const vidMatch = src.match(/embed\/([^?]+)/);
                const vidTitle = (document.querySelector('.assessment-top-info, .title-container')?.innerText || assignmentTitle).trim();
                videos.push({ title: vidTitle, url: vidMatch ? `https://youtube.com/watch?v=${vidMatch[1]}` : src });
            }

            const resources = Array.from(document.querySelectorAll('a[href*=".pdf"], app-resource-item a, .resource-item a')).map(a => ({ 
                title: a.innerText.trim() || 'Document', 
                url: a.href 
            }));
            
            if (window.__capturedImages) {
                window.__capturedImages.forEach(img => {
                    resources.push({ title: img.title, blob: img.blob, url: img.originalSrc });
                });
            }

            // --- Mode Handling ---
            if (window.__scraperMode === 'copyToClipboard') {
                console.log('📋 IITM Scraper: Copying results to clipboard...');
                navigator.clipboard.writeText(finalMarkdown).then(() => {
                    console.log('✅ Copied to clipboard!');
                }).catch(err => console.error('❌ Clipboard failed:', err));
                return;
            }

            const detail = { 
                markdown: finalMarkdown, 
                title: assignmentTitle,
                course: courseTitle,
                week: detectedWeek, 
                resources: resources,
                videos: videos
            };

            if (window.__scraperMode === 'capture') {
                console.log('📸 IITM Scraper: Dispatched capture event to bulk sequencer.');
                window.dispatchEvent(new CustomEvent('iitm-markdown-captured', { detail }));
                return;
            }

            // --- Default: Single File Download ---
            console.log('⬇️ IITM Scraper: Triggering browser download...');
            const cleanCourse = (courseTitle || 'Course').replace(/[^\w\s-]/g, '').trim();
            const cleanAssignment = (assignmentTitle || 'Assignment').replace(/[^\w\s-]/g, '').trim();
            const cleanWeek = (detectedWeek || '').replace(/[^\w\s-]/g, '').trim();
            
            let filename = `${cleanCourse} - ${cleanAssignment}.md`;
            if (cleanWeek) filename = `${cleanCourse} - ${cleanWeek} - ${cleanAssignment}.md`;

            const blob = new Blob([finalMarkdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`✅ Export complete: ${filename}`);
        }

        /**
         * Consolidates all course details from the course_wise page into one report
         */
        async function scrapeScoreCheckerAll() {
            const forms = Array.from(document.querySelectorAll('form[action="/view_score"]'));
            if (forms.length === 0) {
                alert('No course details found to export.');
                return;
            }

            console.log(`IITM Scraper: Consolidating ${forms.length} courses...`);
            
            let consolidatedMarkdown = `# IITM Score Checker - Consolidated Report\n\n`;
            consolidatedMarkdown += `> **Generated on:** ${new Date().toLocaleString()}\n`;
            consolidatedMarkdown += `> **Course Context:** IITM Degree\n\n`;

            const alerts = Array.from(document.querySelectorAll('.alert')).map(a => a.innerText.trim());
            if (alerts.length > 0) {
                consolidatedMarkdown += `> ${alerts.join('\n> ')}\n\n`;
            }

            for (let i = 0; i < forms.length; i++) {
                const form = forms[i];
                const row = form.closest('tr');
                const courseCode = row.querySelector('td:nth-child(3)')?.innerText.trim() || 'Unknown';
                const totalScore = row.querySelector('td:nth-child(4)')?.innerText.trim() || 'N/A';
                
                consolidatedMarkdown += `## [${i+1}] ${courseCode}\n`;
                consolidatedMarkdown += `**Total Score:** \`${totalScore}\`\n\n`;

                try {
                    const formData = new FormData(form);
                    const response = await fetch(form.action, { method: 'POST', body: formData });
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    const table = doc.querySelector('table');
                    if (table) {
                        const tableClone = table.cloneNode(true);
                        processNode(tableClone);
                        consolidatedMarkdown += turndownService.turndown(tableClone.outerHTML) + '\n\n';
                    } else {
                        consolidatedMarkdown += `*Detailed scores not available.*\n\n`;
                    }
                } catch (e) {
                    consolidatedMarkdown += `*Failed to fetch details for this course.*\n\n`;
                }
                consolidatedMarkdown += '---\n\n';
            }

            markdown = consolidatedMarkdown;
            finalizeExport();
        }

        async function scrapeSyllabus() {
            console.log('IITM Scraper: Exporting Course Syllabus...');
            let syllabusMd = `# Syllabus: ${courseTitle}\n\n`;
            syllabusMd += `> **Generated on:** ${new Date().toLocaleString()}\n\n`;

            const weeks = document.querySelectorAll('.units__items');
            if (weeks.length === 0) {
                alert('No syllabus items found in the sidebar. Please ensure you are on a course page.');
                return;
            }

            weeks.forEach((week, idx) => {
                const weekTitle = week.querySelector('.units__items-title')?.innerText.trim() || `Week ${idx+1}`;
                syllabusMd += `## ${weekTitle}\n\n`;

                const subItems = week.querySelectorAll('.units__subitems');
                subItems.forEach(item => {
                    const title = item.querySelector('.units__subitems-title span')?.innerText.trim() || item.innerText.split('\n')[0].trim();
                    const type = item.querySelector('.units__subitems-videos')?.innerText.trim() || 'Item';
                    const icon = type.includes('Video') ? '🎥' : type.includes('Assignment') ? '📝' : '📖';
                    
                    syllabusMd += `- ${icon} **${title}** (${type})\n`;
                });
                syllabusMd += `\n`;
            });

            markdown = syllabusMd;
            assignmentTitle = "Course Syllabus";
            finalizeExport();
        }

        scrapeContent();
    }
    runExporter();
})();