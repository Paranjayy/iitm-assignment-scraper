(function() {
    // Only inject if it doesn't exist
    if (document.getElementById('iitm-scraper-floating-btn')) return;

    // 1. Scraper Button
    const scrapeBtn = document.createElement('div');
    scrapeBtn.id = 'iitm-scraper-floating-btn';
    scrapeBtn.className = 'iitm-floating-btn iitm-scraper-btn';
    scrapeBtn.title = 'Scrape Assignment';
    scrapeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14,2H6C4.89,2 4,2.89 4,4V20C4,21.11 4.89,22 6,22H18C19.11,22 20,21.11 20,20V8L14,2M12,18L7,13H10V9H14V13H17L12,18M13,9V3.5L18.5,9H13Z"/>
        </svg>
        <div class="iitm-tooltip">Export Markdown</div>
    `;

    // 2. AI Explain Button
    const aiBtn = document.createElement('div');
    aiBtn.id = 'iitm-ai-floating-btn';
    aiBtn.className = 'iitm-floating-btn iitm-ai-btn';
    aiBtn.title = 'Explain with AI';
    aiBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
            <path d="M12 12L2.1 12"></path>
            <path d="M12 12l9.9 0"></path>
            <path d="M12 12V22"></path>
        </svg>
        <div class="iitm-tooltip">Brainstorm with AI</div>
        
        <!-- DROPUP MENU -->
        <div id="iitm-ai-dropdown" class="iitm-dropup">
            <div class="ai-option" data-service="chatgpt">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #10a37f;"><path fill="currentColor" d="M22.282 11.976c0-2.327-1.123-4.48-3.003-5.834a7.9 7.9 0 0 0-1.898-1.077a7.9 7.9 0 0 0-8.225 1.705a7.9 7.9 0 0 0-1.897 2.454a7.9 7.9 0 0 0-.616 3.106c0 2.327 1.123 4.48 3.003 5.835a7.9 7.9 0 0 0 1.898 1.077a7.9 7.9 0 0 0 8.225-1.705a7.9 7.9 0 0 0 1.897-2.454a7.9 7.9 0 0 0 .616-3.107Zm-12.016 4.606a5.6 5.6 0 0 1-2.126-4.131a5.6 5.6 0 0 1 2.126-4.131a5.6 5.6 0 0 1 4.131-2.126a5.6 5.6 0 0 1 4.131 2.126a5.6 5.6 0 0 1 2.126 4.131a5.6 5.6 0 0 1-2.126 4.131a5.6 5.6 0 0 1-4.131 2.126a5.6 5.6 0 0 1-4.131-2.126Z"/></svg>
                ChatGPT
            </div>
            <div class="ai-option" data-service="claude">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #d97757;"><path fill="currentColor" d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
                Claude
            </div>
            <div class="ai-option" data-service="scira">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #1e88e5;"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                Scira AI
            </div>
        </div>
    `;

    // 3. Bulk Export Button
    const bulkBtn = document.createElement('div');
    bulkBtn.id = 'iitm-bulk-floating-btn';
    bulkBtn.className = 'iitm-floating-btn iitm-bulk-btn';
    bulkBtn.title = 'Bulk Export All Weeks';
    bulkBtn.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12,18H6V14h6m0,0V10H6v4m0,0H2v4h4v-4m16-4V6H12v4h10M12,18h10V14H12v4M12,6h10V2H12v4M2,6h4V2H2v4m0,16h4v-4H2v4m10,0h10v-4H12v4Z" fill="white"/>
        </svg>
        <div class="iitm-tooltip">Bulk Export All</div>
    `;

    // 4. Close Button
    const closeBtn = document.createElement('div');
    closeBtn.id = 'iitm-btn-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close Extension UI';

    const btnContainer = document.createElement('div');
    btnContainer.id = 'iitm-btn-container';
    btnContainer.appendChild(closeBtn);
    btnContainer.appendChild(scrapeBtn);
    btnContainer.appendChild(bulkBtn);
    btnContainer.appendChild(aiBtn);
    document.body.appendChild(btnContainer);

    document.body.addEventListener('click', (e) => {
        const aiDropdown = document.getElementById('iitm-ai-dropdown');
        
        if (e.target.id === 'iitm-btn-close') {
            btnContainer.style.display = 'none';
        } else if (e.target.closest('#iitm-scraper-floating-btn')) {
            chrome.runtime.sendMessage({ action: 'triggerScraper' });
        } else if (e.target.closest('#iitm-bulk-floating-btn')) {
            window.dispatchEvent(new CustomEvent('iitm-trigger-bulk-export'));
        } else if (e.target.closest('#iitm-ai-floating-btn')) {
            // Toggle dropdown
            const isClickOnOption = e.target.closest('.ai-option');
            if (isClickOnOption) {
                const service = isClickOnOption.dataset.service;
                window.dispatchEvent(new CustomEvent('iitm-trigger-ai', { detail: { service } }));
                aiDropdown.style.display = 'none';
            } else {
                aiDropdown.style.display = aiDropdown.style.display === 'flex' ? 'none' : 'flex';
            }
            e.stopPropagation();
        } else {
            if (aiDropdown) aiDropdown.style.display = 'none';
        }
    });

    // AUTO-UNLOCK: Request an unlock as soon as we load
    chrome.runtime.sendMessage({ action: 'unlockPage' });
})();
