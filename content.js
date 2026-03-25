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
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #10a37f;"><path fill="currentColor" d="M22.28 9.82a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9 6.065 6.065 0 0 0-10.274 2.172A5.985 5.985 0 0 0 1 7.084a6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .511 4.91 6.051 6.051 0 0 0 6.515 2.9 5.985 5.985 0 0 0 4.49 2.01 6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 4-2.9 6.056 6.056 0 0 0-.748-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.142-.08 4.778-2.759a.795.795 0 0 0 .393-.681v-6.737l2.02 1.169a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.495 4.494zm-9.66-4.125a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.141-1.646zm-1.26-10.41a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677L11 15.63l-2.02 1.168a.076.076 0 0 1-.071 0L4.08 14.01a4.504 4.504 0 0 1-1.74-6.115zm16.6 3.856L13.104 8.364l2.015-1.164a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.104v-5.677a.79.79 0 0 0-.407-.667zm2.01-3.023l-.142-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.41 9.23V6.897a.066.066 0 0 1 .028-.061l4.831-2.787a4.499 4.499 0 0 1 6.68 4.66zM8.307 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.5 4.5 0 0 1 7.376-3.454l-.142.08-4.783 2.76a.795.795 0 0 0-.393.681zm1.1 2.365l2.602-1.5 2.607 1.5v3l-2.597 1.5-2.607-1.5v-3z"/></svg>
                ChatGPT
            </div>
            <div class="ai-option" data-service="claude">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #d97757;"><path fill="currentColor" d="m4.714 15.956 4.718-2.647.079-.23-.079-.128h-.23l-.79-.049-2.695-.073-2.338-.097-2.264-.121-.571-.122-.534-.704.055-.352.48-.322.685.06 1.518.104 2.277.158 1.65.097 2.448.255h.388c.018-.052.036-.105.055-.158l-.134-.097-.103-.097L6.973 9.836l-2.55-1.688-1.336-.972-.722-.491-.365-.462-.157-1.008.656-.722.88.06.224.06.893.687 1.906 1.475 2.49 1.834.364.303.145-.103.018-.073-.164-.273-1.354-2.447-1.445-2.489-.643-1.032-.17-.62a2.38 2.38 0 0 0-.104-.728L6.287.134 6.7 0l.995.134.419.364.62 1.415 1 2.228 1.554 3.03.455.898c.08.277.161.555.243.832.03.085.061.17.091.255h.158c.036-.048.073-.097.127-.146l.237-2.094.23-2.696.08-.759.376-.91.747-.492.583.279.48.686-.067.443-.285 1.852-.559 2.902-.364 1.943h.212l.243-.243.984-1.305 1.651-2.064.729-.82.85-.905.546-.431h1.032l.759 1.13-.34 1.165-1.063 1.348-.88 1.141-1.263 1.7-.789 1.36.073.11.188-.019 2.854-.607 1.542-.279 1.84-.316.831.389.091.394-.328.808-1.967.486-2.307.461-3.436.814-.043.03.049.06 1.548.146.662.036h1.62l3.018.225.79.522.473.638-.079.485-1.214.62-1.64-.389-3.824-.91-1.312-.328h-.182c.036.036.073.073.109.11l2.004 1.81 2.507 2.33c.043.193.085.385.128.577l-.322.455-.34-.048-2.204-1.658-.85-.747-1.924-1.621h-.128c.146.216.294.433.444.65l2.343 3.52c.04.361.082.72.122 1.08l-.17.353-.607.212-.668-.121-1.372-1.925L14.38 17.96l-1.142-1.943-.14.079-.674 7.255-.315.37-.729.28-.607-.461-.322-.747.322-1.475.388-1.925.316-1.53.285-1.9c.057-.21.114-.42.17-.631l-.012-.043-.14.018-1.433 1.968-2.18 2.944-1.724 1.846-.413.164-.716-.37.067-.662.401-.589 2.386-3.036 1.439-1.882.929-1.087-.006-.158h-.055l-6.338 4.116-1.13.146-.485-.455.06-.747.231-.243 1.906-1.311z"/></svg>
                Claude
            </div>
            <div class="ai-option" data-service="grok">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #fff;"><path fill="currentColor" d="m9.269 14.855 7.979-5.923c.39-.29.95-.177 1.136.274.981 2.379.543 5.237-1.409 7.2s-4.667 2.393-7.15 1.413l-2.71 1.262c3.888 2.674 8.61 2.013 11.562-.957 2.34-2.354 3.066-5.563 2.388-8.457l.006.007c-.983-4.251.242-5.95 2.75-9.425Q23.912.126 24 0l-3.302 3.32v-.01L9.267 14.857M7.622 16.295c-2.79-2.682-2.31-6.832.072-9.225C9.455 5.3 12.341 4.576 14.86 5.64l2.705-1.256a7.8 7.8 0 0 0-1.829-1.003 8.95 8.95 0 0 0-9.752 1.973C3.451 7.9 2.654 11.817 4.022 15.16c1.022 2.498-.653 4.265-2.34 6.049C1.082 21.84.482 22.473 0 23.143l7.62-6.846"/></svg>
                Grok
            </div>
            <div class="ai-option" data-service="cursor">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #3b82f6;"><path fill="currentColor" d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"/></svg>
                Cursor
            </div>
            <div class="ai-option" data-service="scira">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #1e88e5;"><path fill="currentColor" d="M6.935 2.26a.262.262 0 0 1 .203.485 10.785 10.785 0 1 0 12.619 16.65.262.262 0 1 1 .41.327A11.309 11.309 0 0 1 11.264 24h-.08A11.31 11.31 0 0 1 6.935 2.26Z"/><path fill="currentColor" fill-rule="evenodd" d="M18.382 8.45c.134 0 .246.1.261.234.133 1.194.527 2.094 1.161 2.728.635.635 1.535 1.03 2.73 1.162a.262.262 0 0 1 0 .521c-1.195.133-2.095.528-2.73 1.162-.634.634-1.028 1.534-1.161 2.729a.262.262 0 0 1-.522 0c-.132-1.195-.527-2.095-1.161-2.73-.634-.633-1.535-1.028-2.729-1.16a.263.263 0 0 1 0-.522c1.194-.133 2.095-.527 2.729-1.162.634-.634 1.029-1.534 1.161-2.729l.002-.012a.263.263 0 0 1 .26-.221Zm0 2.274a4.373 4.373 0 0 1-.865 1.245 4.372 4.372 0 0 1-1.245.866c.471.221.888.508 1.245.865.357.357.644.774.865 1.245.222-.472.509-.888.866-1.245a4.375 4.375 0 0 1 1.244-.865 4.373 4.373 0 0 1-1.244-.866 4.373 4.373 0 0 1-.866-1.245Z" clip-rule="evenodd"/><path fill="currentColor" d="M13.562 1.15c.054 0 .099.04.105.093.112 1.014.449 1.79 1 2.342.551.552 1.328.888 2.342 1a.105.105 0 0 1 0 .21c-1.014.112-1.79.448-2.342 1-.551.551-.888 1.328-1 2.342a.105.105 0 0 1-.21 0c-.112-1.014-.448-1.79-1-2.342-.55-.552-1.328-.888-2.341-1a.105.105 0 0 1 0-.21c1.013-.112 1.79-.448 2.341-1 .552-.551.888-1.328 1-2.342a.105.105 0 0 1 .105-.093ZM20.78 0c.053 0 .098.04.104.093.084.756.334 1.333.743 1.741.408.408.985.659 1.74.743a.105.105 0 0 1 0 .209c-.756.084-1.332.334-1.74.742-.409.409-.66.985-.743 1.741a.105.105 0 0 1-.209 0c-.084-.756-.334-1.332-.743-1.74-.408-.409-.984-.66-1.74-.743a.105.105 0 0 1 0-.209c.756-.084 1.332-.335 1.74-.743.409-.408.66-.985.743-1.74A.105.105 0 0 1 20.78 0Z"/></svg>
                Scira AI
            </div>
            <div class="ai-option" data-service="gemini">
                <svg viewBox="0 0 24 24" class="ai-icon-svg" style="color: #4285f4;"><path fill="currentColor" d="M12.452 11.01v3.007h7.375c-.226 1.686-.803 2.921-1.681 3.788-1.08 1.052-2.76 2.2-5.694 2.2-4.541 0-8.09-3.568-8.09-7.993s3.549-7.993 8.09-7.993c2.446 0 4.24.941 5.557 2.151l2.17-2.115C18.347 2.32 15.889 1 12.452 1 6.23 1 1 5.938 1 12s5.23 11 11.452 11c3.36 0 5.895-1.075 7.876-3.08C22.36 17.94 23 15.141 23 12.892c0-.697-.05-1.345-.163-1.882z"/></svg>
                Gemini
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
