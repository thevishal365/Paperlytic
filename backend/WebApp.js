/**
 * Returns paginated research data.
 *
 * This endpoint is intended for a private deployment. The manifest should
 * use webapp access "MYSELF" unless an external authenticated API is added.
 *
 * @param {Object} e Web-app event object.
 * @return {TextOutput} JSON response.
 */
function doGet(e) {
  try {
    const sheet = getResearchSheet_();
    const values = sheet.getDataRange().getDisplayValues();

    const offset = parseNonNegativeInteger_(e && e.parameter ? e.parameter.offset : null, 0);

    const requestedLimit = parseNonNegativeInteger_(
      e && e.parameter ? e.parameter.limit : null,
      100,
    );

    const limit = Math.min(requestedLimit || 100, APP_CONFIG.maxApiRows);

    if (values.length <= 1) {
      return createJsonResponse_({
        data: [],
        offset: offset,
        limit: limit,
        count: 0,
      });
    }

    const records = values
      .slice(1)
      .filter(function (row) {
        return row.some(function (value) {
          return String(value).trim() !== "";
        });
      })
      .slice(offset, offset + limit)
      .map(function (row) {
        return {
          date: row[0] || null,
          doi: row[1] || null,
          title: row[2] || null,
          journal: row[3] || null,
        };
      });

    return createJsonResponse_({
      data: records,
      offset: offset,
      limit: limit,
      count: records.length,
    });
  } catch (error) {
    Logger.log("doGet failed: " + error.message);

    return createJsonResponse_({
      error: "Internal server error.",
    });
  }
}

/**
 * Creates a JSON response.
 *
 * @param {Object} payload Response payload.
 * @return {TextOutput} JSON response.
 * @private
 */
function createJsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
