(function() {
    // --- Step 1: Check if Turndown library is loaded, if not, load it ---
    if (typeof TurndownService === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/turndown/dist/turndown.js';
        document.head.appendChild(script);
        script.onload = runExporter;
        script.onerror = () => alert('Failed to load the converter library. Please check your internet connection or ad-blocker.');
    } else {
        runExporter();
    }

    function runExporter() {
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
        const assignmentTitle = document.querySelector('.modules__content-head-title > div')?.innerText.trim() || 'Graded Assignment';
        const courseTitle = document.querySelector('app-header .header .content .course-title')?.innerText.trim() || 'Course';
        markdown += `# ${assignmentTitle} - (${courseTitle})\n\n`;

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
                let questionHtml = questionClone.innerHTML.replace(/ /g, ' ');
                markdown += turndownService.turndown(questionHtml).replace(/\n\n\n/g, '\n\n') + '\n';
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
        const filename = `${assignmentTitle} - ${courseTitle}.md`.replace(/[^\w\s-.]/g, ' ').replace(/[\s-]+/g, '_');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`✅ Export complete! Saved to ${filename}`);
    }
})(); 