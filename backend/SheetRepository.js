/**
 * Gets the configured sheet instead of relying on the active tab.
 *
 * @return {GoogleAppsScript.Spreadsheet.Sheet} Configured sheet.
 * @private
 */
function getResearchSheet_() {
  const config = getConfig_();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    throw new Error(
      'Sheet not found. Check SHEET_NAME: ' + config.sheetName
    );
  }

  return sheet;
}

/**
 * Gets all existing normalized DOIs from the Sheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Target sheet.
 * @return {Set<string>} Existing DOI set.
 * @private
 */
function getExistingDois_(sheet) {
  const dois = new Set();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return dois;
  }

  const values = sheet
    .getRange(2, 2, lastRow - 1, 1)
    .getValues();

  values.forEach(function(row) {
    const doi = normalizeDoi_(row[0]);

    if (doi) {
      dois.add(doi);
    }
  });

  return dois;
}

/**
 * Ensures that the first row contains the expected headers.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Target sheet.
 * @private
 */
function ensureSheetHeader_(sheet) {
  const expectedHeaders = APP_CONFIG.expectedHeaders;
  const currentHeaders = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getDisplayValues()[0];

  const matches = expectedHeaders.every(function(header, index) {
    return currentHeaders[index] === header;
  });

  if (!matches) {
    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);
  }
}

/**
 * Inserts rows immediately below the header in one batch.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Target sheet.
 * @param {Array<Array<*>>} rows Rows to insert.
 * @private
 */
function insertRowsIntoSheet_(sheet, rows) {
  sheet.insertRowsAfter(1, rows.length);

  sheet
    .getRange(2, 1, rows.length, 4)
    .setValues(rows);

  applyDoiLinks_(sheet, rows);
}

/**
 * Applies DOI hyperlinks in one batch.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Target sheet.
 * @param {Array<Array<*>>} rows Inserted rows.
 * @private
 */
function applyDoiLinks_(sheet, rows) {
  const richTextValues = rows.map(function(row) {
    const doi = String(row[1]);

    return [
      SpreadsheetApp.newRichTextValue()
        .setText(doi)
        .setLinkUrl('https://doi.org/' + doi)
        .build()
    ];
  });

  sheet
    .getRange(2, 2, richTextValues.length, 1)
    .setRichTextValues(richTextValues);
}

/**
 * Keeps the header plus the newest configured number of rows.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Target sheet.
 * @param {number} maxRows Maximum total Sheet rows.
 * @private
 */
function pruneOldRows_(sheet, maxRows) {
  const currentLastRow = sheet.getLastRow();

  if (currentLastRow > maxRows) {
    sheet.deleteRows(
      maxRows + 1,
      currentLastRow - maxRows
    );
  }
}