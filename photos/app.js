import {
  clearCloudSession,
  fetchCloudClips,
  getCloudSettings,
  hasCloudSession,
  saveCloudSettings,
  signInToCloud
} from "../shared/supabase-store.js";

const state = {
  images: [],
  rows: [],
  visible: [],
  urls: new Map(),
  cloudReady: false
};

const el = {
  cloudUrl: document.querySelector("#cloudUrl"),
  cloudAnonKey: document.querySelector("#cloudAnonKey"),
  cloudEmail: document.querySelector("#cloudEmail"),
  cloudPassword: document.querySelector("#cloudPassword"),
  cloudSave: document.querySelector("#cloudSave"),
  cloudLogin: document.querySelector("#cloudLogin"),
  cloudLogout: document.querySelector("#cloudLogout"),
  cloudPull: document.querySelector("#cloudPull"),
  cloudStatus: document.querySelector("#cloudStatus"),
  imageInput: document.querySelector("#imageInput"),
  csvInput: document.querySelector("#csvInput"),
  search: document.querySelector("#search"),
  showAll: document.querySelector("#showAll"),
  status: document.querySelector("#status"),
  imageCount: document.querySelector("#imageCount"),
  csvCount: document.querySelector("#csvCount"),
  matchedCount: document.querySelector("#matchedCount"),
  feature: document.querySelector("#feature"),
  gallery: document.querySelector("#gallery"),
  detailDialog: document.querySelector("#detailDialog"),
  detailImage: document.querySelector("#detailImage"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  detailReason: document.querySelector("#detailReason"),
  detailLinks: document.querySelector("#detailLinks")
};

el.imageInput.addEventListener("change", loadImages);
el.csvInput.addEventListener("change", loadCsv);
el.search.addEventListener("input", applyFilters);
el.showAll.addEventListener("click", showAll);
el.gallery.addEventListener("click", openCard);
el.cloudSave.addEventListener("click", saveCloudConfig);
el.cloudLogin.addEventListener("click", loginCloud);
el.cloudLogout.addEventListener("click", logoutCloud);
el.cloudPull.addEventListener("click", pullCloud);

restoreCloudConfig();
render();
autoPullCloud();

function restoreCloudConfig() {
  const settings = getCloudSettings();
  el.cloudUrl.value = settings.url || "";
  el.cloudAnonKey.value = settings.anonKey || "";
  el.cloudEmail.value = settings.email || "";
  state.cloudReady = hasCloudSession(settings);
  setCloudStatus(state.cloudReady ? "Supabase에 로그인되어 있습니다. 이미지 DB를 불러올 수 있습니다." : "Supabase를 연결하면 Storage URL이 있는 이미지를 바로 볼 수 있습니다.");
}

function saveCloudConfig() {
  saveCloudSettings({
    url: el.cloudUrl.value,
    anonKey: el.cloudAnonKey.value,
    email: el.cloudEmail.value
  });
  setCloudStatus("Supabase 설정을 저장했습니다. 이메일/비밀번호로 로그인해 주세요.");
}

async function loginCloud() {
  setCloudStatus("Supabase 로그인 중...");
  try {
    await signInToCloud({
      url: el.cloudUrl.value,
      anonKey: el.cloudAnonKey.value,
      email: el.cloudEmail.value,
      password: el.cloudPassword.value
    });
    el.cloudPassword.value = "";
    state.cloudReady = true;
    setCloudStatus("Supabase에 로그인했습니다. 이미지를 불러옵니다.");
    await pullCloud();
  } catch (error) {
    setCloudStatus(error.message || "Supabase에 로그인하지 못했습니다.");
  }
}

function logoutCloud() {
  clearCloudSession();
  state.cloudReady = false;
  setCloudStatus("이 브라우저에서 Supabase 로그아웃했습니다.");
}

async function autoPullCloud() {
  if (!hasCloudSession()) return;
  try {
    await pullCloud({ quiet: true });
  } catch (error) {
    setCloudStatus(error.message || "Supabase 이미지를 자동으로 불러오지 못했습니다.");
  }
}

async function pullCloud(options = {}) {
  if (!hasCloudSession()) {
    setCloudStatus("먼저 Supabase에 로그인해 주세요.");
    return;
  }
  if (!options.quiet) setCloudStatus("Supabase에서 이미지를 불러오는 중...");
  try {
    const rows = (await fetchCloudClips())
      .filter((clip) => clip.contentType === "이미지" || clip.imagePath || clip.imageUrl);
    state.rows = mergeRows(state.rows, rows);
    matchRows();
    applyFilters();
    state.cloudReady = true;
    setCloudStatus(`Supabase에서 이미지 기록 ${rows.length}개를 불러왔습니다.`);
  } catch (error) {
    setCloudStatus(error.message || "Supabase에서 이미지를 불러오지 못했습니다.");
  }
}

function loadImages() {
  revokeUrls();
  state.images = [];
  state.urls = new Map();

  for (const file of el.imageInput.files || []) {
    if (file.type && !file.type.startsWith("image/")) continue;
    const url = URL.createObjectURL(file);
    const path = file.webkitRelativePath || file.name;
    const image = {
      id: path,
      file,
      name: file.name,
      path,
      url,
      row: null
    };
    state.images.push(image);
    state.urls.set(path, url);
    state.urls.set(file.name, url);
  }

  matchRows();
  applyFilters();
  el.imageInput.value = "";
  notify(`이미지 ${state.images.length}개를 열었습니다.`);
}

async function loadCsv() {
  const file = el.csvInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    state.rows = parseCsv(text)
      .map(rowToItem)
      .filter((item) => item.contentType === "이미지" || item.imagePath || item.imageUrl);
    matchRows();
    applyFilters();
    notify(`${file.name}에서 이미지 기록 ${state.rows.length}개를 읽었습니다.`);
  } catch (error) {
    notify(error.message || "CSV를 읽지 못했습니다.");
  } finally {
    el.csvInput.value = "";
  }
}

