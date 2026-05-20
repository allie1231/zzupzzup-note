const SHEET_NAME = "줍줍노트";

const HEADERS = [
  "id",
  "수집 일시",
  "문장",
  "수집한 이유",
  "연결/확장",
  "활용처",
  "다음 액션",
  "출처",
  "사이트명",
  "아이콘 URL",
  "제목",
  "태그",
  "상태",
  "확인 횟수",
  "마지막 확인"
];

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    verifyToken_(payload.token);

    const clip = payload.clip || {};
    const sheet = getSheet_();
    ensureHeaders_(sheet);
    sheet.appendRow(toRow_(clip));

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function doGet(event) {
  try {
    if (event && event.parameter && event.parameter.ping === "1") {
      return json_({ ok: true, ping: true });
    }

    verifyToken_((event && event.parameter && event.parameter.token) || "");
    const sheet = getSheet_();
    ensureHeaders_(sheet);
    return json_({ ok: true, sheet: SHEET_NAME, rows: Math.max(0, sheet.getLastRow() - 1) });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function getSheet_() {
  const spreadsheet = getSpreadsheet_();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("No active spreadsheet. Create Apps Script from the Google Sheet, or set SPREADSHEET_ID in Script Properties.");
  }
  return spreadsheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
}

function verifyToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("JJNT_TOKEN");
  if (expected && token !== expected) {
    throw new Error("Invalid token");
  }
}

function toRow_(clip) {
  return [
    clip.id || Utilities.getUuid(),
    clip.createdAt || new Date().toISOString(),
    clip.sentence || "",
    clip.reason || "",
    clip.connection || "",
    clip.useFor || "에세이",
    clip.action || "확장",
    clip.source || "",
    clip.siteName || "",
    clip.iconUrl || "",
    clip.title || "",
    Array.isArray(clip.tags) ? clip.tags.join(" ") : (clip.tags || ""),
    clip.status || "새로 수집",
    Number(clip.reviewCount || 0),
    clip.lastReviewed || ""
  ];
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
