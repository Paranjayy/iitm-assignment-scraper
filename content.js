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
        <div id="close-scraper-floating" style="position: absolute; top: -5px; right: -5px; background: #f44336; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; cursor: pointer; visibility: hidden;">✕</div>
    `;

    btn.addEventListener('mouseenter', () => {
        document.getElementById('close-scraper-floating').style.visibility = 'visible';
    });
    btn.addEventListener('mouseleave', () => {
        document.getElementById('close-scraper-floating').style.visibility = 'hidden';
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'close-scraper-floating') {
            e.stopPropagation();
            btn.style.display = 'none';
        } else if (e.target.closest('#iitm-scraper-floating-btn')) {
            // Send message to background script to trigger scraper
            chrome.runtime.sendMessage({ action: 'triggerScraper' });
            
            // Visual feedback
            btn.style.transform = 'scale(0.8)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 150);
        }
    });

    document.body.appendChild(btn);

    // AUTO-UNLOCK: Request an unlock as soon as we load
    chrome.runtime.sendMessage({ action: 'unlockPage' });
})();