function matchRows() {
  const rowByKey = new Map();
  for (const row of state.rows) {
    for (const key of imageKeys(row)) {
      if (key && !rowByKey.has(key)) rowByKey.set(key, row);
    }
  }

  for (const image of state.images) {
    image.row = rowByKey.get(image.path) || rowByKey.get(image.name) || null;
  }
}

function applyFilters() {
  const query = el.search.value.trim().toLowerCase();
  const folderImages = state.images.map((image) => ({
    ...image,
    sourceUrl: image.row?.source || image.row?.imageUrl || "",
    title: image.row?.title || "",
    reason: image.row?.reason || "",
    tags: image.row?.tags || "",
    siteName: image.row?.siteName || ""
  }));

  const remoteOnly = state.rows
    .filter((row) => row.imageUrl && !state.images.some((image) => image.row === row))
    .map((row) => ({
      id: row.id || row.imageUrl,
      name: filenameFromUrl(row.imageUrl),
      path: row.imagePath || row.imageUrl,
      url: row.imageUrl,
      row,
      sourceUrl: row.source || row.imageUrl,
      title: row.title || row.siteName || "",
      reason: row.reason || "",
      tags: row.tags || "",
      siteName: row.siteName || ""
    }));

  state.visible = [...folderImages, ...remoteOnly].filter((item) => {
    if (!query) return true;
    return [
      item.name,
      item.path,
      item.title,
      item.reason,
      item.tags,
      item.siteName,
      item.sourceUrl
    ].join(" ").toLowerCase().includes(query);
  });
  render();
}

function showAll() {
  el.search.value = "";
  applyFilters();
  notify(`이미지 ${state.visible.length}개를 보여줍니다.`);
}

function render() {
  const matched = state.images.filter((image) => image.row).length;
  el.imageCount.textContent = String(state.images.length);
  el.csvCount.textContent = String(state.rows.length);
  el.matchedCount.textContent = String(matched);

  renderFeature();
  el.gallery.replaceChildren();

  if (!state.visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "images 폴더를 열면 저장한 사진들이 여기에 나타납니다.";
    el.gallery.append(empty);
    return;
  }

  el.gallery.append(...state.visible.map(photoCard));
}

