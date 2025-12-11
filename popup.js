// Popup script to manage extension settings. It reads the current
// configuration from chrome.storage.local and updates the UI
// accordingly. When settings change, it persists them and sends a
// message to all tabs to reload their configuration.

document.addEventListener('DOMContentLoaded', () => {
  const enabledCheckbox = document.getElementById('enabled');
  const hideMagnitudeCheckbox = document.getElementById('hideMagnitude');
  const siteLabel = document.getElementById('site');
  let currentDomain = '';

  // Determine the domain of the active tab and load its settings
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab) return;
    try {
      const url = new URL(tab.url);
      currentDomain = url.hostname;
      if (siteLabel) {
        siteLabel.textContent = currentDomain;
      }
    } catch (e) {
      // Leave domain empty
    }
    // Fetch site configurations and populate checkboxes
    chrome.storage.local.get({ siteConfigs: {} }, result => {
      const siteConfigs = result.siteConfigs || {};
      const defaultConfig = { enabled: false, hideMagnitude: false };
      const config = Object.assign({}, defaultConfig, siteConfigs[currentDomain] || {});
      enabledCheckbox.checked = Boolean(config.enabled);
      hideMagnitudeCheckbox.checked = Boolean(config.hideMagnitude);
    });
  });

  // Update site configuration in storage and notify tabs
  function updateConfig() {
    if (!currentDomain) return;
    const newConfig = {
      enabled: enabledCheckbox.checked,
      hideMagnitude: hideMagnitudeCheckbox.checked
    };
    chrome.storage.local.get({ siteConfigs: {} }, result => {
      const siteConfigs = result.siteConfigs || {};
      siteConfigs[currentDomain] = newConfig;
      chrome.storage.local.set({ siteConfigs }, () => {
        // Broadcast config update to all tabs of this domain
        chrome.tabs.query({}, tabs => {
          for (const tab of tabs) {
            try {
              const tabUrl = new URL(tab.url);
              if (tabUrl.hostname === currentDomain) {
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

  enabledCheckbox.addEventListener('change', updateConfig);
  hideMagnitudeCheckbox.addEventListener('change', updateConfig);
});