import {
  clearCloudSession,
  fetchCloudClips,
  getCloudSettings,
  hasCloudSession,
  saveCloudSettings,
  signInToCloud,
  updateCloudClip
} from "../shared/supabase-store.js";

const state = {
  images: [],
  rows: [],
  visible: [],
  urls: new Map(),
  cloudReady: false,
  activeItem: null,
  viewMode: "all",
  mediaFilter: "all"
};

const PIN_BLOCK_START = "[줍줍사진 핀]";
const DISPLAY_LIMIT = 15;

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
  cloudAdvanced: document.querySelector(".cloud-advanced"),
  imageInput: document.querySelector("#imageInput"),
  csvInput: document.querySelector("#csvInput"),
  search: document.querySelector("#search"),
  showAll: document.querySelector("#showAll"),
  showImages: document.querySelector("#showImages"),
  showVideos: document.querySelector("#showVideos"),
  showInbox: document.querySelector("#showInbox"),
  showReviewed: document.querySelector("#showReviewed"),
  status: document.querySelector("#status"),
  imageCount: document.querySelector("#imageCount"),
  csvCount: document.querySelector("#csvCount"),
  matchedCount: document.querySelector("#matchedCount"),
  gallery: document.querySelector("#gallery"),
  detailDialog: document.querySelector("#detailDialog"),
  detailImage: document.querySelector("#detailImage"),
  detailVideo: document.querySelector("#detailVideo"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  detailReason: document.querySelector("#detailReason"),
  detailLinks: document.querySelector("#detailLinks"),
  markReviewed: document.querySelector("#markReviewed"),
  pinLayer: document.querySelector("#pinLayer"),
  pinList: document.querySelector("#pinList"),
  pinEditor: document.querySelector("#pinEditor")
};

el.imageInput.addEventListener("change", loadImages);
el.csvInput.addEventListener("change", loadCsv);
el.search.addEventListener("input", applyFilters);
el.showAll.addEventListener("click", showAll);
el.showImages.addEventListener("click", showImages);
el.showVideos.addEventListener("click", showVideos);
el.showInbox.addEventListener("click", showInbox);
el.showReviewed.addEventListener("click", showReviewed);
el.gallery.addEventListener("click", openCard);
el.cloudSave.addEventListener("click", saveCloudConfig);
el.cloudLogin.addEventListener("click", loginCloud);
el.cloudLogout.addEventListener("click", logoutCloud);
el.cloudPull.addEventListener("click", pullCloud);
el.markReviewed.addEventListener("click", markActiveReviewed);
el.pinLayer.addEventListener("click", addPinFromClick);
el.pinList.addEventListener("click", handlePinAction);
document.querySelectorAll("[data-open-panel]").forEach((button) => {
  button.addEventListener("click", () => toggleFloatingPanel(button.dataset.openPanel));
});

restoreCloudConfig();
render();
autoPullCloud();

function restoreCloudConfig() {
  const settings = getCloudSettings();
  el.cloudUrl.value = settings.url || "";
  el.cloudAnonKey.value = settings.anonKey || "";
  el.cloudEmail.value = settings.email || "";
  el.cloudPassword.value = settings.password || "";
  if (el.cloudAdvanced) el.cloudAdvanced.open = !settings.anonKey;
  state.cloudReady = hasCloudSession(settings);
  setCloudStatus(state.cloudReady ? "Supabase에 로그인되어 있습니다. 미디어 DB를 불러올 수 있습니다." : "이메일/비밀번호로 로그인해 주세요. 처음 연결이라면 고급 설정에 anon key가 필요합니다.");
}

