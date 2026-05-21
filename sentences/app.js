const HEADERS = [
  "id",
  "수집 일시",
  "유형",
  "주운 글",
  "수집한 이유",
  "연결/확장",
  "활용처",
  "다음 액션",
  "출처",
  "사이트명",
  "아이콘 URL",
  "이미지 경로",
  "이미지 URL",
  "제목",
  "태그",
  "상태",
  "별표",
  "확인 횟수",
  "마지막 확인"
];

const DB_NAME = "zzupzzup-sentences";
const DB_VERSION = 1;
const DB_STORE = "handles";
const CSV_HANDLE_KEY = "sentenceCsv";

const state = {
  clips: [],
  visible: [],
  csvHandle: null,
  csvFilename: "",
  toastTimer: 0
};

const el = {
  connectCsv: document.querySelector("#connectCsv"),
  csvInput: document.querySelector("#csvInput"),
  saveCsv: document.querySelector("#saveCsv"),
  status: document.querySelector("#status"),
  sentenceInput: document.querySelector("#sentenceInput"),
  reasonInput: document.querySelector("#reasonInput"),
  sourceInput: document.querySelector("#sourceInput"),
  titleInput: document.querySelector("#titleInput"),
  tagsInput: document.querySelector("#tagsInput"),
  addSentence: document.querySelector("#addSentence"),
  search: document.querySelector("#search"),
  showAll: document.querySelector("#showAll"),
  shuffleOne: document.querySelector("#shuffleOne"),
  count: document.querySelector("#count"),
  sentences: document.querySelector("#sentences"),
  toast: document.querySelector("#toast")
};

el.connectCsv.addEventListener("click", connectCsvFile);
el.csvInput.addEventListener("change", loadCsv);
el.saveCsv.addEventListener("click", saveCsv);
el.addSentence.addEventListener("click", addSentence);
el.search.addEventListener("input", applyFilters);
el.showAll.addEventListener("click", showAll);
el.shuffleOne.addEventListener("click", shuffleOne);
el.sentences.addEventListener("click", handleCardClick);

render();
restoreConnectedCsv();

async function connectCsvFile() {
  if (!window.showOpenFilePicker) {
    notify("이 브라우저에서는 CSV 연결을 지원하지 않습니다. Chrome에서 GitHub Pages 주소로 열어 주세요.");
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "CSV",
          accept: { "text/csv": [".csv"] }
        }
      ]
    });
    await storeHandle(CSV_HANDLE_KEY, handle);
    await verifyPermission(handle, true);
    await loadCsvFromHandle(handle, "CSV를 연결했습니다.");
  } catch (error) {
    if (error?.name === "AbortError") return;
    notify(error.message || "CSV 파일을 연결하지 못했습니다.");
  }
}

async function restoreConnectedCsv() {
  if (!window.showOpenFilePicker) return;
  try {
    const handle = await getStoredHandle(CSV_HANDLE_KEY);
    if (!handle) return;
    const allowed = await hasPermission(handle, false);
    if (!allowed) return;
    await loadCsvFromHandle(handle, "이전에 연결한 문장 CSV를 다시 열었습니다.");
  } catch {
    notify("이전에 연결한 CSV를 다시 읽지 못했습니다.");
  }
}

async function loadCsvFromHandle(handle, message) {
  const file = await handle.getFile();
  const text = await file.text();
  state.csvHandle = handle;
  state.csvFilename = file.name || "줍줍노트-문장.csv";
  loadCsvText(text);
  notify(`${message} 문장 ${state.clips.length}개를 불러왔습니다.`);
}

async function loadCsv() {
  const file = el.csvInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    state.csvHandle = null;
    state.csvFilename = file.name;
    loadCsvText(text);
    notify(`${file.name}에서 문장 ${state.clips.length}개를 불러왔습니다.`);
  } catch (error) {
    notify(error.message || "CSV를 읽지 못했습니다.");
  } finally {
    el.csvInput.value = "";
  }
}

function loadCsvText(text) {
  state.clips = parseCsv(text)
    .map(rowToClip)
    .filter((clip) => clip.contentType === "문장");
  state.visible = [...state.clips].sort(sortNewest);
  el.search.value = "";
  render();
}

