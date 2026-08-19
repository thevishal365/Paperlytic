/**
 * Performs an HTTP request with exponential backoff.
 *
 * @param {string} url Request URL.
 * @param {Object} options UrlFetchApp options.
 * @return {HTTPResponse} Successful HTTP response.
 * @private
 */
function fetchWithRetry_(url, options) {
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= APP_CONFIG.maxAttempts;
    attempt++
  ) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();

      if (statusCode >= 200 && statusCode < 300) {
        return response;
      }

      lastError = new Error(
        'HTTP ' + statusCode + ': ' +
        response.getContentText().slice(0, 500)
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < APP_CONFIG.maxAttempts) {
      const delayMs =
        APP_CONFIG.initialRetryDelayMs *
        Math.pow(2, attempt - 1);

      Utilities.sleep(delayMs);
    }
  }

  throw lastError || new Error('HTTP request failed.');
}

/**
 * Parses a non-negative integer.
 *
 * @param {*} value Input value.
 * @param {number} fallback Fallback value.
 * @return {number} Parsed integer.
 * @private
 */
function parseNonNegativeInteger_(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}