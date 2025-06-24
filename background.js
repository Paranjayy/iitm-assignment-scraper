// Listen for the extension's icon to be clicked
chrome.action.onClicked.addListener((tab) => {
  // Execute the main scraper script on the active tab
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['scraper.js']
  });
}); 