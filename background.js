// Service worker to manage toolbar icon and badge based on site‑specific
// settings. When a tab is updated, activated or when siteConfigs
// change, it retrieves the configuration for the tab's domain and
// updates the extension's icon and badge accordingly.

const ICONS = {
  on: {
    16: 'icons/emoji_on_16.png',
    32: 'icons/emoji_on_32.png',
    48: 'icons/emoji_on_48.png',
    128: 'icons/emoji_on_128.png'
  },
  off: {
    16: 'icons/emoji_off_16.png',
    32: 'icons/emoji_off_32.png',
    48: 'icons/emoji_off_48.png',
    128: 'icons/emoji_off_128.png'
  }
};

/**
 * Update the toolbar icon and badge for a given tab based on its domain.
 * @param {Object} tab Chrome tab object
 */
function updateTabIcon(tab) {
  if (!tab || !tab.id || !tab.url) return;
  let domain;
  try {
    const url = new URL(tab.url);
    domain = url.hostname;
  } catch (e) {
    return;
  }
  chrome.storage.local.get({ siteConfigs: {} }, result => {
    const siteConfigs = result.siteConfigs || {};
    const siteConfig = siteConfigs[domain] || {};
    const enabled = siteConfig.enabled === true;
    const icons = enabled ? ICONS.on : ICONS.off;
    chrome.action.setIcon({ tabId: tab.id, path: icons });
    // No badge is shown; the color vs grayscale icon indicates state
    chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  });
}

// Update icons on installation or refresh for all existing tabs
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(updateTabIcon);
  });
});

// Update icons when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab) {
    updateTabIcon(tab);
  }
});

// Update icons when the active tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    updateTabIcon(tab);
  });
});

// Update icons when site configurations change
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.siteConfigs) {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(updateTabIcon);
    });
  }
});