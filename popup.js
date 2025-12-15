// Popup script to manage extension settings. It reads the current
// configuration from chrome.storage.local and updates the UI
// accordingly. When settings change, it persists them and sends a
// message to all tabs to reload their configuration.

document.addEventListener('DOMContentLoaded', () => {
  const globalEnabledCheckbox = document.getElementById('globalEnabled');
  const enabledCheckbox = document.getElementById('enabled');
  const hideMagnitudeCheckbox = document.getElementById('hideMagnitude');
  const siteLabel = document.getElementById('site');
  const globalDisabledNotice = document.getElementById('globalDisabledNotice');
  let currentDomain = '';

  /**
   * Update the UI state based on global enabled setting.
   * When globally disabled, site settings are visually disabled.
   */
  function updateUIState(globalEnabled) {
    enabledCheckbox.disabled = !globalEnabled;
    hideMagnitudeCheckbox.disabled = !globalEnabled;
    if (globalEnabled) {
      globalDisabledNotice.classList.remove('visible');
    } else {
      globalDisabledNotice.classList.add('visible');
    }
  }

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
    chrome.storage.local.get({ siteConfigs: {}, globalEnabled: true }, result => {
      const siteConfigs = result.siteConfigs || {};
      const globalEnabled = result.globalEnabled !== false;
      const defaultConfig = { enabled: false, hideMagnitude: false };
      const config = Object.assign({}, defaultConfig, siteConfigs[currentDomain] || {});

      globalEnabledCheckbox.checked = globalEnabled;
      enabledCheckbox.checked = Boolean(config.enabled);
      hideMagnitudeCheckbox.checked = Boolean(config.hideMagnitude);
      updateUIState(globalEnabled);
    });
  });

  // Update global enabled state
  function updateGlobalEnabled() {
    const newGlobalEnabled = globalEnabledCheckbox.checked;
    chrome.storage.local.set({ globalEnabled: newGlobalEnabled }, () => {
      updateUIState(newGlobalEnabled);
      // Broadcast config update to all tabs
      chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, { type: 'config-update' }, () => {
            void chrome.runtime.lastError;
          });
        }
      });
    });
  }

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

  globalEnabledCheckbox.addEventListener('change', updateGlobalEnabled);
  enabledCheckbox.addEventListener('change', updateConfig);
  hideMagnitudeCheckbox.addEventListener('change', updateConfig);
});
