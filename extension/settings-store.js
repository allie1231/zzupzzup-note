const SHEET_WEB_APP_URL_KEY = "sheetWebAppUrl";
const SHEET_TOKEN_KEY = "sheetToken";

export async function getSheetSettings() {
  const values = await chrome.storage.sync.get([SHEET_WEB_APP_URL_KEY, SHEET_TOKEN_KEY]);
  return {
    webAppUrl: String(values[SHEET_WEB_APP_URL_KEY] || "").trim(),
    token: String(values[SHEET_TOKEN_KEY] || "").trim()
  };
}

export async function setSheetSettings({ webAppUrl, token }) {
  await chrome.storage.sync.set({
    [SHEET_WEB_APP_URL_KEY]: String(webAppUrl || "").trim(),
    [SHEET_TOKEN_KEY]: String(token || "").trim()
  });
}
