/**
 * Matches only verified non-research paratext titles.
 */
const PROVEN_PARATEXT_TITLE_PATTERN_ =
  /^(issue information|graphical abstract toc|editorial board|contents continued)$/i;

/**
 * Matches page strings consisting solely of Roman numerals (e.g. "i-ii", "iv").
 */
const ROMAN_NUMERAL_PAGE_PATTERN_ =
  /^[ivxlcdm]+(?:[-–][ivxlcdm]+)?$/i;

/**
 * Matches English language code prefixes ("en", "eng", "EN").
 */
const ENGLISH_LANGUAGE_PREFIX_ =
  /^en/i;

/**
 * Fetches one Crossref subject with retry handling.
 *
 * @param {string} subject Crossref search subject.
 * @param {Object} config Application configuration.
 * @return {Array<Object>} Crossref work items.
 * @private
 */
function fetchCrossrefSubject_(subject, config) {
  const url =
    'https://api.crossref.org/works' +
    '?query=' + encodeURIComponent(subject) +
    '&filter=type:journal-article' +
    '&sort=created' +
    '&order=desc' +
    '&rows=' + APP_CONFIG.crossrefRowsPerSubject;

  const response = fetchWithRetry_(url, {
    method: 'get',
    headers: {
      'User-Agent':
        'Research Feed/1.0 (mailto:' + config.crossrefMailto + ')'
    },
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    throw new Error(
      'Crossref returned HTTP ' + statusCode + ': ' +
      response.getContentText().slice(0, 500)
    );
  }

  let body;

  try {
    body = JSON.parse(response.getContentText());
  } catch (error) {
    throw new Error('Crossref returned invalid JSON.');
  }

  if (
    !body.message ||
    !Array.isArray(body.message.items)
  ) {
    throw new Error('Crossref response has an unexpected structure.');
  }

  return body.message.items;
}

/**
 * Converts a Crossref item into the application data format.
 *
 * @param {Object} item Crossref item.
 * @return {Object|null} Normalized article or null.
 * @private
 */
function normalizeCrossrefArticle_(item) {
  if (!item) {
    return null;
  }

  if (item.type !== 'journal-article') {
    return null;
  }

  if (item.language && !ENGLISH_LANGUAGE_PREFIX_.test(String(item.language).trim())) {
    return null;
  }

  const doi = normalizeDoi_(item.DOI);

  if (!doi) {
    return null;
  }

  if (!item.title || !item.title.length) {
    return null;
  }

  const title = cleanCrossrefTitle_(item.title[0]);

  if (!title || PROVEN_PARATEXT_TITLE_PATTERN_.test(title)) {
    return null;
  }

  if (item.page && ROMAN_NUMERAL_PAGE_PATTERN_.test(String(item.page).trim())) {
    return null;
  }

  const journal =
    item['container-title'] &&
    item['container-title'].length
      ? String(item['container-title'][0]).trim()
      : 'Unknown Journal';

  return {
    date: extractCreatedDate_(item),
    doi: doi,
    title: title,
    journal: journal
  };
}

/**
 * Normalizes DOI values for reliable duplicate detection.
 *
 * @param {*} value DOI value.
 * @return {string} Normalized DOI.
 * @private
 */
function normalizeDoi_(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .toLowerCase();
}

/**
 * Cleans Crossref title markup, entities, and whitespace while preserving text.
 *
 * @param {*} value Raw Crossref title.
 * @return {string} Cleaned title.
 * @private
 */
function cleanCrossrefTitle_(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, function(match, entity) {
      const lowerEntity = entity.toLowerCase();

      if (lowerEntity === 'amp') return '&';
      if (lowerEntity === 'lt') return '<';
      if (lowerEntity === 'gt') return '>';
      if (lowerEntity === 'quot') return '"';
      if (lowerEntity === 'apos') return "'";
      if (lowerEntity === 'nbsp') return ' ';

      if (lowerEntity.indexOf('#x') === 0) {
        return String.fromCodePoint(parseInt(lowerEntity.slice(2), 16));
      }

      if (lowerEntity.indexOf('#') === 0) {
        return String.fromCodePoint(parseInt(lowerEntity.slice(1), 10));
      }

      return match;
    })
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts a PostgreSQL-compatible date.
 *
 * @param {Object} item Crossref item.
 * @return {string|null} YYYY-MM-DD date or null.
 * @private
 */
function extractCreatedDate_(item) {
  const dateTime =
    item &&
    item.created &&
    item.created['date-time'];

  return dateTime
    ? String(dateTime).split('T')[0]
    : null;
}