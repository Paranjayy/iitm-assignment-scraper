// Wait for JSZip to load from the HTML script tag
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'generateZip') {
        const { files, zipName } = request.data;
        const zip = new JSZip();
        
        console.log(`📦 Offscreen Generator: Processing ${files.length} files...`);

        for (const file of files) {
            try {
                if (file.isBinary) {
                    // Convert binary content (likely base64 or arraybuffer-like)
                    // If it's already encoded as base64 from background/content
                    zip.file(file.name, file.content, { base64: true });
                } else {
                    zip.file(file.name, file.content);
                }
            } catch (err) {
                console.error(`❌ Zero-byte or bad file added: ${file.name}`, err);
            }
        }
        
        if (Object.keys(zip.files).length === 0) {
            console.error("❌ No files added to ZIP!");
            return sendResponse({ success: false, error: "Empty ZIP" });
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName || `IITM_Export_${Date.now()}.zip`;
        document.body.appendChild(a);
        
        // Trigger download
        a.click();
        
        // Visual cleanup
        console.log(`✅ ZIP Generated: ${zipName}`);

        // Cleanup after enough time for the browser to start the download
        setTimeout(() => {
            URL.revokeObjectURL(url);
            a.remove();
        }, 10000); // 10s wait for download initiation
        
        sendResponse({ success: true });
    }
});
