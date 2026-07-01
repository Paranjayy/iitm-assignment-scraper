// Popup script — sends messages to content script
function send(action, extra) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action, ...extra });
      window.close();
    }
  });
}

document.getElementById('scrape').addEventListener('click', () => {
  send('triggerScraper', { mode: 'single' });
});

document.getElementById('bulk').addEventListener('click', () => {
  send('toggleBulkExport');
});

document.getElementById('unlock').addEventListener('click', () => {
  send('unlockPage');
});

document.getElementById('spotlight').addEventListener('click', () => {
  send('openSpotlight');
});

document.getElementById('darkmode').addEventListener('click', () => {
  send('toggleDarkMode');
});

document.getElementById('ai-chatgpt').addEventListener('click', () => {
  send('iitm-trigger-ai', { detail: { service: 'chatgpt' } });
});

document.getElementById('ai-claude').addEventListener('click', () => {
  send('iitm-trigger-ai', { detail: { service: 'claude' } });
});
