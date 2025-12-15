// Service worker to manage toolbar icon and badge based on site‑specific
// settings. When a tab is updated, activated or when siteConfigs
// change, it retrieves the configuration for the tab's domain and
// updates the extension's icon and badge accordingly.
// Also handles keyboard shortcuts for toggling masking on/off.

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
 * Takes into account both site-specific and global enabled state.
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
  chrome.storage.local.get({ siteConfigs: {}, globalEnabled: true }, result => {
    const siteConfigs = result.siteConfigs || {};
    const siteConfig = siteConfigs[domain] || {};
    const globalEnabled = result.globalEnabled !== false;
    // Only show as enabled if both global and site-specific are enabled
    const enabled = globalEnabled && siteConfig.enabled === true;
    const icons = enabled ? ICONS.on : ICONS.off;
    chrome.action.setIcon({ tabId: tab.id, path: icons });
    // Show "OFF" badge when globally disabled to distinguish from site-disabled
    if (!globalEnabled) {
      chrome.action.setBadgeText({ tabId: tab.id, text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#666' });
    } else {
      chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    }
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

// Update icons when site configurations or global settings change
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes.siteConfigs || changes.globalEnabled)) {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(updateTabIcon);
    });
  }
});

/**
 * Toggle masking for a specific domain and notify all tabs.
 * @param {string} domain The domain to toggle
 */
function toggleSiteMasking(domain) {
  chrome.storage.local.get({ siteConfigs: {}, globalEnabled: true }, result => {
    const siteConfigs = result.siteConfigs || {};
    const currentConfig = siteConfigs[domain] || { enabled: false, hideMagnitude: false };
    currentConfig.enabled = !currentConfig.enabled;
    siteConfigs[domain] = currentConfig;
    chrome.storage.local.set({ siteConfigs }, () => {
      // Notify all tabs of this domain to reload config
      chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
          try {
            const tabUrl = new URL(tab.url);
            if (tabUrl.hostname === domain) {
              chrome.tabs.sendMessage(tab.id, { type: 'config-update' }, () => {
                void chrome.runtime.lastError;
              });
            }
          } catch (e) {
            // skip invalid urls
          }
        }
      });
    });
  });
}

/**
 * Toggle the global enabled state. When disabled globally, no sites
 * will have masking applied regardless of per-site settings.
 */
function toggleGlobalEnabled() {
  chrome.storage.local.get({ globalEnabled: true }, result => {
    const newState = !result.globalEnabled;
    chrome.storage.local.set({ globalEnabled: newState }, () => {
      // Notify all tabs to reload config
      chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, { type: 'config-update' }, () => {
            void chrome.runtime.lastError;
          });
        }
      });
    });
  });
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-masking') {
    // Toggle masking for the current active tab's domain
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab || !tab.url) return;
      try {
        const url = new URL(tab.url);
        toggleSiteMasking(url.hostname);
      } catch (e) {
        // Invalid URL
      }
    });
  } else if (command === 'toggle-global') {
    toggleGlobalEnabled();
  }
});