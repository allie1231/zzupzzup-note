const SETTINGS_KEYS = [
  "supabaseUrl",
  "supabaseAnonKey",
  "supabaseEmail",
  "supabaseAccessToken",
  "supabaseRefreshToken",
  "supabaseUserId"
];

const TABLE_NAME = "zzup_clips";
const IMAGE_BUCKET = "zzup-images";

export async function getCloudSettings() {
  const values = await chrome.storage.sync.get(SETTINGS_KEYS);
  return {
    url: normalizeUrl(values.supabaseUrl),
    anonKey: String(values.supabaseAnonKey || "").trim(),
    email: String(values.supabaseEmail || "").trim(),
    accessToken: String(values.supabaseAccessToken || ""),
    refreshToken: String(values.supabaseRefreshToken || ""),
    userId: String(values.supabaseUserId || "")
  };
}

export async function saveCloudConfig({ url, anonKey, email }) {
  await chrome.storage.sync.set({
    supabaseUrl: normalizeUrl(url),
    supabaseAnonKey: String(anonKey || "").trim(),
    supabaseEmail: String(email || "").trim()
  });
}

export async function signInToCloud({ url, anonKey, email, password }) {
  const settings = {
    url: normalizeUrl(url),
    anonKey: String(anonKey || "").trim()
  };
  const response = await fetch(`${settings.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(settings, false),
    body: JSON.stringify({
      email: String(email || "").trim(),
      password: String(password || "")
    })
  });
  const data = await parseJsonResponse(response, "Supabase 로그인에 실패했습니다.");
  await chrome.storage.sync.set({
    supabaseUrl: settings.url,
    supabaseAnonKey: settings.anonKey,
    supabaseEmail: String(email || "").trim(),
    supabaseAccessToken: data.access_token || "",
    supabaseRefreshToken: data.refresh_token || "",
    supabaseUserId: data.user?.id || ""
  });
  return getCloudSettings();
}

export async function clearCloudSession() {
  await chrome.storage.sync.remove(["supabaseAccessToken", "supabaseRefreshToken", "supabaseUserId"]);
}

export function hasCloudSession(settings) {
  return Boolean(settings?.url && settings?.anonKey && settings?.accessToken);
}

export async function saveClipToCloud(clip) {
  const settings = await getCloudSettings();
  ensureSession(settings);
  const response = await fetch(`${settings.url}/rest/v1/${TABLE_NAME}?on_conflict=id`, {
    method: "POST",
    headers: {
      ...authHeaders(settings),
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify([clipToRow(clip)])
  });
  const rows = await parseJsonResponse(response, "Supabase에 저장하지 못했습니다.");
  return rows[0] || clip;
}

export async function uploadImageFromUrl(imageUrl) {
  const settings = await getCloudSettings();
  ensureSession(settings);
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error("이미지를 가져오지 못했습니다.");
  const blob = await imageResponse.blob();
  const extension = extensionFromBlob(blob) || extensionFromUrl(imageUrl) || "png";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const uploadResponse = await fetch(`${settings.url}/storage/v1/object/${IMAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": blob.type || "application/octet-stream",
      "x-upsert": "true"
    },
    body: blob
  });
  await parseJsonResponse(uploadResponse, "Supabase Storage에 이미지를 올리지 못했습니다.");
  return {
    imagePath: path,
    imageUrl: `${settings.url}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`
  };
}

function clipToRow(clip) {
  return {
    id: clip.id,
    created_at: clip.createdAt || new Date().toISOString(),
    content_type: clip.contentType || "링크",
    sentence: clip.sentence || "",
    reason: clip.reason || "",
    connection: clip.connection || "",
    use_for: clip.useFor || "정리필요",
    action: clip.action || "정리필요",
    source: clip.source || "",
    site_name: clip.siteName || "",
    icon_url: clip.iconUrl || "",
    image_path: clip.imagePath || "",
    image_url: clip.imageUrl || "",
    title: clip.title || "",
    tags: Array.isArray(clip.tags) ? clip.tags : String(clip.tags || "").split(/\s+/).filter(Boolean),
    status: clip.status || "새로 수집",
    favorite: Boolean(clip.favorite),
    review_count: Number(clip.reviewCount || 0),
    last_reviewed: clip.lastReviewed || null,
    updated_at: new Date().toISOString()
  };
}

function authHeaders(settings, withBearer = true) {
  const headers = {
    apikey: settings.anonKey,
    "Content-Type": "application/json"
  };
  if (withBearer) headers.Authorization = `Bearer ${settings.accessToken}`;
  return headers;
}

function ensureSession(settings) {
  if (!hasCloudSession(settings)) {
    throw new Error("Supabase 설정/로그인이 필요합니다. 줍줍노트 설정에서 서버 보관함을 먼저 연결해 주세요.");
  }
}

async function parseJsonResponse(response, fallbackMessage) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(data?.message || data?.error_description || data?.error || fallbackMessage);
  }
  return data || [];
}

function extensionFromBlob(blob) {
  const type = blob.type.toLowerCase();
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  return "";
}

function extensionFromUrl(url) {
  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : "";
  } catch {
    return "";
  }
}

function normalizeUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}
