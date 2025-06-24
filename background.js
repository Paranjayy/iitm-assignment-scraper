// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scrapeAssignment",
    title: "📝 Export Assignment to Markdown",
    contexts: ["page"],
    documentUrlPatterns: ["https://seek.onlinedegree.iitm.ac.in/*"]
  });
});

// Function to execute the scraper
function executeScaper(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['scraper.js']
  });
}

// Listen for the extension's icon to be clicked
chrome.action.onClicked.addListener((tab) => {
  executeScaper(tab.id);
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scrapeAssignment") {
    executeScaper(tab.id);
  }
}); 