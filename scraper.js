(function() {
    // Turndown library is now pre-loaded via content script
    function runExporter() {
        if (typeof TurndownService === 'undefined') {
            alert('⚠️ Turndown library not loaded. Please reload the page and try again.');
            return;
        }
        console.log('IITM Scraper Extension: Running...');
        
        const turndownService = new TurndownService({ 
            headingStyle: 'atx', 
            codeBlockStyle: 'fenced',
            emDelimiter: '*'
        });

        // Add support for tables if turndown-plugin-gfm is not available, 
        // but usually we want to keep the HTML for tables if turndown fails them.
        turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);

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
                    await new Promise(r => setTimeout(r, 1500)); 
                    
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
                        // Only remove choices container to avoid double-processing
                        questionClone.querySelector('.qt-choices')?.remove();
                        processElement(questionClone);
                        markdown += turndownService.turndown(questionClone.innerHTML).replace(/\n\n\n/g, '\n\n') + '\n\n';
                    }
                    
                    const choices = block.querySelectorAll('.gcb-mcq-choice');
                    if (choices.length > 0) {
                        choices.forEach(choice => {
                            const input = choice.querySelector('input');
                            const label = choice.querySelector('label');
                            if (!label) return;
                            
                            const labelClone = label.cloneNode(true);
                            processElement(labelClone); // Process potential code/tables inside labels
                            
                            const isChecked = input ? input.checked : false;
                            const checkbox = isChecked ? '- [x]' : '- [ ]';
                            // Use turndown for labels to preserve their internal structure (bold, code, etc)
                            const labelMarkdown = turndownService.turndown(labelClone.innerHTML).trim();
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
                            const ansClone = acceptedAnswersContent.cloneNode(true);
                            processElement(ansClone);
                            markdown += turndownService.turndown(ansClone.innerHTML).trim() + '\n\n';
                        }
                    }
                    markdown += `---\n\n`;
                });
            }

            finalizeExport();
        }

        function processElement(root) {
            // 1. Correct Code Block Extraction (Handle Indentation and Line Numbers)
            root.querySelectorAll('.CodeMirror, .programming-question-container pre, code-container').forEach(container => {
                let lines = [];
                // CodeMirror specific: lines are often in .CodeMirror-line
                const cmLines = container.querySelectorAll('.CodeMirror-line');
                
                if (cmLines.length > 0) {
                    cmLines.forEach(lineEl => {
                        // Use textContent to preserve whitespace/indentation!
                        let text = lineEl.textContent.replace(/\u200B/g, ''); 
                        lines.push(text);
                    });
                } else {
                    // Fallback for regular pre/code
                    const rawText = container.innerText;
                    // If it has line numbers at start of lines like "1  def foo():"
                    const linesWithNumbers = rawText.split('\n');
                    lines = linesWithNumbers.map(line => line.replace(/^\s*\d+\s+/, ''));
                }

                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = lines.join('\n').trim();
                pre.appendChild(code);
                if (container.parentNode) container.parentNode.replaceChild(pre, container);
            });

            // 2. Remove line numbers and artifacts that are NOT in code blocks
            root.querySelectorAll('.CodeMirror-linenumber, .linenumber').forEach(el => el.remove());
            
            // 3. Clean xxxxxxxxxx markers from all text nodes
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.includes('xxxxxxxxxx')) {
                    node.textContent = node.textContent.replace(/xxxxxxxxxx/g, '');
                }
            }
        }

        function finalizeExport() {
            // Final safety filter
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
        }

        scrapeContent();
    }
    runExporter();
})();