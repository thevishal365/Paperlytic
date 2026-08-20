/**
 * Research Feed ingestion and JSON API.
 *
 * Required Script Properties:
 * - SUPABASE_URL
 * - SUPABASE_KEY
 * - SUPABASE_SECRET
 * - SHEET_NAME
 * - CROSSREF_MAILTO
 */

const APP_CONFIG = {
  maxSheetRows: 100000,
  crossrefRowsPerSubject: 10,
  maxAttempts: 3,
  initialRetryDelayMs: 1000,
  supabaseBatchSize: 100,
  maxApiRows: 1000,
  expectedHeaders: ["Date", "DOI", "Title", "Journal"],
  subjects: [
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
    "Biochemistry",
    "Nanoscience",
    "Quantum Mechanics",
    "Computer Science",
    "Artificial Intelligence",
    "Machine Learning",
    "Quantum Computing",
    "Medicine",
    "Public Health",
    "Genetics",
    "Microbiology",
    "Data Science",
    "Neuroscience",
    "Psychology",
    "Sociology",
    "Economics",
    "Deep Learning",
    "Robotics",
  ],
};

/**
 * Reads and validates Script Properties.
 *
 * @return {Object} Application configuration.
 * @private
 */
function getConfig_() {
  const properties = PropertiesService.getScriptProperties();

  const config = {
    supabaseUrl: properties.getProperty("SUPABASE_URL"),
    supabaseKey: properties.getProperty("SUPABASE_KEY"),
    supabaseSecret: properties.getProperty("SUPABASE_SECRET"),
    sheetName: properties.getProperty("SHEET_NAME"),
    crossrefMailto: properties.getProperty("CROSSREF_MAILTO"),
  };

  const missing = Object.keys(config).filter(function (key) {
    return !config[key] || !String(config[key]).trim();
  });

  if (missing.length > 0) {
    throw new Error("Missing required Script Properties: " + missing.join(", "));
  }

  return config;
}
