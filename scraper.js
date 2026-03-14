(function() {
    // Turndown library is now pre-loaded via content script
    function runExporter() {
        // Check if TurndownService is available
        if (typeof TurndownService === 'undefined') {
            alert('⚠️ Turndown library not loaded. Please reload the page and try again.');
            return;
        }
        console.log('IITM Scraper Extension: Running...');
        
        const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

        turndownService.addRule('katex-math', {
            filter: (node) => node.nodeName === 'SPAN' && node.classList.contains('katex'),
            replacement: (content, node) => {
                const tex = node.querySelector('annotation[encoding="application/x-tex"]');
                return tex ? `$${tex.textContent.trim()}$` : '';
            }
        });

        let markdown = "";
        const assignmentTitle = (document.querySelector('.assignment-title') || document.querySelector('.modules__content-head-title'))?.innerText.trim() || 'Graded Assignment';
        const courseTitle = (document.querySelector('.course-title') || document.querySelector('app-header .header .content .course-title'))?.innerText.trim() || 'Course';
        
        markdown += `# ${assignmentTitle}\n\n`;
        markdown += `> **Course:** ${courseTitle}\n\n`;

        async function scrapeContent() {
            // Check if this is a GRPA (Programming Assignment) with tabs
            const tabButtons = document.querySelectorAll('app-tab-bar .tab-item');
            
            if (tabButtons.length > 0) {
                console.log("GRPA detected, scraping all tabs...");
                for (const btn of tabButtons) {
                    const tabName = btn.innerText.trim();
                    markdown += `## ${tabName}\n\n`;
                    
                    // Click to load tab content
                    btn.click();
                    // Small delay to allow content to render
                    await new Promise(r => setTimeout(r, 800));
                    
                    const leftContent = document.querySelector('.left-content');
                    if (leftContent) {
                        const clone = leftContent.cloneNode(true);
                        processElement(clone);
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
                        processElement(questionClone);
                        markdown += turndownService.turndown(questionClone.innerHTML).replace(/\n\n\n/g, '\n\n') + '\n';
                    }
                    
                    const choices = block.querySelectorAll('.gcb-mcq-choice');
                    if (choices.length > 0) {
                        choices.forEach(choice => {
                            const input = choice.querySelector('input');
                            const label = choice.querySelector('label');
                            if (!label) return;
                            const isChecked = input ? input.checked : false;
                            const checkbox = isChecked ? '- [x]' : '- [ ]';
                            const labelMarkdown = turndownService.turndown(label).replace(/\n/g, ' ').trim();
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
                        const statusHeader = feedbackElement.querySelector('h3.feedback-header');
                        if (statusHeader) {
                            const statusText = statusHeader.querySelector('span.correct')?.innerText.trim();
                            if (statusText) markdown += `**Status:** ${statusText}\n`;
                            const scoreText = Array.from(statusHeader.querySelectorAll('span.correct')).map(s => s.innerText.trim()).join(' ');
                            if (scoreText && !scoreText.includes(statusText)) markdown += `**Score:** ${scoreText}\n`;
                        }

                        const acceptedAnswersHeader = feedbackElement.querySelector('h3.faculty-answer');
                        const acceptedAnswersContent = feedbackElement.querySelector('div.faculty-answer');
                        if (acceptedAnswersHeader && acceptedAnswersContent) {
                            markdown += `\n**${acceptedAnswersHeader.innerText.trim()}**\n\n`;
                            if (acceptedAnswersContent.querySelectorAll('label').length > 0) {
                                acceptedAnswersContent.querySelectorAll('label').forEach(label => {
                                    markdown += `* ${turndownService.turndown(label).trim()}\n`;
                                });
                            } else { 
                                markdown += `> ${acceptedAnswersContent.innerText.trim()}\n`;
                            }
                            markdown += '\n';
                        }
                    }
                    markdown += `---\n\n`;
                });
            }

            finalizeExport();
        }

        function processElement(root) {
            // Remove MCQ markers/artifacts from MCQ labels if they exist
            root.querySelectorAll('span, div, label').forEach(el => {
                if (el.innerText && el.innerText.includes('xxxxxxxxxx')) {
                    // Try to remove just the text node if it's mixed
                    for (let node of el.childNodes) {
                        if (node.nodeType === 3 && node.textContent.includes('xxxxxxxxxx')) {
                            node.textContent = node.textContent.replace(/xxxxxxxxxx\s*\d*\s*/g, '');
                        }
                    }
                    // If element strictly contains xxxxxxxxxx, clear it
                    if (el.children.length === 0 && el.innerText.trim().match(/^xxxxxxxxxx/)) {
                        el.innerText = el.innerText.replace(/xxxxxxxxxx\s*\d*\s*/g, '');
                    }
                }
            });

            // Robustly reconstruct code blocks
            root.querySelectorAll('.CodeMirror, pre, .code-container, .programming-question-container pre').forEach(container => {
                let lines = [];
                const lineElements = container.querySelectorAll('.CodeMirror-line, pre, code > div');
                
                if (lineElements.length > 0 && lineElements[0].innerText.trim() !== container.innerText.trim()) {
                    lineElements.forEach(lineEl => {
                        let text = lineEl.innerText.replace(/\u200B/g, ''); 
                        text = text.replace(/^xxxxxxxxxx\s*/, '');
                        text = text.replace(/^\d+\s+/, ''); 
                        lines.push(text);
                    });
                } else {
                    let fullText = container.innerText.trim();
                    fullText = fullText.replace(/^xxxxxxxxxx\s*/g, '').replace(/xxxxxxxxxx/g, '');
                    
                    const splitLines = fullText.split(/(?<=^|\s)\d+(?=\s)/);
                    if (splitLines.length > 1) {
                        lines = splitLines.map(l => l.trim()).filter(l => l.length > 0);
                    } else {
                        lines = fullText.split('\n').map(l => l.trim().replace(/^xxxxxxxxxx\s*/, ''));
                    }
                }

                const cleanCode = lines.length > 0 ? lines.join('\n') : container.innerText.replace(/xxxxxxxxxx/g, '').trim();
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = cleanCode;
                pre.appendChild(code);
                
                if (container.parentNode) {
                    container.parentNode.replaceChild(pre, container);
                }
            });
        }

        function finalizeExport() {
            const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const cleanCourse = courseTitle.replace(/[^\w\s-]/g, '').trim();
            const cleanAssignment = assignmentTitle.replace(/[^\w\s-]/g, '').trim();
            const filename = `${cleanCourse} - ${cleanAssignment}.md` || 'assignment.md';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`✅ Export complete! Saved to ${filename}`);
        }

        // Start the process
        scrapeContent();
    }
    
    // Start the export process
    runExporter();
})();