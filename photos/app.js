const state = {
  images: [],
  rows: [],
  visible: [],
  urls: new Map()
};

const el = {
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

render();

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
    createdAt: row["수집 일시"] || "",
    contentType: normalizeContentType(row["유형"], row),
    sentence: row["주운 글"] || row["문장"] || "",
    reason: row["수집한 이유"] || "",
    source: row["출처"] || "",
    siteName: row["사이트명"] || "",
    iconUrl: row["아이콘 URL"] || "",
    imagePath: row["이미지 경로"] || "",
    imageUrl: row["이미지 URL"] || "",
    title: row["제목"] || "",
    tags: row["태그"] || "",
    status: row["상태"] || ""
  };
}

function normalizeContentType(value, row) {
  const type = String(value || "").trim();
  if (type) return type;
  if (row["이미지 경로"] || row["이미지 URL"]) return "이미지";
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

function revokeUrls() {
  for (const url of state.urls.values()) {
    URL.revokeObjectURL(url);
  }
}
