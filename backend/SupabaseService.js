/**
 * Sends rows to Supabase in controlled batches.
 *
 * @param {Array<Array<*>>} rows Rows to send.
 * @param {Object} config Application configuration.
 * @private
 */
function sendToSupabase_(rows, config) {
  for (
    let start = 0;
    start < rows.length;
    start += APP_CONFIG.supabaseBatchSize
  ) {
    const batch = rows.slice(
      start,
      start + APP_CONFIG.supabaseBatchSize
    );

    const payload = batch.map(function(row) {
      return {
        date: row[0],
        doi: row[1],
        title: row[2],
        journal: row[3],
        is_frontend_visible: row.is_frontend_visible
      };
    });

    const response = UrlFetchApp.fetch(config.supabaseUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        apikey: config.supabaseKey,
        Authorization: 'Bearer ' + config.supabaseKey,
        Prefer: 'resolution=ignore-duplicates',
        'x-my-secret': config.supabaseSecret
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(
        'Supabase returned HTTP ' + statusCode + ': ' +
        responseText.slice(0, 1000)
      );
    }

    Logger.log(JSON.stringify({
      event: 'supabase_batch_completed',
      batchSize: batch.length,
      statusCode: statusCode
    }));
  }
}