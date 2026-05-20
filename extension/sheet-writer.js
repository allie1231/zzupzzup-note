import { getSheetSettings } from "./settings-store.js";

export async function saveClipToSheet(clip) {
  const settings = await getSheetSettings();
  validateWebAppUrl(settings.webAppUrl);
  try {
    const data = await postToSheet(settings, { clip });
    if (!data.ok) {
      throw new Error(data.error || "Google Sheets에 저장하지 못했습니다.");
    }
    return "Google Sheets";
  } catch (error) {
    if (!isHtmlAppsScriptError(error)) throw error;
    await postToSheetNoCors(settings, { clip });
    return "Google Sheets로 전송";
  }
}

export async function testSheetConnection() {
  const settings = await getSheetSettings();
  validateWebAppUrl(settings.webAppUrl);

  try {
    const pingResponse = await fetch(withParams(settings.webAppUrl, { ping: "1" }), {
      method: "GET",
      credentials: "include"
    });
    const ping = await parseJsonResponse(pingResponse);
    if (!ping.ok) {
      throw new Error(ping.error || "Apps Script 배포 URL이 응답하지 않습니다.");
    }

    const response = await fetch(withParams(settings.webAppUrl, { token: settings.token }), {
      method: "GET",
      credentials: "include"
    });
    const data = await parseJsonResponse(response);
    if (!data.ok) {
      throw new Error(data.error || "Google Sheets 연결 테스트에 실패했습니다.");
    }
    return data;
  } catch (error) {
    if (!isHtmlAppsScriptError(error)) throw error;
    await fetch(withParams(settings.webAppUrl, { ping: "1" }), {
      method: "GET",
      mode: "no-cors",
      credentials: "include"
    });
    return { ok: true, sheet: "Apps Script", rows: "응답 확인 생략" };
  }
}

async function postToSheet(settings, payload) {
  const response = await fetch(settings.webAppUrl, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      token: settings.token,
      ...payload
    })
  });

  return parseJsonResponse(response);
}

async function postToSheetNoCors(settings, payload) {
  await fetch(settings.webAppUrl, {
    method: "POST",
    mode: "no-cors",
    credentials: "include",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      token: settings.token,
      ...payload
    })
  });
}

function validateWebAppUrl(webAppUrl) {
  if (!webAppUrl) {
    throw new Error("Google Sheets Web App URL을 먼저 설정해 주세요.");
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(webAppUrl)) {
    throw new Error("Web App URL은 Apps Script 배포 URL의 /exec 주소여야 합니다.");
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 120);
    if (text.includes("Authorization needed")) {
      throw new Error("Apps Script 권한 승인이 필요합니다. Apps Script에서 doGet을 실행해 권한 승인 후 새 버전으로 다시 배포해 주세요.");
    }
    if (text.includes("<title>오류</title>") || text.includes("<title>Error</title>")) {
      throw new Error(`Apps Script 오류 페이지가 돌아왔습니다. 배포 설정에서 실행 권한은 '나', 액세스 권한은 '모든 사용자'인지 확인하고 새 버전으로 다시 배포해 주세요. 응답: ${preview}`);
    }
    throw new Error(`Google Sheets가 JSON이 아닌 응답을 보냈습니다. Web App 배포 권한과 /exec URL을 확인해 주세요. 응답: ${preview}`);
  }
}

function withParams(url, params) {
  const parsed = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) parsed.searchParams.set(key, value);
  });
  return parsed.toString();
}

function isHtmlAppsScriptError(error) {
  const message = String(error?.message || "");
  return message.includes("Apps Script 오류 페이지")
    || message.includes("JSON이 아닌 응답")
    || message.includes("Authorization needed");
}
