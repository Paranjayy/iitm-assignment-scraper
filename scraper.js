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
            
            if (window.__scraperMode === 'consolidateAll') {
                assignmentTitle = 'Consolidated Detailed Scores';
            }
        }

        markdown += `# ${assignmentTitle}\n\n`;
        markdown += `> **Course:** ${courseTitle}\n\n`;

        async function scrapeContent() {
            // --- Score Checker & Syllabus Handling ---
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
                
                // --- Resource/PDF Discovery ---
                const resourceLinks = Array.from(document.querySelectorAll('a[href*=".pdf"], .supplementary-content a, .resource-item a, app-resource-item a'))
                    .map(a => ({ title: a.innerText.trim() || 'Download Resource', url: a.href }))
                    .filter((v, i, a) => a.findIndex(t => t.url === v.url) === i); // Unique

                if (resourceLinks.length > 0) {
                    markdown += `### 📚 Associated Resources\n\n`;
                    resourceLinks.forEach(res => {
                        markdown += `- [📄 ${res.title}](${res.url})\n`;
                    });
                    markdown += '\n---\n\n';
                }

                markdown += '\n---\n\n';
            } else if (initialTabs.length > 0) {
                console.log(`GRPA detected, scraping ${initialTabs.length} tabs...`);

                for (let i = 0; i < initialTabs.length; i++) {
                    // Re-query buttons to avoid detached elements during tab switching
                    const currentBtn = document.querySelectorAll('app-tab-bar .tab-item')[i];
                    if (!currentBtn) continue;

                        const cleanTabName = tabName.toLowerCase().replace(/\s/g, '');
                        console.log(`Scraping tab ${i + 1}: ${tabName} (clean: ${cleanTabName})`);

                        currentBtn.click();
                        // Wait for tab content and verify
                        let tabSwitched = false;
                        for (let attempt = 0; attempt < 10; attempt++) {
                            await new Promise(r => setTimeout(r, 600));
                            // Check if current view is actually the intended tab
                            const activeTabNode = document.querySelector('app-tab-bar .tab-item.active');
                            if (activeTabNode && activeTabNode.innerText.trim().toLowerCase() === tabName.toLowerCase()) {
                                tabSwitched = true;
                                break;
                            }
                        }
                        if (!tabSwitched) console.warn(`⚠️ Tab ${tabName} may not have loaded correctly.`);
                        
                        await syncAce();

                        try {
                            if (cleanTabName === 'testcases') {
                            const testTypes = document.querySelectorAll('.test-case-type-block');
                            if (testTypes.length > 0) {
                                for (const typeBtn of testTypes) {
                                    const typeName = typeBtn.innerText.trim();
                                    markdown += `### ${typeName}\n\n`;
                                    typeBtn.click();
                                    await new Promise(r => setTimeout(r, 1000));

                                    const caseButtons = document.querySelectorAll('.case-btn');
                                    for (let j = 0; j < caseButtons.length; j++) {
                                        const currentCaseBtn = document.querySelectorAll('.case-btn')[j];
                                        if (!currentCaseBtn) continue;

                                        const caseName = currentCaseBtn.innerText.trim();
                                        markdown += `#### ${caseName}\n\n`;
                                        currentCaseBtn.click();
                                        await new Promise(r => setTimeout(r, 800)); // Increased for slow portal

                                        const currentCaseBlocks = document.querySelectorAll('.test-case-block');
                                        currentCaseBlocks.forEach(block => {
                                            const title = block.querySelector('.test-case-block-title')?.innerText.trim();
                                            const content = block.querySelector('.test-case-block-content')?.innerText.trim();
                                            if (title && content) {
                                                markdown += `**${title}:**\n\`\`\`text\n${content}\n\`\`\`\n\n`;
                                            }
                                        });
                                    }
                                }
                            } else {
                                // Fallback for simple test case lists
                                const leftContent = document.querySelector('.left-content');
                                if (leftContent) {
                                    const clone = await processNode(leftContent.cloneNode(true));
                                    markdown += turndownService.turndown(clone.innerHTML) + '\n\n';
                                }
                            }
                        } else {
                            // For Question, Overview, Solution, My Submission, etc.
                            const leftContent = document.querySelector('.left-content');
                            const rightPanel = document.querySelector('.right-panel');
                            
                            if (leftContent) {
                                const clone = await processNode(leftContent.cloneNode(true));
                                markdown += turndownService.turndown(clone.innerHTML) + '\n\n';
                            }
                            
                            // If on Solution/My Submission tab and code editor exists, capture it
                            if ((tabName.toLowerCase().includes('solution') || tabName.toLowerCase().includes('submission')) && rightPanel) {
                                await syncAce();
                                const editor = rightPanel.querySelector('.ace_editor');
                                if (editor) {
                                    markdown += `### ${tabName} Code\n\n`;
                                    const code = editor.getAttribute('data-full-code') || editor.querySelector('textarea.ace_text-input')?.value || editor.innerText;
                                    markdown += `\`\`\`python\n${code.trimEnd()}\n\`\`\`\n\n`;
                                }
                            }
                        }
                    } catch (err) {
                        console.error(`Error scraping tab ${tabName}:`, err);
                        markdown += `*Error scraping this tab.*\n\n`;
                    }
                    markdown += '---\n\n';
                }

                // Add "My Solution" from the right panel if it exists
                const rightPanel = document.querySelector('.right-panel');
                if (rightPanel) {
                    await syncAce(); // Ensure latest state is captured
                    const editor = rightPanel.querySelector('.ace_editor');
                    if (editor) {
                        markdown += `## My Solution\n\n`;
                        const ta = editor.querySelector('textarea.ace_text-input');
                        const fullCode = editor.getAttribute('data-full-code') || (ta && ta.value && ta.value.length > 10 ? ta.value : null);
                        
                        let solutionCode = "";
                        if (fullCode) {
                            solutionCode = fullCode;
                        } else {
                            // Fallback if data sync failed
                            const lines = Array.from(editor.querySelectorAll('.ace_line')).map(l => {
                                const clone = l.cloneNode(true);
                                clone.querySelectorAll('.ace_indent-guide').forEach(g => g.remove());
                                return clone.textContent.replace(/\u200B/g, '');
                            });
                            solutionCode = lines.join('\n');
                        }

                        // Try to detect language
                        const langSelector = rightPanel.querySelector('.mat-mdc-select-value-text');
                        let lang = 'python';
                        if (langSelector) {
                            const selectedLang = langSelector.innerText.toLowerCase();
                            if (selectedLang.includes('python')) lang = 'python';
                            else if (selectedLang.includes('java')) lang = 'java';
                            else if (selectedLang.includes('c++')) lang = 'cpp';
                        }

                        markdown += `\`\`\`${lang}\n${solutionCode.trimEnd()}\n\`\`\`\n\n`;
                        markdown += '---\n\n';
                    }
                }
            } else {
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
            // 1. Convert Images to Base64 for truly offline reliable markdown
            const images = Array.from(root.querySelectorAll('img'));
            for (const img of images) {
                try {
                    const src = img.src;
                    if (src && !src.startsWith('data:')) {
                        console.log('🖼️ IITM Offline Scraper: Converting image to Base64:', src);
                        const response = await fetch(src);
                        const blob = await response.blob();
                        const dataURI = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                        img.src = dataURI;
                    }
                } catch (e) {
                    console.warn('❌ Failed to convert image to Base64:', img.src, e);
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
            // Final safety filter for any escaped markers
            let finalMarkdown = markdown.replace(/xxxxxxxxxx/g, '');

            if (window.__scraperMode === 'copyToClipboard') {
                navigator.clipboard.writeText(finalMarkdown).then(() => {
                    console.log('✅ Copied to clipboard!');
                }).catch(err => {
                    console.error('❌ Clipboard failed:', err);
                });
                return;
            }

            if (window.__scraperMode === 'capture') {
                const detail = { 
                    markdown: finalMarkdown, 
                    title: assignmentTitle,
                    course: courseTitle,
                    resources: Array.from(document.querySelectorAll('a[href*=".pdf"]')).map(a => ({ title: a.innerText.trim(), url: a.href }))
                };
                window.dispatchEvent(new CustomEvent('iitm-markdown-captured', { detail }));
                window.__scraperMode = 'single'; // Reset
                return;
            }

            const cleanCourse = (courseTitle || 'Course').replace(/[^\w\s-]/g, '').trim();
            const cleanAssignment = (assignmentTitle || 'Assignment').replace(/[^\w\s-]/g, '').trim();
            const filename = `${cleanCourse} - ${cleanAssignment}.md`;

            // If we are in bulk mode, we might want to ZIP (handled by portal_enhancements usually)
            // But if this is a single download, just save as MD
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