(function() {
    // Turndown library is now pre-loaded via content script
    function runExporter() {
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
            const tabButtons = document.querySelectorAll('app-tab-bar .tab-item');
            
            if (tabButtons.length > 0) {
                console.log("GRPA detected, scraping all tabs...");
                for (const btn of tabButtons) {
                    const tabName = btn.innerText.trim();
                    markdown += `## ${tabName}\n\n`;
                    btn.click();
                    await new Promise(r => setTimeout(r, 1200)); // Increased wait for reliability
                    
                    const leftContent = document.querySelector('.left-content');
                    if (leftContent) {
                        const clone = leftContent.cloneNode(true);
                        processElement(clone);
                        const tabMd = turndownService.turndown(clone.innerHTML);
                        markdown += (tabMd || "*(No content found)*") + '\n\n';
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
                            
                            let cleanLabelText = label.innerText;
                            cleanLabelText = cleanLabelText.replace(/xxxxxxxxxx/g, '').trim();
                            // Remove leading line number like "1", "2" etc if it's exactly one number at the start
                            cleanLabelText = cleanLabelText.replace(/^\d+\s+/, '');
                            
                            const isChecked = input ? input.checked : false;
                            const checkbox = isChecked ? '- [x]' : '- [ ]';
                            markdown += `${checkbox} ${cleanLabelText}\n`;
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
                                    let cleanAns = label.innerText.replace(/xxxxxxxxxx/g, '').trim();
                                    cleanAns = cleanAns.replace(/^\d+\s+/, '');
                                    markdown += `* ${cleanAns}\n`;
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
            // 1. Reconstruct Code Blocks FIRST (CRITICAL)
            root.querySelectorAll('.CodeMirror, pre, .code-container, .programming-question-container pre').forEach(container => {
                let lines = [];
                // Look for structured lines
                const lineElements = container.querySelectorAll('.CodeMirror-line, pre');
                
                if (lineElements.length > 1) {
                    lineElements.forEach(lineEl => {
                        let text = lineEl.innerText.replace(/\u200B/g, ''); 
                        text = text.replace(/xxxxxxxxxx/g, '');
                        // Remove leading number if it looks like a line number
                        text = text.replace(/^\s*\d+\s+/, '');
                        lines.push(text);
                    });
                } else {
                    // Flattened text reconstruction
                    let raw = container.innerText.trim().replace(/xxxxxxxxxx/g, '');
                    // Try splitting by digits that are likely line numbers: "1 code 2 code"
                    const parts = raw.split(/\s+(?=\d+\s+)/);
                    if (parts.length > 1) {
                        parts.forEach(p => lines.push(p.replace(/^\d+\s+/, '').trim()));
                    } else {
                        // Just split by newlines if they exist
                        lines = raw.split('\n').map(l => l.replace(/^\d+\s+/, '').trim());
                    }
                }

                const cleanCode = lines.join('\n').trim() || container.innerText.replace(/xxxxxxxxxx/g, '').trim();
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = cleanCode;
                pre.appendChild(code);
                if (container.parentNode) container.parentNode.replaceChild(pre, container);
            });

            // 2. Clean markers from remaining non-code elements
            root.querySelectorAll('span, div, p').forEach(el => {
                // Skip if inside a pre (though we already replaced them, safety first)
                if (el.closest('pre')) return;
                
                if (el.innerText && el.innerText.includes('xxxxxxxxxx') && el.children.length === 0) {
                    el.innerText = el.innerText.replace(/xxxxxxxxxx/g, '').trim();
                }
            });
        }

        function finalizeExport() {
            // Final nuke for xxxxxxxxxx just in case
            let finalMarkdown = markdown.replace(/xxxxxxxxxx/g, '');
            
            const blob = new Blob([finalMarkdown], { type: 'text/markdown;charset=utf-8' });
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

        scrapeContent();
    }
    
    runExporter();
})();