function saveCloudConfig() {
  saveCloudSettings({
    url: el.cloudUrl.value,
    anonKey: el.cloudAnonKey.value,
    email: el.cloudEmail.value,
    password: el.cloudPassword.value
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
    state.cloudReady = true;
    setCloudStatus("Supabase에 로그인했습니다. 미디어를 불러옵니다.");
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
  if (!options.quiet) setCloudStatus("Supabase에서 미디어를 불러오는 중...");
  try {
    const rows = (await fetchCloudClips())
      .filter(isMediaClip);
    state.rows = mergeRows(state.rows, rows);
    matchRows();
    applyFilters();
    state.cloudReady = true;
    setCloudStatus(`Supabase에서 미디어 기록 ${rows.length}개를 불러왔습니다.`);
  } catch (error) {
    setCloudStatus(error.message || "Supabase에서 미디어를 불러오지 못했습니다.");
  }
}

function loadImages() {
  revokeUrls();
  state.images = [];
  state.urls = new Map();

  for (const file of el.imageInput.files || []) {
    if (file.type && !file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
    const url = URL.createObjectURL(file);
    const path = file.webkitRelativePath || file.name;
    const image = {
      id: path,
      file,
      name: file.name,
      path,
      url,
      mediaKind: file.type?.startsWith("video/") ? "video" : "image",
      row: null
    };
    state.images.push(image);
    state.urls.set(path, url);
    state.urls.set(file.name, url);
  }

  matchRows();
  applyFilters();
  el.imageInput.value = "";
  notify(`미디어 ${state.images.length}개를 열었습니다.`);
}

async function loadCsv() {
  const file = el.csvInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    state.rows = parseCsv(text)
      .map(rowToItem)
      .filter(isMediaClip);
    matchRows();
    applyFilters();
    notify(`${file.name}에서 미디어 기록 ${state.rows.length}개를 읽었습니다.`);
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
    connection: image.row?.connection || "",
    tags: image.row?.tags || "",
    siteName: image.row?.siteName || "",
    contentType: image.row?.contentType || (image.mediaKind === "video" ? "동영상" : "이미지"),
    mediaKind: image.mediaKind,
    status: image.row?.status || "새로 수집",
    reviewCount: image.row?.reviewCount || 0,
    lastReviewed: image.row?.lastReviewed || ""
  }));

  const remoteOnly = state.rows
    .filter((row) => hasDisplayableMedia(row) && !state.images.some((image) => image.row === row))
    .map((row) => ({
      id: row.id || row.imageUrl || row.source,
      name: filenameFromUrl(row.imageUrl || row.source || row.title || "media"),
      path: row.imagePath || row.imageUrl || row.source,
      url: mediaUrl(row),
      row,
      sourceUrl: originalMediaUrl(row),
      contentType: row.contentType,
      mediaKind: mediaKind(row),
      title: row.title || row.siteName || "",
      reason: row.reason || "",
      connection: row.connection || "",
      tags: row.tags || "",
      siteName: row.siteName || "",
      status: row.status || "새로 수집",
      reviewCount: row.reviewCount || 0,
      lastReviewed: row.lastReviewed || ""
    }));

  state.visible = [...folderImages, ...remoteOnly].filter((item) => {
    if (state.viewMode === "inbox" && isReviewedItem(item)) return false;
    if (state.viewMode === "reviewed" && !isReviewedItem(item)) return false;
    if (state.mediaFilter === "image" && isVideoItem(item)) return false;
    if (state.mediaFilter === "video" && !isVideoItem(item)) return false;
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
  state.viewMode = "all";
  state.mediaFilter = "all";
  applyFilters();
  notify(`미디어 ${state.visible.length}개를 보여줍니다.`);
}

function showImages() {
  state.mediaFilter = "image";
  applyFilters();
  notify(`이미지 ${state.visible.length}개를 보여줍니다.`);
}

function showVideos() {
  state.mediaFilter = "video";
  applyFilters();
  notify(`동영상 ${state.visible.length}개를 보여줍니다.`);
}

function showInbox() {
  state.viewMode = "inbox";
  applyFilters();
  notify(`아직 확인하지 않은 인박스 미디어 ${state.visible.length}개를 보여줍니다.`);
}

function showReviewed() {
  state.viewMode = "reviewed";
  applyFilters();
  notify(`확인하거나 편집한 미디어 ${state.visible.length}개를 보여줍니다.`);
}

function render() {
  const matched = state.images.filter((image) => image.row).length;
  const displayed = state.visible.slice(0, DISPLAY_LIMIT);
  el.imageCount.textContent = String(state.images.length);
  el.csvCount.textContent = String(state.rows.length);
  el.matchedCount.textContent = String(matched);

  el.gallery.replaceChildren();

  if (!state.visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "미디어 폴더를 열거나 DB를 불러오면 이미지와 동영상이 여기에 나타납니다.";
    el.gallery.append(empty);
    return;
  }

  el.gallery.append(...displayed.map(photoCard));
  if (state.visible.length > DISPLAY_LIMIT) {
    const more = document.createElement("div");
    more.className = "empty";
    more.textContent = `최근 ${DISPLAY_LIMIT}개만 표시 중입니다. 검색이나 필터로 더 좁혀 보세요.`;
    el.gallery.append(more);
  }
}

function toggleFloatingPanel(name) {
  const panel = document.querySelector(`[data-floating-panel="${name}"]`);
  if (!panel) return;
  const shouldOpen = !panel.classList.contains("is-open");
  document.querySelectorAll("[data-floating-panel]").forEach((item) => item.classList.remove("is-open"));
  if (shouldOpen) panel.classList.add("is-open");
}

function photoCard(item) {
  const card = document.createElement("article");
  card.className = "photo-card";
  if (isVideoItem(item)) card.classList.add("is-video");
  if (isReviewedItem(item)) card.classList.add("is-reviewed");
  else card.classList.add("is-inbox");
  card.dataset.id = item.id;

  const media = cardMediaView(item);

  const footer = document.createElement("footer");
  const copy = document.createElement("div");
  copy.append(
    textEl("span", "", item.siteName || item.tags || (isVideoItem(item) ? "video archive" : "image archive")),
    textEl("span", isReviewedItem(item) ? "state-chip is-reviewed" : "state-chip", isReviewedItem(item) ? "확인함" : "인박스")
  );
  footer.append(copy, textEl("small", "", item.tags || (isVideoItem(item) ? "video" : "image")));
  card.append(media, footer);
  return card;
}

function cardMediaView(item) {
  if (!isVideoItem(item)) {
    if (!item.url) {
      const fallback = document.createElement("div");
      fallback.className = "media-preview";
      fallback.append(textEl("span", "", "IMAGE"));
      return fallback;
    }
    const image = document.createElement("img");
    image.src = item.url;
    image.alt = displayTitle(item);
    return image;
  }

  const preview = document.createElement("div");
  preview.className = "media-preview video-preview";
  const thumbnail = videoThumbnail(item.sourceUrl || item.url);
  if (thumbnail) {
    const image = document.createElement("img");
    image.src = thumbnail;
    image.alt = "동영상 썸네일";
    preview.append(image);
  } else if (isPlayableVideoItem(item)) {
    const video = document.createElement("video");
    video.src = item.url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    preview.append(video);
  } else {
    preview.append(textEl("span", "", "VIDEO"));
  }

  const badge = textEl("strong", "video-badge", "▶");
  preview.append(badge);
  return preview;
}

function renderDetailMedia(item, video) {
  el.detailVideo.replaceChildren();
  el.detailVideo.hidden = !video;
  el.detailImage.hidden = video;

  if (!video) {
    el.detailImage.src = item.url;
    el.detailImage.alt = displayTitle(item);
    return;
  }

  el.detailImage.removeAttribute("src");
  const source = item.sourceUrl || item.url;
  const embed = videoEmbedUrl(source);
  if (embed) {
    const frame = document.createElement("iframe");
    frame.src = embed;
    frame.title = "줍줍 동영상";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    el.detailVideo.append(frame);
    return;
  }

  if (isPlayableVideoItem(item) || isDirectVideoUrl(item.url || source)) {
    const player = document.createElement("video");
    player.src = item.url || source;
    player.controls = true;
    player.playsInline = true;
    el.detailVideo.append(player);
    return;
  }

  const fallback = document.createElement("div");
  fallback.className = "video-fallback";
  fallback.append(
    textEl("strong", "", "VIDEO"),
    textEl("span", "", "임베드할 수 없는 동영상 링크입니다. 출처 열기로 확인해 주세요.")
  );
  el.detailVideo.append(fallback);
}

function openCard(event) {
  const card = event.target.closest(".photo-card");
  if (!card) return;
  const item = state.visible.find((entry) => entry.id === card.dataset.id);
  if (!item) return;

  const video = isVideoItem(item);
  renderDetailMedia(item, video);
  el.detailTitle.textContent = video ? "동영상 메모" : "이미지 메모";
  el.detailMeta.textContent = [item.siteName, item.tags].filter(Boolean).join(" · ");
  el.detailReason.textContent = item.reason || "아직 메모가 없습니다.";
  el.detailLinks.replaceChildren();
  state.activeItem = item;

  if (item.sourceUrl) el.detailLinks.append(anchorView("출처 열기", item.sourceUrl));
  if (item.row?.imageUrl && !video) el.detailLinks.append(anchorView("이미지 원본", item.row.imageUrl));
  if (video) {
    el.pinLayer.hidden = true;
    el.pinEditor.hidden = true;
    el.pinLayer.replaceChildren();
    el.pinList.replaceChildren();
  } else {
    el.pinLayer.hidden = false;
    el.pinEditor.hidden = false;
    renderPins(item);
  }
  el.detailDialog.showModal();
}

function rowToItem(row) {
  return {
    id: row.id || "",
    createdAt: row.createdAt || row["수집 일시"] || "",
    contentType: normalizeContentType(row.contentType || row["유형"], row),
    sentence: row.sentence || row["주운 글"] || row["문장"] || "",
    reason: row.reason || row["수집한 이유"] || "",
    connection: row.connection || row["연결/확장"] || "",
    useFor: row.useFor || row["활용처"] || "정리필요",
    action: row.action || row["다음 액션"] || "정리필요",
    source: row.source || row["출처"] || "",
    siteName: row.siteName || row["사이트명"] || "",
    iconUrl: row.iconUrl || row["아이콘 URL"] || "",
    imagePath: row.imagePath || row["이미지 경로"] || "",
    imageUrl: row.imageUrl || row["이미지 URL"] || "",
    title: row.title || row["제목"] || "",
    tags: row.tags || row["태그"] || "",
    status: row.status || row["상태"] || "",
    favorite: Boolean(row.favorite || row["별표"]),
    reviewCount: Number(row.reviewCount || row["확인 횟수"] || 0),
    lastReviewed: row.lastReviewed || row["마지막 확인"] || ""
  };
}

async function addPinFromClick(event) {
  const item = state.activeItem;
  if (!item || isVideoItem(item)) return;

  const bounds = el.pinLayer.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const note = prompt("이 부분이 눈에 들어온 이유나 설명을 적어주세요.");
  if (note === null) return;
  const cleanNote = note.trim();
  if (!cleanNote) {
    notify("핀 설명이 비어 있어 추가하지 않았습니다.");
    return;
  }

  const row = writableRowForItem(item);
  const pins = parsePins(row.connection);
  pins.push({
    id: crypto.randomUUID(),
    x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
    y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    note: cleanNote,
    createdAt: new Date().toISOString()
  });

  await persistPins(item, row, pins, "핀을 추가했습니다.");
}

async function handlePinAction(event) {
  const button = event.target.closest("[data-pin-action]");
  if (!button || !state.activeItem) return;

  const row = writableRowForItem(state.activeItem);
  const pins = parsePins(row.connection);
  const pin = pins.find((entry) => entry.id === button.dataset.pinId);
  if (!pin) return;

  if (button.dataset.pinAction === "delete") {
    const nextPins = pins.filter((entry) => entry.id !== pin.id);
    await persistPins(state.activeItem, row, nextPins, "핀을 삭제했습니다.");
    return;
  }

  if (button.dataset.pinAction === "edit") {
    const nextNote = prompt("핀 설명을 수정하세요.", pin.note || "");
    if (nextNote === null) return;
    pin.note = nextNote.trim();
    await persistPins(state.activeItem, row, pins, "핀 설명을 수정했습니다.");
  }
}

async function persistPins(item, row, pins, doneMessage) {
  writePins(row, pins);
  markRowReviewed(row);
  item.connection = row.connection;
  syncItemFromRow(item, row);
  renderPins(item);
  applyFilters();

  if (!row.id) {
    notify(`${doneMessage} DB 항목이 없는 로컬 이미지는 서버 저장 전까지 이 화면에서만 유지됩니다.`);
    return;
  }

  if (!hasCloudSession()) {
    notify(`${doneMessage} Supabase 로그인 후 DB에 저장할 수 있습니다.`);
    return;
  }

  try {
    const updated = await updateCloudClip(row);
    const nextRow = rowToItem(updated);
    Object.assign(row, nextRow);
    item.row = row;
    item.connection = row.connection;
    replaceStoredRow(row);
    renderPins(item);
    applyFilters();
    notify(`${doneMessage} Supabase에 저장했습니다.`);
  } catch (error) {
    notify(error.message || "핀을 Supabase에 저장하지 못했습니다.");
  }
}

function renderPins(item) {
  const pins = parsePins(item.row?.connection || item.connection || "");
  el.pinLayer.replaceChildren();
  el.pinList.replaceChildren();

  if (!pins.length) {
    const empty = document.createElement("li");
    empty.className = "pin-empty";
    empty.textContent = "아직 핀이 없습니다.";
    el.pinList.append(empty);
    return;
  }

  pins.forEach((pin, index) => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "pin-marker";
    marker.style.left = `${pin.x * 100}%`;
    marker.style.top = `${pin.y * 100}%`;
    marker.textContent = String(index + 1);
    marker.title = pin.note || `핀 ${index + 1}`;
    marker.addEventListener("click", (event) => event.stopPropagation());
    el.pinLayer.append(marker);

    const listItem = document.createElement("li");
    const body = document.createElement("div");
    body.append(
      textEl("strong", "", `PIN ${index + 1}`),
      textEl("p", "", pin.note || "설명 없음")
    );

    const actions = document.createElement("div");
    actions.className = "pin-actions";
    actions.append(
      pinActionButton("edit", pin.id, "수정"),
      pinActionButton("delete", pin.id, "삭제")
    );

    listItem.append(body, actions);
    el.pinList.append(listItem);
  });
}

function writableRowForItem(item) {
  if (item.row) return item.row;
  item.row = {
    id: "",
    createdAt: new Date().toISOString(),
    contentType: item.contentType || (isVideoItem(item) ? "동영상" : "이미지"),
    sentence: "",
    reason: item.reason || "",
    connection: item.connection || "",
    useFor: "정리필요",
    action: "정리필요",
    source: item.sourceUrl || "",
    siteName: item.siteName || "",
    iconUrl: "",
    imagePath: item.path || "",
    imageUrl: "",
    title: item.title || item.name || "이미지",
    tags: item.tags || "#이미지",
    status: item.status || "새로 수집",
    favorite: false,
    reviewCount: Number(item.reviewCount || 0),
    lastReviewed: item.lastReviewed || ""
  };
  return item.row;
}

function parsePins(connection) {
  const text = String(connection || "");
  const markerIndex = text.indexOf(PIN_BLOCK_START);
  if (markerIndex < 0) return [];

  const json = text.slice(markerIndex + PIN_BLOCK_START.length).trim();
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((pin) => ({
        id: pin.id || crypto.randomUUID(),
        x: clamp(Number(pin.x), 0, 1),
        y: clamp(Number(pin.y), 0, 1),
        note: String(pin.note || ""),
        createdAt: pin.createdAt || ""
      }))
      .filter((pin) => Number.isFinite(pin.x) && Number.isFinite(pin.y));
  } catch {
    return [];
  }
}