function addSentence() {
  const sentence = el.sentenceInput.value.trim();
  if (!sentence) {
    notify("추가할 문장을 입력해 주세요.");
    el.sentenceInput.focus();
    return;
  }

  state.clips.unshift(createSentenceClip({
    sentence,
    reason: el.reasonInput.value,
    source: el.sourceInput.value,
    title: el.titleInput.value,
    tags: el.tagsInput.value
  }));
  clearForm();
  applyFilters();
  notify("문장을 추가했습니다.");
}

function clearForm() {
  el.sentenceInput.value = "";
  el.reasonInput.value = "";
  el.sourceInput.value = "";
  el.titleInput.value = "";
  el.tagsInput.value = "";
}

function applyFilters() {
  const query = el.search.value.trim().toLowerCase();
  state.visible = state.clips.filter((clip) => {
    if (!query) return true;
    return [
      clip.sentence,
      clip.reason,
      clip.source,
      clip.title,
      clip.tags
    ].join(" ").toLowerCase().includes(query);
  }).sort(sortNewest);
  render();
}

function showAll() {
  el.search.value = "";
  state.visible = [...state.clips].sort(sortNewest);
  render();
  notify(`전체 문장 ${state.visible.length}개를 보여줍니다.`);
}

function shuffleOne() {
  if (!state.clips.length) {
    notify("아직 꺼낼 문장이 없습니다.");
    return;
  }
  const index = Math.floor(Math.random() * state.clips.length);
  state.visible = [state.clips[index]];
  render();
  notify("문장 하나를 꺼냈습니다.");
}

function render() {
  el.count.textContent = String(state.visible.length);
  el.sentences.replaceChildren();
  if (!state.visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "문장 CSV를 열거나 새 문장을 추가하면 여기에 나타납니다.";
    el.sentences.append(empty);
    return;
  }

  el.sentences.append(...state.visible.map(sentenceCard));
}

function sentenceCard(clip) {
  const card = document.createElement("article");
  card.className = "sentence-card";
  card.dataset.id = clip.id;
  const quote = document.createElement("blockquote");
  quote.textContent = clip.sentence || "";
  const reason = document.createElement("p");
  reason.className = "reason";
  reason.textContent = clip.reason ? `이유: ${clip.reason}` : "이유를 아직 적지 않았습니다.";
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.append(
    textEl("span", "", clip.title || "제목 없음"),
    clip.source ? anchorView("출처 열기", clip.source) : textEl("span", "", "출처 없음")
  );
  const tags = tagsView(clip.tags);
  const editor = document.createElement("label");
  editor.textContent = "수집한 이유";
  const reasonInput = document.createElement("input");
  reasonInput.value = clip.reason || "";
  reasonInput.dataset.role = "reason";
  editor.append(reasonInput);
  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    actionButton("이유 저장", "save-reason"),
    actionButton("삭제", "delete", "secondary")
  );
  card.append(quote, reason, meta, tags, editor, actions);
  return card;
}

function actionButton(text, action, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.textContent = text;
  if (className) button.className = className;
  return button;
}

function handleCardClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const card = button.closest(".sentence-card");
  const clip = state.clips.find((item) => item.id === card?.dataset.id);
  if (!clip) return;

  if (button.dataset.action === "save-reason") {
    clip.reason = card.querySelector("[data-role='reason']").value.trim();
    applyFilters();
    notify("이유를 저장했습니다.");
    return;
  }

  if (button.dataset.action === "delete") {
    if (!confirm("이 문장을 삭제할까요?")) return;
    state.clips = state.clips.filter((item) => item.id !== clip.id);
    applyFilters();
    notify("문장을 삭제했습니다.");
  }
}

async function saveCsv() {
  if (!state.clips.length) {
    notify("저장할 문장이 없습니다.");
    return;
  }

  if (state.csvHandle) {
    const allowed = await verifyPermission(state.csvHandle, true);
    if (allowed) {
      const writable = await state.csvHandle.createWritable();
      await writable.write(`\uFEFF${clipsToCsvText(state.clips)}`);
      await writable.close();
      notify(`${state.csvFilename || "줍줍노트-문장.csv"}에 저장했습니다.`);
      return;
    }
  }

  downloadText("줍줍노트-문장.csv", clipsToCsvText(state.clips), "text/csv;charset=utf-8");
  notify("문장 CSV를 내려받았습니다.");
}

