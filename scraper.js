(function() {
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
        // Priority to assignment-title within the content block for GRPA pages
        const assignmentTitle = (
            document.querySelector('.left-content .assignment-title') || 
            document.querySelector('.assignment-title') || 
            document.querySelector('.modules__content-head-title')
        )?.innerText.trim() || 'Graded Assignment';
        
        const courseTitle = (
            document.querySelector('.course-title') || 
            document.querySelector('app-header .header .content .course-title') ||
            document.querySelector('.modules__content-head-title div:first-child')
        )?.innerText.trim() || 'Course';
        
        markdown += `# ${assignmentTitle}\n\n`;
        markdown += `> **Course:** ${courseTitle}\n\n`;

        async function scrapeContent() {
            const tabButtons = document.querySelectorAll('app-tab-bar .tab-item');
            
            if (tabButtons.length > 0) {
                console.log("GRPA detected, scraping all tabs...");
                for (const btn of tabButtons) {
                    const tabName = btn.innerText.trim();
                    markdown += `## ${tabName}\n\n`;
                    btn.click();
                    await new Promise(r => setTimeout(r, 2000)); // Safer wait for dynamic content
                    
                    const leftContent = document.querySelector('.left-content');
                    if (leftContent) {
                        const clone = leftContent.cloneNode(true);
                        processNode(clone);
                        markdown += turndownService.turndown(clone.innerHTML) + '\n\n';
                    }
                    markdown += '---\n\n';
                }
            } else {
                // Regular assignment logic
                const headerInfo = document.querySelector('.assessment-top-info');
                if (headerInfo) markdown += `> ${headerInfo.innerText.trim().replace(/\n\s*\n/g, '\n> ')}\n\n`;
                
                const lastSubmitted = document.querySelector('.submission-info .submission-date');
                if (lastSubmitted) markdown += `> **Last Submitted:** ${lastSubmitted.innerText.trim()}\n\n`;
                
                markdown += `---\n\n`;
                
                const questionBlocks = document.querySelectorAll('.gcb-question-row');
                questionBlocks.forEach((block, index) => {
                    markdown += `### Question ${index + 1}\n\n`;
                    
                    const questionTextElement = block.querySelector('.qt-question');
                    if (questionTextElement) {
                        const questionClone = questionTextElement.cloneNode(true);
                        questionClone.querySelector('.qt-choices')?.remove();
                        processNode(questionClone);
                        markdown += turndownService.turndown(questionClone.innerHTML).replace(/\n\n\n/g, '\n\n') + '\n\n';
                    }
                    
                    const choices = block.querySelectorAll('.gcb-mcq-choice');
                    if (choices.length > 0) {
                        choices.forEach(choice => {
                            const input = choice.querySelector('input');
                            const label = choice.querySelector('label');
                            if (!label) return;
                            
                            const labelClone = label.cloneNode(true);
                            processNode(labelClone);
                            
                            const isChecked = input ? (input.checked || input.hasAttribute('checked')) : false;
                            const checkbox = isChecked ? '- [x]' : '- [ ]';
                            const labelMarkdown = turndownService.turndown(labelClone.innerHTML).trim().replace(/\n/g, '  \n    ');
                            markdown += `${checkbox} ${labelMarkdown}\n`;
                        });
                        markdown += '\n';
                    }

                    const textResponseInput = block.querySelector('input[type="number"], input[type="text"]');
                    if (textResponseInput && choices.length === 0) {
                        markdown += `**Your Answer:** \`${textResponseInput.value || '(Not answered)'}\`\n\n`;
                    }

                    const feedbackElement = block.querySelector('.qt-feedback[role="alert"]');
                    if (feedbackElement) {
                        // Status and Score
                        const statusHeader = feedbackElement.querySelector('h3.feedback-header');
                        if (statusHeader) {
                            const statusSpans = Array.from(statusHeader.querySelectorAll('span.correct'));
                            const statusText = statusSpans[0]?.innerText.trim();
                            if (statusText) markdown += `**Status:** ${statusText}\n`;
                            
                            const scoreSpan = statusSpans.find(s => s.innerText.toLowerCase().includes('score'));
                            if (scoreSpan) markdown += `**Score:** ${scoreSpan.innerText.trim()}\n`;
                        }

                        // Detailed Feedback / Explanation
                        const feedbackHeaders = Array.from(feedbackElement.querySelectorAll('h3.feedback-header')).filter(h => h.innerText.includes('Feedback:'));
                        feedbackHeaders.forEach(h => {
                            let contentDiv = h.nextElementSibling;
                            if (contentDiv && contentDiv.tagName === 'DIV' && !contentDiv.classList.contains('faculty-answer')) {
                                const feedClone = contentDiv.cloneNode(true);
                                processNode(feedClone);
                                markdown += `\n**Feedback:**\n${turndownService.turndown(feedClone.innerHTML).trim()}\n\n`;
                            }
                        });

                        // Accepted Answers
                        const acceptedAnswersContent = feedbackElement.querySelector('div.faculty-answer');
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

            finalizeExport();
        }

        /**
         * Cleans a node of artifacts and reconstructs specialized elements like CodeMirror
         */
        function processNode(root) {
            // 1. Remove obvious artifact elements first
            root.querySelectorAll('.CodeMirror-linenumber, .linenumber, .CodeMirror-measure, .CodeMirror-cursors, .CodeMirror-hscrollbar, .CodeMirror-vscrollbar, noscript').forEach(el => el.remove());

            // 2. Specialized Code Block Reconstruction
            root.querySelectorAll('.CodeMirror, .codemirror-container-readonly, .code-container, pre').forEach(container => {
                // If this is a nested element we already processed, skip
                if (container.querySelector('code')) return;

                let lines = [];
                const cmLines = container.querySelectorAll('.CodeMirror-line');
                
                if (cmLines.length > 0) {
                    cmLines.forEach(lineEl => {
                        // Use textContent to preserve all spacing
                        let text = lineEl.textContent.replace(/\u200B/g, ''); // Remove zero-width spaces
                        text = text.replace(/xxxxxxxxxx/g, '');
                        lines.push(text);
                    });
                } else {
                    // Fallback for non-cm pre tags or raw containers
                    let raw = container.textContent;
                    lines = raw.split('\n').map(l => l.replace(/xxxxxxxxxx/g, '').replace(/^\s*\d+\s{2,}/, ''));
                }

                const pre = document.createElement('pre');
                const code = document.createElement('code');
                const lang = container.getAttribute('data-mode') || 'python';
                code.className = `language-${lang}`;
                code.textContent = lines.join('\n').trimEnd();
                pre.appendChild(code);
                
                if (container.parentNode) {
                    container.parentNode.replaceChild(pre, container);
                }
            });

            // 3. Clean xxxxxxxxxx from all remaining text nodes
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let node;
            const textNodes = [];
            while (node = walker.nextNode()) textNodes.push(node);
            
            textNodes.forEach(t => {
                if (t.textContent.includes('xxxxxxxxxx')) {
                    t.textContent = t.textContent.replace(/xxxxxxxxxx/g, '');
                }
            });
            
            // 4. Ensure tables have borders for better rendering in some viewers
            root.querySelectorAll('table').forEach(table => {
                table.setAttribute('border', '1');
                table.style.borderCollapse = 'collapse';
            });
        }

        function finalizeExport() {
            // Final safety filter for any escaped markers
            let finalMarkdown = markdown.replace(/xxxxxxxxxx/g, '');
            
            const blob = new Blob([finalMarkdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const cleanCourse = courseTitle.replace(/[^\w\s-]/g, '').trim();
            const cleanAssignment = assignmentTitle.replace(/[^\w\s-]/g, '').trim();
            const filename = `${cleanCourse} - ${cleanAssignment}.md`;
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`✅ Export complete: ${filename}`);
        }

        scrapeContent();
    }
    
    runExporter();
})();