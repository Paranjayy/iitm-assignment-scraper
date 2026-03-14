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
        const assignmentTitle = document.querySelector('.modules__content-head-title')?.innerText.trim() || 'Graded Assignment';
        const courseTitle = document.querySelector('app-header .header .content .course-title')?.innerText.trim() || 'Course';
        
        // Use the assignment title as the main header
        markdown += `# ${assignmentTitle}\n\n`;
        markdown += `> **Course:** ${courseTitle}\n\n`;

        const headerInfo = document.querySelector('.assessment-top-info');
        if (headerInfo) markdown += `> ${headerInfo.innerText.trim().replace(/\n\s*\n/g, '\n> ')}\n\n`;
        
        const lastSubmitted = document.querySelector('.submission-info .submission-date');
        if (lastSubmitted) markdown += `> **Last Submitted:** ${lastSubmitted.innerText.trim()}\n\n`;
        
        const note = document.querySelector('.assessment-readonly > span');
        if (note) markdown += `> **Note:** ${note.innerText.trim()}\n\n`;

        markdown += `---\n\n`;
        
        const questionBlocks = document.querySelectorAll('.gcb-question-row');
        questionBlocks.forEach((block, index) => {
            markdown += `### Question ${index + 1}\n\n`;
            
            const questionTextElement = block.querySelector('.qt-question');
            if (questionTextElement) {
                const questionClone = questionTextElement.cloneNode(true);
                questionClone.querySelector('.qt-choices')?.remove();

                // Robustly reconstruct code blocks to handle multiline CodeMirror and clear artifacts
                questionClone.querySelectorAll('.CodeMirror, pre, .code-container').forEach(container => {
                    let lines = [];
                    // Try to find individual line elements first (the clean way)
                    const lineElements = container.querySelectorAll('.CodeMirror-line, pre');
                    
                    if (lineElements.length > 0 && lineElements[0].innerText.trim() !== container.innerText.trim()) {
                        lineElements.forEach(lineEl => {
                            let text = lineEl.innerText.replace(/\u200B/g, ''); // Remove zero-width spaces
                            // Clean up artifacts from each line
                            text = text.replace(/^xxxxxxxxxx\s*/, '');
                            text = text.replace(/^\d+\s+/, ''); // Remove leading line numbers if they exist
                            lines.push(text);
                        });
                    } else {
                        // Fallback for flattened text (what usually causes "unaligned" blocks)
                        let fullText = container.innerText.trim();
                        // Remove the global xxxxxxxxxx artifact
                        fullText = fullText.replace(/^xxxxxxxxxx\s*/g, '').replace(/xxxxxxxxxx/g, '');
                        
                        // Split by line number patterns: "1 code 2 code" -> ["code", "code"]
                        // This regex looks for digits surrounded by spaces or at boundaries
                        const splitLines = fullText.split(/(?<=^|\s)\d+(?=\s)/);
                        if (splitLines.length > 1) {
                            lines = splitLines.map(l => l.trim()).filter(l => l.length > 0);
                        } else {
                            lines = fullText.split('\n').map(l => l.trim());
                        }
                    }

                    const cleanCode = lines.length > 0 ? lines.join('\n') : container.innerText.replace(/xxxxxxxxxx/g, '').trim();
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    code.textContent = cleanCode;
                    pre.appendChild(code);
                    
                    // Replace the messy container with our clean pre/code block
                    if (container.parentNode) {
                        container.parentNode.replaceChild(pre, container);
                    }
                });

                let questionHtml = questionClone.innerHTML.replace(/ /g, ' ');
                let questionMarkdown = turndownService.turndown(questionHtml).replace(/\n\n\n/g, '\n\n');
                
                markdown += questionMarkdown + '\n';
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
                    else if(scoreText && scoreText.includes('Score:')) markdown += `**${scoreText.replace(statusText, '').trim()}**\n`;
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

        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        // Name the file EXACTLY after the extracted assignment title
        const filename = `${assignmentTitle}.md`.replace(/[^\w\s-]/g, '').trim() || 'assignment.md';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`✅ Export complete! Saved to ${filename}`);
    }
    
    // Start the export process
    runExporter();
})(); 