/*
 * Content script for the "Replace Numbers with X" extension.
 *
 * This script performs two main tasks:
 *   1. It scans the DOM for text nodes and replaces any numeric digits
 *      or spelled‑out number words with a sequence of 'x' characters of
 *      equivalent length. It runs on initial page load and uses a
 *      MutationObserver to handle dynamically added content. Certain
 *      elements such as <script>, <style>, <textarea>, <code> and
 *      <pre> are skipped so that executable scripts and code samples
 *      remain unaffected.
 *   2. It injects another script (injection.js) into the page's
 *      document context. That injected script overrides
 *      CanvasRenderingContext2D methods (fillText, strokeText and
 *      measureText) so that any text drawn into a canvas has its
 *      numbers transformed to 'x' characters before rendering.
 */

(() => {
  // Default configuration. These values will be overridden by
  // persisted user settings when available.
  const defaultConfig = {
    // When no site‑specific configuration exists, the extension is
    // disabled by default. Users can enable it per‑site via the popup.
    enabled: false,
    hideMagnitude: false
  };

  // Number words used for matching spelled‑out numbers.
  const numberWords = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty',
    'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million',
    'billion', 'trillion'
  ];

  // Precompute regular expressions for numeric patterns, spelled numbers and dates.
  const numberWithSuffixRegex = /\d+(?:[.,]\d+)*(?:\s*(?:[kKmMbBtT](?:n)?\b))?/g;
  const wordRegex = new RegExp(`\\b(${numberWords.join('|')})\\b`, 'gi');
  const datePatterns = [
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{2,4})?/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b\d{4}\b/g,
    /\bDay\s+\d{1,2}\b/gi
  ];

  /**
   * Identify ranges of characters corresponding to date patterns.
   * @param {string} text
   * @returns {Array<{start:number,end:number}>}
   */
  function findDateRanges(text) {
    const ranges = [];
    datePatterns.forEach(re => {
      let match;
      while ((match = re.exec(text)) !== null) {
        ranges.push({ start: match.index, end: match.index + match[0].length });
      }
    });
    return ranges;
  }

  /**
   * Check if an index falls within any of the date ranges.
   * @param {number} index
   * @param {Array<{start:number,end:number}>} ranges
   */
  function indexInRanges(index, ranges) {
    for (const r of ranges) {
      if (index >= r.start && index < r.end) {
        return true;
      }
    }
    return false;
  }

  /**
   * Transform a string according to the current configuration. If
   * hideMagnitude is true, all numeric expressions are replaced with
   * exactly three replacement characters. Date substrings are
   * preserved. Spelled‑out numbers are handled similarly.
   *
   * @param {string} text
   * @param {Object} config
   */
  function transformString(text, config) {
    const ranges = findDateRanges(text);
    let result = text;
    // Replace numeric sequences with optional suffixes
    result = result.replace(numberWithSuffixRegex, (match, offset) => {
      if (indexInRanges(offset, ranges)) {
        return match;
      }
      if (config.hideMagnitude) {
        return '•••';
      }
      let out = '';
      for (let i = 0; i < match.length; i++) {
        const c = match[i];
        if (/[0-9a-zA-Z]/.test(c)) {
          out += '•';
        } else {
          out += c;
        }
      }
      return out;
    });
    // Replace spelled‑out numbers
    result = result.replace(wordRegex, (match, offset) => {
      if (indexInRanges(offset, ranges)) {
        return match;
      }
      if (config.hideMagnitude) {
        return '•••';
      }
      return '•'.repeat(match.length);
    });
    return result;
  }

  /**
   * Determine whether a text node should be skipped (e.g., script,
   * style, textarea, code or pre elements).
   * @param {Node} node
   */
  function shouldSkip(node) {
    for (let parent = node.parentNode; parent; parent = parent.parentNode) {
      if (parent.nodeType === Node.ELEMENT_NODE) {
        const tag = parent.nodeName.toLowerCase();
        if (['script', 'style', 'textarea', 'code', 'pre'].includes(tag)) {
          return true;
        }
      }
    }
    return false;
  }

  // Keep track of the last injected script element so it can be removed
  // when configuration changes.
  let injectedScriptElement = null;

  /**
   * Inject the canvas override script with the given configuration. The
   * configuration object is serialized onto a data‑config attribute so
   * that injection.js can read it.
   * @param {Object} config
   */
  function injectCanvasScript(config) {
    // Remove any previously injected script to avoid stacking
    if (injectedScriptElement && injectedScriptElement.parentNode) {
      injectedScriptElement.parentNode.removeChild(injectedScriptElement);
    }
    if (!document.documentElement) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = chrome.runtime.getURL('injection.js');
    script.setAttribute('data-config', JSON.stringify(config));
    script.onload = () => {
      script.remove();
    };
    document.documentElement.appendChild(script);
    injectedScriptElement = script;
  }

  /**
   * Process a text node using the given configuration.
   * @param {Node} textNode
   * @param {Object} config
   */
  function processTextNode(textNode, config) {
    if (textNode.nodeType !== Node.TEXT_NODE) return;
    if (shouldSkip(textNode)) return;
    const original = textNode.nodeValue;
    const transformed = transformString(original, config);
    if (transformed !== original) {
      textNode.nodeValue = transformed;
    }
  }

  /**
   * Recursively process all text nodes under a given node.
   * @param {Node} node
   * @param {Object} config
   */
  function processTree(node, config) {
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let current;
    while ((current = walker.nextNode())) {
      processTextNode(current, config);
    }
  }

  /**
   * Load configuration from chrome.storage and then apply processing and
   * injection. If storage retrieval fails, defaults are used.
   */
  function initialize() {
    const hostname = window.location.hostname;
    chrome.storage.local.get({ siteConfigs: {} }, result => {
      const siteConfigs = result.siteConfigs || {};
      const siteConfig = siteConfigs[hostname] || {};
      const config = Object.assign({}, defaultConfig, siteConfig);
      // If disabled for this site, do nothing.
      if (!config.enabled) {
        return;
      }
      // Process existing text
      processTree(document.body, config);
      // Observe mutations for dynamic content
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              processTextNode(node, config);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              processTree(node, config);
            }
          });
          if (mutation.type === 'characterData' && mutation.target) {
            processTextNode(mutation.target, config);
          }
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      // Inject the canvas override script for this site
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => injectCanvasScript(config));
      } else {
        injectCanvasScript(config);
      }
    });
  }

  // Listen for configuration updates from the popup. When a
  // config‑update message is received, reload configuration and
  // re‑initialize processing and injection. This does not undo any
  // previous replacements on the current page.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'config-update') {
      initialize();
    }
  });

  // Kick off initialization
  initialize();
})();