function createSentenceClip(input = {}) {
  const source = normalizeText(input.source || "");
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    contentType: "문장",
    sentence: normalizeSentence(input.sentence || ""),
    reason: normalizeText(input.reason || ""),
    connection: "",
    useFor: "정리필요",
    action: "정리필요",
    source,
    siteName: deriveSiteName(source),
    iconUrl: "",
    imagePath: "",
    imageUrl: "",
    title: normalizeText(input.title || ""),
    tags: normalizeTags(input.tags || "#문장"),
    status: "새로 수집",
    favorite: false,
    reviewCount: 0,
    lastReviewed: ""
  };
}

function rowToClip(row) {
  return {
    id: row.id || crypto.randomUUID(),
    createdAt: row["수집 일시"] || new Date().toISOString(),
    contentType: row["유형"] || "문장",
    sentence: row["주운 글"] || row["문장"] || "",
    reason: row["수집한 이유"] || "",
    connection: row["연결/확장"] || "",
    useFor: row["활용처"] || "정리필요",
    action: row["다음 액션"] || "정리필요",
    source: row["출처"] || "",
    siteName: row["사이트명"] || deriveSiteName(row["출처"] || ""),
    iconUrl: row["아이콘 URL"] || "",
    imagePath: row["이미지 경로"] || "",
    imageUrl: row["이미지 URL"] || "",
    title: row["제목"] || "",
    tags: row["태그"] || "",
    status: row["상태"] || "새로 수집",
    favorite: parseFavorite(row["별표"]),
    reviewCount: row["확인 횟수"] || "",
    lastReviewed: row["마지막 확인"] || ""
  };
}

function clipsToCsvText(clips) {
  const rows = clips.map((clip) => [
    clip.id,
    clip.createdAt,
    "문장",
    clip.sentence,
    clip.reason,
    clip.connection,
    clip.useFor,
    clip.action,
    clip.source,
    clip.siteName,
    clip.iconUrl,
    clip.imagePath,
    clip.imageUrl,
    clip.title,
    clip.tags,
    clip.status,
    clip.favorite ? "TRUE" : "FALSE",
    clip.reviewCount,
    clip.lastReviewed
  ]);
  return [HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const clean = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    const next = clean[i + 1];
    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      i += 1;
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

  const headers = rows.shift() || HEADERS;
  return rows.filter((values) => values.some(Boolean)).map((values) => {
    const output = {};
    headers.forEach((header, index) => {
      output[header] = values[index] || "";
    });
    return output;
  });
}

function tagsView(tags) {
  const wrap = document.createElement("div");
  wrap.className = "tags";
  String(tags || "").split(/\s+/).filter(Boolean).forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = tag;
    wrap.append(item);
  });
  return wrap;
}

function textEl(tag, className, text) {
  const item = document.createElement(tag);
  item.className = className;
  item.textContent = text || "";
  return item;
}

function anchorView(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
}

function sortNewest(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSentence(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normalizeTags(value) {
  const raw = String(value || "#문장").split(/[,\s]+/);
  return [...new Set(raw
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.startsWith("#") ? tag : `#${tag}`))].join(" ");
}

function deriveSiteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseFavorite(value) {
  return ["true", "1", "yes", "y", "예", "좋아요", "별표", "★"].includes(String(value || "").trim().toLowerCase());
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function downloadText(filename, text, type) {
  const blob = new Blob(["\uFEFF", text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function notify(message) {
  el.status.textContent = message;
  showToast(message);
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  el.toast.textContent = message;
  el.toast.hidden = false;
  el.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    el.toast.classList.remove("is-visible");
    el.toast.hidden = true;
  }, 2400);
}

function verifyPermission(handle, write) {
  const options = { mode: write ? "readwrite" : "read" };
  if (!handle.queryPermission || !handle.requestPermission) return Promise.resolve(false);
  return handle.queryPermission(options)
    .then((status) => {
      if (status === "granted") return true;
      return handle.requestPermission(options).then((nextStatus) => nextStatus === "granted");
    })
    .catch(() => false);
}

function hasPermission(handle, write) {
  const options = { mode: write ? "readwrite" : "read" };
  if (!handle.queryPermission) return Promise.resolve(false);
  return handle.queryPermission(options)
    .then((status) => status === "granted")
    .catch(() => false);
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) {
        request.result.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeHandle(key, handle) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(handle, key);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getStoredHandle(key) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readonly");
    const request = transaction.objectStore(DB_STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
