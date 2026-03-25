(function() {
    // Only inject if it doesn't exist
    if (document.getElementById('iitm-scraper-floating-btn')) return;

    // 1. Scraper Button
    const scrapeBtn = document.createElement('div');
    scrapeBtn.id = 'iitm-scraper-floating-btn';
    scrapeBtn.className = 'iitm-floating-btn';
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
    aiBtn.className = 'iitm-floating-btn';
    aiBtn.title = 'Explain with AI';
    aiBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L13.912 8.813L20 10.725L15.5 15.112L16.562 21.3L12 18.375L7.438 21.3L8.5 15.112L4 10.725L10.088 8.813L12 3Z"></path></svg>
        <div class="iitm-tooltip">Brainstorm with AI</div>
        
        <!-- DROPUP MENU -->
        <div id="iitm-ai-dropdown" class="iitm-dropup">
            <div class="ai-option" data-service="chatgpt">
                <svg viewBox="0 0 256 260" class="ai-icon-svg"><path fill="#fff" d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"/></svg>
                ChatGPT
            </div>
            <div class="ai-option" data-service="claude">
                <svg viewBox="0 0 256 257" class="ai-icon-svg"><path fill="#D97757" d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z"/></svg>
                Claude
            </div>
            <div class="ai-option" data-service="grok">
                <svg viewBox="0 0 1024 1024" class="ai-icon-svg"><path fill="#fff" d="M395.479 633.828L735.91 381.105C752.599 368.715 776.454 373.548 784.406 392.792C826.26 494.285 807.561 616.253 724.288 699.996C641.016 783.739 525.151 802.104 419.247 760.277L303.556 814.143C469.49 928.202 670.987 899.995 796.901 773.282C896.776 672.843 927.708 535.937 898.785 412.476L899.047 412.739C857.105 231.37 909.358 158.874 1016.4 10.6326C1018.93 7.11771 1021.47 3.60279 1024 0L883.144 141.651V141.212L395.392 633.916Z"/><path fill="#fff" d="M325.226 695.251C206.128 580.84 226.662 403.776 328.285 301.668C403.431 226.097 526.549 195.254 634.026 240.596L749.454 186.994C728.657 171.88 702.007 155.623 671.424 144.2C533.19 86.9942 367.693 115.465 255.323 228.382C147.234 337.081 113.244 504.215 171.613 646.833C215.216 753.423 143.739 828.818 71.7385 904.916C46.2237 931.893 20.6216 958.87 0 987.429L325.139 695.339Z"/></svg>
                Grok
            </div>
            <div class="ai-option" data-service="cursor">
                <svg viewBox="0 0 466.73 532.09" class="ai-icon-svg"><path fill="#fff" d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"/></svg>
                Cursor
            </div>
            <div class="ai-option" data-service="gemini">
                <svg viewBox="0 0 296 298" class="ai-icon-svg" fill="none"><mask id="gemini-a" width="296" height="298" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#3186FF" d="M141.201 4.886c2.282-6.17 11.042-6.071 13.184.148l5.985 17.37a184.004 184.004 0 0 0 111.257 113.049l19.304 6.997c6.143 2.227 6.156 10.91.02 13.155l-19.35 7.082a184.001 184.001 0 0 0-109.495 109.385l-7.573 20.629c-2.241 6.105-10.869 6.121-13.133.025l-7.908-21.296a184 184 0 0 0-109.02-108.658l-19.698-7.239c-6.102-2.243-6.118-10.867-.025-13.132l20.083-7.467A183.998 183.998 0 0 0 133.291 26.28l7.91-21.394Z"/></mask><g mask="url(#gemini-a)"><g filter="url(#gemini-b)"><ellipse cx="163" cy="149" fill="#3689FF" rx="196" ry="159"/></g><g filter="url(#gemini-c)"><ellipse cx="33.5" cy="142.5" fill="#F6C013" rx="68.5" ry="72.5"/></g><g filter="url(#gemini-d)"><ellipse cx="19.5" cy="148.5" fill="#F6C013" rx="68.5" ry="72.5"/></g><g filter="url(#gemini-e)"><path fill="#FA4340" d="M194 10.5C172 82.5 65.5 134.333 22.5 135L144-66l50 76.5Z"/></g><g filter="url(#gemini-f)"><path fill="#FA4340" d="M190.5-12.5C168.5 59.5 62 111.333 19 112L140.5-89l50 76.5Z"/></g><g filter="url(#gemini-g)"><path fill="#14BB69" d="M194.5 279.5C172.5 207.5 66 155.667 23 155l121.5 201 50-76.5Z"/></g><g filter="url(#gemini-h)"><path fill="#14BB69" d="M196.5 320.5C174.5 248.5 68 196.667 25 196l121.5 201 50-76.5Z"/></g></g><defs><filter id="gemini-b" width="464" height="390" x="-69" y="-46" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="18"/></filter><filter id="gemini-c" width="265" height="273" x="-99" y="6" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="gemini-d" width="265" height="273" x="-113" y="12" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="gemini-e" width="299.5" height="329" x="-41.5" y="-130" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="gemini-f" width="299.5" height="329" x="-45" y="-153" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="gemini-g" width="299.5" height="329" x="-41" y="91" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter><filter id="gemini-h" width="299.5" height="329" x="-39" y="132" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32"/></filter></defs></svg>
                Gemini
            </div>
        </div>
    `;

    // 3. Bulk Export Button
    const bulkBtn = document.createElement('div');
    bulkBtn.id = 'iitm-bulk-floating-btn';
    bulkBtn.className = 'iitm-floating-btn';
    bulkBtn.title = 'Bulk Export All Weeks';
    bulkBtn.innerHTML = `
        <svg viewBox="0 0 512 512" width="24" height="24" fill="#fff"><g transform="translate(85, 42) scale(1.1)"> <path d="M149.333333,128 L234.666667,213.333333 L234.666667,426.666667 L4.26325641e-14,426.666667 L4.26325641e-14,128 L149.333333,128 Z M131.648,170.666667 L42.6666667,170.666667 L42.6666667,384 L192,384 L192,231.018667 L131.648,170.666667 Z M213.333333,64 L298.666667,149.333333 L298.666667,362.666667 L256,362.666 L256,167.018667 L195.648,106.666667 L64,106.666 L64,64 L213.333333,64 Z M277.333333,-2.13162821e-14 L362.666667,85.3333333 L362.666667,298.666667 L320,298.666 L320,103.018667 L259.648,42.6666667 L128,42.666 L128,-2.13162821e-14 L277.333333,-2.13162821e-14 Z" id="Combined-Shape"> </path> </g></svg>
        <div class="iitm-tooltip">Bulk Content Pack</div>
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