function writePins(row, pins) {
  const existing = String(row.connection || "");
  const plainText = existing.split(PIN_BLOCK_START)[0].trim();
  const block = `${PIN_BLOCK_START}\n${JSON.stringify(pins)}`;
  row.connection = [plainText, pins.length ? block : ""].filter(Boolean).join("\n\n");
}

function pinActionButton(action, pinId, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pin-action";
  button.dataset.pinAction = action;
  button.dataset.pinId = pinId;
  button.textContent = label;
  return button;
}

function replaceStoredRow(nextRow) {
  const index = state.rows.findIndex((row) => row.id && row.id === nextRow.id);
  if (index >= 0) state.rows[index] = nextRow;
}

async function markActiveReviewed() {
  const item = state.activeItem;
  if (!item) return;
  const row = writableRowForItem(item);
  markRowReviewed(row);
  syncItemFromRow(item, row);

  if (!row.id) {
    applyFilters();
    notify("확인한 미디어로 표시했습니다. DB 항목이 없는 로컬 파일은 이 화면에서만 유지됩니다.");
    return;
  }

  if (!hasCloudSession()) {
    applyFilters();
    notify("확인한 미디어로 표시했습니다. Supabase 로그인 후 DB에 저장할 수 있습니다.");
    return;
  }

  try {
    const updated = await updateCloudClip(row);
    const nextRow = rowToItem(updated);
    Object.assign(row, nextRow);
    syncItemFromRow(item, row);
    replaceStoredRow(row);
    applyFilters();
    notify("확인한 미디어로 표시하고 Supabase에 저장했습니다.");
  } catch (error) {
    notify(error.message || "확인 상태를 Supabase에 저장하지 못했습니다.");
  }
}

