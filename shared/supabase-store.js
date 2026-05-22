const SETTINGS_KEY = "zzupzzup:supabase";
const TABLE_NAME = "zzup_clips";
const IMAGE_BUCKET = "zzup-images";
const DEFAULT_SUPABASE_URL = "https://ypgtipfqxjwtbwazccsr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZ3RpcGZxeGp3dGJ3YXpjY3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTY2ODYsImV4cCI6MjA5NDkzMjY4Nn0.CvsH3IvTiTTk3CdgnTXsKOHa9CzueUj3fID-4J6pNio";

export function getCloudSettings() {
  try {
    return withDefaultConfig(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch {
    return withDefaultConfig({});
  }
}

export function saveCloudSettings(settings = {}) {
  const current = getCloudSettings();
  const next = {
    ...current,
    url: normalizeUrl(settings.url ?? current.url ?? DEFAULT_SUPABASE_URL),
    anonKey: String(settings.anonKey ?? current.anonKey ?? DEFAULT_SUPABASE_ANON_KEY).trim(),
    email: String(settings.email ?? current.email ?? "").trim(),
    accessToken: settings.accessToken ?? current.accessToken ?? "",
    refreshToken: settings.refreshToken ?? current.refreshToken ?? "",
    userId: settings.userId ?? current.userId ?? ""
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function clearCloudSession() {
  const current = getCloudSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    url: current.url || DEFAULT_SUPABASE_URL,
    anonKey: current.anonKey || DEFAULT_SUPABASE_ANON_KEY,
    email: current.email || ""
  }));
}

export async function refreshCloudSession(settings = getCloudSettings()) {
  if (!settings.refreshToken) {
    throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
  }
  const response = await fetch(`${settings.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(settings, false),
    body: JSON.stringify({ refresh_token: settings.refreshToken })
  });
  const data = await parseJsonResponse(response, "Supabase 로그인 세션을 갱신하지 못했습니다.");
  return saveCloudSettings({
    url: settings.url,
    anonKey: settings.anonKey,
    email: settings.email,
    accessToken: data.access_token || "",
    refreshToken: data.refresh_token || settings.refreshToken || "",
    userId: data.user?.id || settings.userId || ""
  });
}

export function hasCloudSession(settings = getCloudSettings()) {
  return Boolean(settings.url && settings.anonKey && settings.accessToken);
}

export function hasCloudConfig(settings = getCloudSettings()) {
  return Boolean(settings.url && settings.anonKey);
}

export function hasBundledCloudConfig() {
  return Boolean(DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_ANON_KEY);
}

export async function signInToCloud({ url, anonKey, email, password }) {
  const current = getCloudSettings();
  const baseUrl = normalizeUrl(url || current.url || DEFAULT_SUPABASE_URL);
  const key = String(anonKey || current.anonKey || DEFAULT_SUPABASE_ANON_KEY).trim();
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders({ url: baseUrl, anonKey: key }, false),
    body: JSON.stringify({
      email: String(email || "").trim(),
      password: String(password || "")
    })
  });
  const data = await parseJsonResponse(response, "Supabase 로그인에 실패했습니다.");
  return saveCloudSettings({
    url: baseUrl,
    anonKey: key,
    email,
    accessToken: data.access_token || "",
    refreshToken: data.refresh_token || "",
    userId: data.user?.id || ""
  });
}

export async function fetchCloudClips(settings = getCloudSettings()) {
  ensureSession(settings);
  const response = await fetchWithAutoRefresh(
    settings,
    `${settings.url}/rest/v1/${TABLE_NAME}?select=*&order=created_at.desc`,
    (session) => ({ headers: authHeaders(session) })
  );
  const rows = await parseJsonResponse(response, "Supabase에서 데이터를 불러오지 못했습니다.");
  return rows.map(rowToClip);
}

export async function upsertCloudClips(clips, settings = getCloudSettings()) {
  ensureSession(settings);
  const rows = clips.map(clipToRow);
  if (!rows.length) return [];
  const response = await fetchWithAutoRefresh(
    settings,
    `${settings.url}/rest/v1/${TABLE_NAME}?on_conflict=id`,
    (session) => ({
      method: "POST",
      headers: {
        ...authHeaders(session),
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(rows)
    })
  );
  const data = await parseJsonResponse(response, "Supabase에 저장하지 못했습니다.");
  return data.map(rowToClip);
}

export async function updateCloudClip(clip, settings = getCloudSettings()) {
  ensureSession(settings);
  const response = await fetchWithAutoRefresh(
    settings,
    `${settings.url}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(clip.id)}`,
    (session) => ({
      method: "PATCH",
      headers: {
        ...authHeaders(session),
        Prefer: "return=representation"
      },
      body: JSON.stringify(clipToRow(clip))
    })
  );
  const rows = await parseJsonResponse(response, "Supabase 항목을 수정하지 못했습니다.");
  return rows[0] ? rowToClip(rows[0]) : clip;
}

export async function deleteCloudClip(id, settings = getCloudSettings()) {
  ensureSession(settings);
  const response = await fetchWithAutoRefresh(
    settings,
    `${settings.url}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(id)}`,
    (session) => ({
      method: "DELETE",
      headers: authHeaders(session)
    })
  );
  if (!response.ok) await parseJsonResponse(response, "Supabase 항목을 삭제하지 못했습니다.");
}

export async function uploadCloudImage(file, settings = getCloudSettings()) {
  ensureSession(settings);
  const extension = filenameExtension(file.name) || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const response = await fetchWithAutoRefresh(
    settings,
    `${settings.url}/storage/v1/object/${IMAGE_BUCKET}/${path}`,
    (session) => ({
      method: "POST",
      headers: {
        apikey: session.anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true"
      },
      body: file
    })
  );
  await parseJsonResponse(response, "Supabase Storage에 이미지를 올리지 못했습니다.");
  return {
    imagePath: path,
    imageUrl: `${settings.url}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`
  };
}

async function fetchWithAutoRefresh(settings, url, buildOptions) {
  ensureSession(settings);
  let response = await fetch(url, buildOptions(settings));
  if (response.status !== 401) return response;
  if (!settings.refreshToken) {
    throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
  }
  const refreshed = await refreshCloudSession(settings);
  return fetch(url, buildOptions(refreshed));
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
    throw new Error("Supabase URL, anon key, 로그인 정보가 필요합니다.");
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
    const message = data?.message || data?.error_description || data?.error || fallbackMessage;
    throw new Error(message);
  }
  return data || [];
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
    tags: tagsToArray(clip.tags),
    status: clip.status || "새로 수집",
    favorite: Boolean(clip.favorite),
    review_count: Number(clip.reviewCount || 0),
    last_reviewed: clip.lastReviewed || null,
    updated_at: new Date().toISOString()
  };
}

function rowToClip(row) {
  return {
    id: row.id || crypto.randomUUID(),
    createdAt: row.created_at || "",
    contentType: row.content_type || "링크",
    sentence: row.sentence || "",
    reason: row.reason || "",
    connection: row.connection || "",
    useFor: row.use_for || "정리필요",
    action: row.action || "정리필요",
    source: row.source || "",
    siteName: row.site_name || "",
    iconUrl: row.icon_url || "",
    imagePath: row.image_path || "",
    imageUrl: row.image_url || "",
    title: row.title || "",
    tags: Array.isArray(row.tags) ? row.tags.join(" ") : row.tags || "",
    status: row.status || "새로 수집",
    favorite: Boolean(row.favorite),
    reviewCount: Number(row.review_count || 0),
    lastReviewed: row.last_reviewed || ""
  };
}

function tagsToArray(tags) {
  if (Array.isArray(tags)) return tags;
  return String(tags || "")
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function filenameExtension(name = "") {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function normalizeUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function withDefaultConfig(settings = {}) {
  return {
    ...settings,
    url: normalizeUrl(settings.url || DEFAULT_SUPABASE_URL),
    anonKey: String(settings.anonKey || DEFAULT_SUPABASE_ANON_KEY).trim()
  };
}
