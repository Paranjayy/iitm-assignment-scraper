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