function isReviewedItem(item) {
  const status = item.row?.status || item.status || "새로 수집";
  const reviewCount = Number(item.row?.reviewCount || item.reviewCount || 0);
  const lastReviewed = item.row?.lastReviewed || item.lastReviewed || "";
  return status !== "새로 수집" || reviewCount > 0 || Boolean(lastReviewed);
}

function markRowReviewed(row) {
  if (row.status === "새로 수집" || !row.status) row.status = "확인함";
  row.reviewCount = Number(row.reviewCount || 0) + 1;
  row.lastReviewed = new Date().toISOString();
}

function syncItemFromRow(item, row) {
  item.status = row.status || "새로 수집";
  item.reviewCount = row.reviewCount || 0;
  item.lastReviewed = row.lastReviewed || "";
  item.connection = row.connection || item.connection || "";
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeContentType(value, row) {
  const type = String(value || "").trim();
  if (type) return type;
  if (isVideoUrl(row.source || row["출처"] || row.imageUrl || row["이미지 URL"])) return "동영상";
  if (row.imagePath || row.imageUrl || row["이미지 경로"] || row["이미지 URL"]) return "이미지";
  return "자료";
}

function isMediaClip(clip) {
  return clip.contentType === "이미지"
    || clip.contentType === "동영상"
    || Boolean(clip.imagePath)
    || Boolean(clip.imageUrl)
    || isVideoUrl(clip.source);
}

function hasDisplayableMedia(row) {
  return Boolean(row.imageUrl || row.source || row.contentType === "동영상");
}

function isVideoItem(item) {
  return item.mediaKind === "video"
    || item.contentType === "동영상"
    || isVideoUrl(item.sourceUrl || item.url);
}

function isPlayableVideoItem(item) {
  return item.mediaKind === "video" && Boolean(item.url);
}

function mediaKind(row) {
  return row.contentType === "동영상" || isVideoUrl(row.source || row.imageUrl) ? "video" : "image";
}

function mediaUrl(row) {
  if (row.contentType === "동영상") {
    return videoThumbnail(originalMediaUrl(row)) || row.imageUrl || row.source || "";
  }
  return row.imageUrl || row.source || "";
}

function originalMediaUrl(row) {
  if (row.contentType === "동영상") {
    if (isVideoUrl(row.source)) return row.source;
    if (isVideoUrl(row.imageUrl)) return row.imageUrl;
  }
  return row.source || row.imageUrl || "";
}

function isVideoUrl(url) {
  return Boolean(youtubeId(url) || isDirectVideoUrl(url));
}

function isDirectVideoUrl(url) {
  try {
    return /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(new URL(url).pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(String(url || ""));
  }
}

function youtubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

function videoThumbnail(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function videoEmbedUrl(url) {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : "";
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
  return item.siteName || "이미지";
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