function renderFeature() {
  el.feature.replaceChildren();
  const item = state.visible[0];
  el.feature.hidden = !item;
  if (!item) return;

  const image = document.createElement("img");
  image.src = item.url;
  image.alt = displayTitle(item);

  const copy = document.createElement("div");
  copy.className = "feature-copy";
  copy.append(
    textEl("p", "eyebrow", "selected from archive"),
    textEl("h2", "", displayTitle(item)),
    textEl("p", "", item.reason || item.siteName || item.tags || "이미지 폴더에서 불러온 사진입니다.")
  );

  el.feature.append(image, copy);
}

function photoCard(item) {
  const card = document.createElement("article");
  card.className = "photo-card";
  card.dataset.id = item.id;

  const image = document.createElement("img");
  image.src = item.url;
  image.alt = displayTitle(item);

  const footer = document.createElement("footer");
  const copy = document.createElement("div");
  copy.append(
    textEl("strong", "", displayTitle(item)),
    textEl("span", "", item.siteName || item.tags || "image archive")
  );
  footer.append(copy, textEl("small", "", item.tags || "image"));
  card.append(image, footer);
  return card;
}

function openCard(event) {
  const card = event.target.closest(".photo-card");
  if (!card) return;
  const item = state.visible.find((entry) => entry.id === card.dataset.id);
  if (!item) return;

  el.detailImage.src = item.url;
  el.detailImage.alt = displayTitle(item);
  el.detailTitle.textContent = displayTitle(item);
  el.detailMeta.textContent = [item.siteName, item.tags].filter(Boolean).join(" · ");
  el.detailReason.textContent = item.reason || "아직 메모가 없습니다.";
  el.detailLinks.replaceChildren();

  if (item.sourceUrl) el.detailLinks.append(anchorView("출처 열기", item.sourceUrl));
  if (item.row?.imageUrl) el.detailLinks.append(anchorView("이미지 원본", item.row.imageUrl));
  el.detailDialog.showModal();
}

function rowToItem(row) {
  return {
    id: row.id || "",
    createdAt: row.createdAt || row["수집 일시"] || "",
    contentType: normalizeContentType(row.contentType || row["유형"], row),
    sentence: row.sentence || row["주운 글"] || row["문장"] || "",
    reason: row.reason || row["수집한 이유"] || "",
    source: row.source || row["출처"] || "",
    siteName: row.siteName || row["사이트명"] || "",
    iconUrl: row.iconUrl || row["아이콘 URL"] || "",
    imagePath: row.imagePath || row["이미지 경로"] || "",
    imageUrl: row.imageUrl || row["이미지 URL"] || "",
    title: row.title || row["제목"] || "",
    tags: row.tags || row["태그"] || "",
    status: row.status || row["상태"] || ""
  };
}

function normalizeContentType(value, row) {
  const type = String(value || "").trim();
  if (type) return type;
  if (row.imagePath || row.imageUrl || row["이미지 경로"] || row["이미지 URL"]) return "이미지";
  return "자료";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const clean = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.filter((values) => values.some(Boolean)).map((values) => {
    const output = {};
    headers.forEach((header, index) => {
      output[header] = values[index] || "";
    });
    return output;
  });
}

function imageKeys(row) {
  const keys = [];
  if (row.imagePath) {
    keys.push(row.imagePath);
    keys.push(row.imagePath.split("/").pop());
  }
  if (row.imageUrl) keys.push(filenameFromUrl(row.imageUrl));
  return keys.filter(Boolean);
}

function filenameFromUrl(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || "image");
  } catch {
    return String(url || "image").split("/").pop() || "image";
  }
}

function textEl(tag, className, text) {
  const item = document.createElement(tag);
  item.className = className;
  item.textContent = text || "";
  return item;
}

function displayTitle(item) {
  return item.title || item.siteName || "이미지";
}

function anchorView(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
}

function notify(message) {
  el.status.textContent = message;
}

function setCloudStatus(message) {
  el.cloudStatus.textContent = message;
}

function mergeRows(current, incoming) {
  const output = [...current];
  const seen = new Set(output.map(rowKey));
  for (const row of incoming) {
    const key = rowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(rowToItem(row));
  }
  return output.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function rowKey(row) {
  return [
    row.id,
    row.createdAt,
    row.imagePath,
    row.imageUrl,
    row.source,
    row.title
  ].filter(Boolean).join("|") || crypto.randomUUID();
}

function revokeUrls() {
  for (const url of state.urls.values()) {
    URL.revokeObjectURL(url);
  }
}
