// --- CONFIGURATION ---
const MAX_ROWS = 100000;

function fetchLatestDOIs() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const existingDois = getExistingDois(sheet);

  const subjectsToSearch = [
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
    "Economics"
  ];

  const newRowsData = [];

  for (const subject of subjectsToSearch) {
    Logger.log(`Fetching articles for: ${subject}`);
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
        // Retry logic
      }
      if (!success && attempt < 3) Utilities.sleep(2000); 
    }

    if (!success) continue; 

    const data = JSON.parse(response.getContentText());
    const items = data.message.items;

    for (const item of items) {
      const doi = item.DOI;
      if (!existingDois.has(doi)) {
        const title = item.title ? item.title[0] : "No Title";
        const journal = item["container-title"] ? item["container-title"][0] : "Unknown Journal";
        const createdDate = item.created && item.created["date-time"]
          ? item.created["date-time"].split("T")[0]
          : "Unknown Date";
        
        // Exact 4 columns: Date, DOI, Title, Journal
        newRowsData.push([createdDate, doi, title, journal]); 
      }
    }
  }

  if (newRowsData.length > 0) {
    if (sheet.getLastRow() < 1) {
      sheet.appendRow(["Date", "DOI", "Title", "Journal"]); // 4 Headers
    }

    newRowsData.reverse();
    const numColumns = 4; // Column count 4 kar diya

    sheet.insertRowsAfter(1, newRowsData.length);
    sheet.getRange(2, 1, newRowsData.length, numColumns).setValues(newRowsData);
    applyDoiLinks(sheet, newRowsData.length);
    sendToSupabase(newRowsData);
  }

  pruneOldRows(sheet, MAX_ROWS);
}

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

function pruneOldRows(sheet, maxRows) {
  const currentLastRow = sheet.getLastRow();
  if (currentLastRow > maxRows) {
    const rowsToDelete = currentLastRow - maxRows;
    sheet.deleteRows(maxRows + 1, rowsToDelete);
  }
}

// 🌐 WEB APP BACKEND
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getDisplayValues();
  data.shift();

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Yeh function web page ko sheet ka saara data deta hai
function getSheetData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // 🔥 YAHAN CHANGE KIYA HAI: getValues() ki jagah getDisplayValues()
  const data = sheet.getDataRange().getDisplayValues(); 
  
  data.shift(); // Pehli row (Headers) hata do
  return data; 
}

const SUPABASE_URL = "https://wmdmqpttcqooqmhfprrm.supabase.co/rest/v1/articles";
const SUPABASE_KEY = "YOUR_SUPABASE_KEY_HERE";

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
      "Prefer": "resolution=ignore-duplicates" 
    },
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(SUPABASE_URL, options);
    Logger.log("Supabase me data chala gaya!");
  } catch (e) {
    Logger.log("Error aaya: " + e.message);
  }
}