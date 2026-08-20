/**
 * Fetches recent Crossref articles, sends them to Supabase,
 * and then inserts them into the configured Google Sheet.
 *
 * @return {Object} Execution summary.
 */
function fetchLatestDOIs() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    Logger.log('Ingestion skipped because another run is already active.');
    return {
      status: 'skipped',
      reason: 'another_run_is_active'
    };
  }

  try {
    return fetchLatestDOIsInternal_();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Internal ingestion workflow.
 *
 * Supabase is written before the Sheet. If the Sheet write fails after
 * Supabase succeeds, the next run can safely retry because DOI duplicates
 * are ignored by Supabase when a unique DOI constraint exists.
 *
 * @return {Object} Execution summary.
 * @private
 */
function fetchLatestDOIsInternal_() {
  const config = getConfig_();
  const sheet = getResearchSheet_();

  ensureSheetHeader_(sheet);

  const knownDois = getExistingDois_(sheet);
  const newRows = [];
  let subjectsSucceeded = 0;
  let subjectsFailed = 0;

  for (const subject of APP_CONFIG.subjects) {
    try {
      Logger.log('Fetching Crossref records for: ' + subject);

      const items = fetchCrossrefSubject_(subject, config);

      for (const item of items) {
        const article = normalizeCrossrefArticle_(item);

        if (!article || knownDois.has(article.doi)) {
          continue;
        }

        knownDois.add(article.doi);

        const row = [
          article.date,
          article.doi,
          article.title,
          article.journal
        ];
        row.is_frontend_visible = isFrontendVisible_(article.title);
        newRows.push(row);
      }

      subjectsSucceeded++;

      Logger.log(JSON.stringify({
        event: 'crossref_subject_completed',
        subject: subject,
        itemCount: items.length
      }));
    } catch (error) {
      subjectsFailed++;

      Logger.log(JSON.stringify({
        event: 'crossref_subject_failed',
        subject: subject,
        error: error.message
      }));
    }
  }

  if (newRows.length === 0) {
    pruneOldRows_(sheet, APP_CONFIG.maxSheetRows);

    Logger.log(JSON.stringify({
      event: 'ingestion_completed',
      newRows: 0,
      subjectsSucceeded: subjectsSucceeded,
      subjectsFailed: subjectsFailed
    }));

    return {
      status: 'completed',
      newRows: 0,
      subjectsSucceeded: subjectsSucceeded,
      subjectsFailed: subjectsFailed
    };
  }

  newRows.sort(function(a, b) {
    return String(b[0] || '').localeCompare(String(a[0] || ''));
  });

  // Send first so a failed Supabase request does not create a permanent
  // synchronization gap in the Sheet.
  sendToSupabase_(newRows, config);
  insertRowsIntoSheet_(sheet, newRows);

  pruneOldRows_(sheet, APP_CONFIG.maxSheetRows);

  Logger.log(JSON.stringify({
    event: 'ingestion_completed',
    newRows: newRows.length,
    subjectsSucceeded: subjectsSucceeded,
    subjectsFailed: subjectsFailed
  }));

  return {
    status: 'completed',
    newRows: newRows.length,
    subjectsSucceeded: subjectsSucceeded,
    subjectsFailed: subjectsFailed
  };
}

/**
 * Determines whether an article title should be shown in the frontend.
 *
 * @param {*} title Article title.
 * @return {boolean} Whether the title is frontend-visible.
 * @private
 */
function isFrontendVisible_(title) {
  const normalizedTitle = String(title || "").trim();

  if (!normalizedTitle) {
    return false;
  }

  return !(/\p{L}/u.test(normalizedTitle) && normalizedTitle === normalizedTitle.toUpperCase());
}