// --- CONFIGURATION ---
const MAX_ROWS = 100000;
const SUPABASE_URL = "https://wmdmqpttcqooqmhfprrm.supabase.co/rest/v1/articles";
const SUPABASE_KEY = "sb_publishable_EU2FR9zzKlBXBEkmpSS7YA_w1dEf5G8"; //  Anon Key
const MY_SECRET_PASSWORD = PropertiesService.getScriptProperties().getProperty("SUPABASE_SECRET");

function fetchLatestDOIs() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const existingDois = getExistingDois(sheet);

  const subjectsToSearch = [
    "Physics", "Chemistry", "Biology", "Mathematics", "Biochemistry", 
    "Nanoscience", "Quantum Mechanics", "Computer Science", 
    "Artificial Intelligence", "Machine Learning", "Quantum Computing", 
    "Medicine", "Public Health", "Genetics", "Microbiology", 
    "Data Science", "Neuroscience", "Psychology", "Sociology", "Economics"
  ];

  const newRowsData = [];

  for (const subject of subjectsToSearch) {
    Logger.log(`Fetching from Crossref for: ${subject}`);
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(subject)}&sort=created&order=desc&rows=10`;
    
    let response = null;
    let success = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (response.getResponseCode() === 200) {
          success = true;
          break;
        }
      } catch (e) {
        Logger.log(`Attempt ${attempt} failed for ${subject}`);
      }
      if (!success && attempt < 3) Utilities.sleep(2000); 
    }

    if (!success) continue; 

    const data = JSON.parse(response.getContentText());
    const items = data.message.items;

    for (const item of items) {
      const doi = item.DOI;
      if (doi && !existingDois.has(doi)) {
        const title = item.title ? item.title[0] : "No Title";
        let rawJournal = item["container-title"] ? item["container-title"][0] : "Unknown Journal";
        const journal = rawJournal.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
        const createdDate = item.created && item.created["date-time"]
          ? item.created["date-time"].split("T")[0]
          : "Unknown Date";
        
        newRowsData.push([createdDate, doi, title, journal]); 
      }
    }
  }

  if (newRowsData.length > 0) {
    if (sheet.getLastRow() < 1) {
      sheet.appendRow(["Date", "DOI", "Title", "Journal"]);
    }
    newRowsData.reverse();
    sheet.insertRowsAfter(1, newRowsData.length);
    sheet.getRange(2, 1, newRowsData.length, 4).setValues(newRowsData);
    
    applyDoiLinks(sheet, newRowsData.length);
    sendToSupabase(newRowsData);
  }

  pruneOldRows(sheet, MAX_ROWS);
}

// --- HELPER FUNCTIONS ---

function getExistingDois(sheet) {
  const existingDois = new Set();
  if (sheet.getLastRow() > 1) {
    const doiValues = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    for (const row of doiValues) {
      if (row[0]) existingDois.add(row[0]);
    }
  }
  return existingDois;
}

function applyDoiLinks(sheet, numNewRows) {
  for (let j = 0; j < numNewRows; j++) {
    const cell = sheet.getRange(2 + j, 2);
    const doiText = cell.getValue();
    if (doiText) {
      const doiLink = `https://doi.org/${doiText}`;
      const richTextLink = SpreadsheetApp.newRichTextValue()
        .setText(doiText)
        .setLinkUrl(doiLink)
        .build();
      cell.setRichTextValue(richTextLink);
    }
  }
}

function sendToSupabase(newRowsData) {
  const payload = newRowsData.map(row => ({
    date: row[0],
    doi: row[1],
    title: row[2],
    journal: row[3]
  }));

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Prefer": "resolution=ignore-duplicates",
      "x-my-secret": MY_SECRET_PASSWORD // Security Password
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(SUPABASE_URL, options);
    Logger.log("Supabase Success: " + response.getContentText());
  } catch (e) {
    Logger.log("Supabase Error: " + e.message);
  }
}

function pruneOldRows(sheet, maxRows) {
  const currentLastRow = sheet.getLastRow();
  if (currentLastRow > maxRows) {
    const rowsToDelete = currentLastRow - maxRows;
    sheet.deleteRows(maxRows + 1, rowsToDelete);
  }
}

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getDisplayValues();
  data.shift();
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}