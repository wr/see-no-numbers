/*
 * This script runs in the page context and overrides certain
 * CanvasRenderingContext2D methods. It reads configuration from a
 * JSON string stored in the data‑config attribute of the script
 * element that loaded it. The configuration object can contain:
 *   - enabled (boolean): if false, no transformation occurs.
 *   - hideMagnitude (boolean): if true, all numeric expressions are
 *     replaced with a fixed number of X's (three) regardless of
 *     length or suffix.
 *   - uppercase (boolean): when true, replacement characters are
 *     uppercase 'X'; otherwise they are lowercase 'x'.
 * The replacement logic handles plain digits, numbers with decimal
 * points or commas, optional magnitude suffixes (K, M, B, T, Bn, Tn)
 * and spelled‑out numbers. Date patterns such as "Nov 22, 2025",
 * "11/22", "11/22/25", "2025" and "Day 13" are detected and left
 * untouched.
 */

(() => {
  // Attempt to parse configuration from the current script's data‑config
  // attribute. If unavailable or invalid, fallback to default values.
  let config = {
    enabled: false,
    hideMagnitude: false
  };
  try {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.getAttribute('data-config')) {
      const parsed = JSON.parse(currentScript.getAttribute('data-config'));
      config = Object.assign({}, config, parsed);
    }
  } catch (err) {
    // If parsing fails, stick with defaults.
  }

  // If the extension is disabled, do nothing.
  if (!config.enabled) {
    return;
  }

  // List of spelled‑out number words. Used for matching words like
  // "twenty", "hundred", etc. to be replaced. Note that month names
  // are intentionally excluded.
  const numberWords = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty',
    'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million',
    'billion', 'trillion'
  ];

  // Precompile regular expressions.
  // numberWithSuffixRegex matches sequences of digits (with optional
  // commas or decimal points) optionally followed by a magnitude suffix.
  // Match numbers with optional decimals or commas and an optional
  // magnitude suffix (K, M, B, T, Bn, Tn). A word boundary after
  // the suffix ensures that we don't inadvertently consume the first
  // letter of the next word (e.g. in "100 this" the "t" shouldn't
  // be treated as a suffix).
  const numberWithSuffixRegex = /\d+(?:[.,]\d+)*(?:\s*(?:[kKmMbBtT](?:n)?\b))?/g;
  // Regex for spelled‑out number words. Boundaries ensure we don't
  // replace inside larger words. Case insensitive.
  const wordRegex = new RegExp(`\\b(${numberWords.join('|')})\\b`, 'gi');
  // Date patterns to skip. We detect month abbreviations/full names
  // followed by a day with optional year, numeric dates separated by
  // slashes, four‑digit years and "Day XX" style strings. These
  // patterns are case insensitive.
  const datePatterns = [
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{2,4})?/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b\d{4}\b/g,
    /\bDay\s+\d{1,2}\b/gi
  ];

  /**
   * Identify the ranges of text that correspond to dates. Returns an
   * array of objects with start and end indices.
   *
   * @param {string} text The input text
   * @returns {Array<{start:number,end:number}>} Array of ranges
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
   * Determine whether a given index lies within any of the provided
   * ranges.
   *
   * @param {number} index The character index
   * @param {Array<{start:number,end:number}>} ranges Array of ranges
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
   * Transform a string by replacing numeric values and spelled‑out
   * numbers with X's. Date substrings are preserved. If hideMagnitude
   * is true, all numeric expressions are replaced by exactly three
   * X's. Replacement characters are uppercase or lowercase depending
   * on the config.
   *
   * @param {string} text The original string
   * @returns {string} The transformed string
   */
  function transformString(text) {
    const ranges = findDateRanges(text);
    let result = text;
    // First handle numbers with optional suffixes (digits, decimals, commas, suffix)
    result = result.replace(numberWithSuffixRegex, (match, offset) => {
      // Skip if this match falls inside a date pattern.
      if (indexInRanges(offset, ranges)) {
        return match;
      }
      if (config.hideMagnitude) {
        // When hiding magnitude, return three bullet characters.
        return '•••';
      }
      // Otherwise, replace digits and letters in the match with X's while
      // preserving punctuation and whitespace.
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
    // Next handle spelled‑out numbers. This runs after numeric
    // replacements so that any overlapping ranges are already skipped.
    result = result.replace(wordRegex, (match, offset) => {
      // Skip if inside a detected date range
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

  // Preserve original canvas methods for later use.
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

  /**
   * Override fillText to transform numeric content before drawing.
   */
  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
    if (typeof text === 'string') {
      const newText = transformString(text);
      if (maxWidth !== undefined) {
        return originalFillText.call(this, newText, x, y, maxWidth);
      }
      return originalFillText.call(this, newText, x, y);
    }
    return originalFillText.apply(this, arguments);
  };

  /**
   * Override strokeText similarly to fillText.
   */
  CanvasRenderingContext2D.prototype.strokeText = function(text, x, y, maxWidth) {
    if (typeof text === 'string') {
      const newText = transformString(text);
      if (maxWidth !== undefined) {
        return originalStrokeText.call(this, newText, x, y, maxWidth);
      }
      return originalStrokeText.call(this, newText, x, y);
    }
    return originalStrokeText.apply(this, arguments);
  };

  /**
   * Override measureText so widths are computed based on transformed text.
   */
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    if (typeof text === 'string') {
      const newText = transformString(text);
      return originalMeasureText.call(this, newText);
    }
    return originalMeasureText.apply(this, arguments);
  };
})();