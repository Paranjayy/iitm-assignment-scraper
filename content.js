(function() {
    // Only inject if it doesn't exist
    if (document.getElementById('iitm-scraper-floating-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'iitm-scraper-floating-btn';
    btn.className = 'iitm-scraper-btn';
    btn.title = 'Scrape Assignment';

    // Premium Download/Document SVG Icon
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14,2H6C4.89,2 4,2.89 4,4V20C4,21.11 4.89,22 6,22H18C19.11,22 20,21.11 20,20V8L14,2M12,18L7,13H10V9H14V13H17L12,18M13,9V3.5L18.5,9H13Z"/>
        </svg>
        <div class="iitm-scraper-tooltip">Export Markdown</div>
    `;

    btn.addEventListener('click', () => {
        // Send message to background script to trigger scraper
        chrome.runtime.sendMessage({ action: 'triggerScraper' });
        
        // Visual feedback
        btn.style.transform = 'scale(0.8)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    });

    document.body.appendChild(btn);
})();
