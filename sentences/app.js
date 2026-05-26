import {
  clearCloudSession,
  deleteCloudClip,
  fetchCloudClips,
  getCloudSettings,
  hasCloudSession,
  saveCloudSettings,
  signInToCloud,
  upsertCloudClips
} from "../shared/supabase-store.js";

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
const CATEGORY_MARKER = "[줍줍문장 분류]";
const CATEGORIES = ["책", "아티클", "뉴스레터", "영화", "강연", "웹", "기타"];
const PAGE_SIZE = 10;

const state = {
  clips: [],
  visible: [],
  page: 1,
  csvHandle: null,
  csvFilename: "",
  notionRows: [],
  notionHeaders: [],
  toastTimer: 0,
  cloudReady: false,
  editingId: "",
  favoriteOnly: false,
  viewMode: "all"
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
  cloudPush: document.querySelector("#cloudPush"),
  cloudStatus: document.querySelector("#cloudStatus"),
  cloudAdvanced: document.querySelector(".cloud-advanced"),
  connectCsv: document.querySelector("#connectCsv"),
  csvInput: document.querySelector("#csvInput"),
  saveCsv: document.querySelector("#saveCsv"),
  status: document.querySelector("#status"),
  sentenceInput: document.querySelector("#sentenceInput"),
  reasonInput: document.querySelector("#reasonInput"),
  categoryInput: document.querySelector("#categoryInput"),
  sourceInput: document.querySelector("#sourceInput"),
  titleInput: document.querySelector("#titleInput"),
  favoriteInput: document.querySelector("#favoriteInput"),
  tagsInput: document.querySelector("#tagsInput"),
  suggestTags: document.querySelector("#suggestTags"),
  addSentence: document.querySelector("#addSentence"),
  notionCsvInput: document.querySelector("#notionCsvInput"),
  notionMapper: document.querySelector("#notionMapper"),
  mapSentence: document.querySelector("#mapSentence"),
  mapReason: document.querySelector("#mapReason"),
  mapSource: document.querySelector("#mapSource"),
  mapTitle: document.querySelector("#mapTitle"),
  mapTags: document.querySelector("#mapTags"),
  importNotion: document.querySelector("#importNotion"),
  search: document.querySelector("#search"),
  categoryFilter: document.querySelector("#categoryFilter"),
  showAll: document.querySelector("#showAll"),
  showInbox: document.querySelector("#showInbox"),
  showReviewed: document.querySelector("#showReviewed"),
  showFavorites: document.querySelector("#showFavorites"),
  shuffleOne: document.querySelector("#shuffleOne"),
  count: document.querySelector("#count"),
  sentences: document.querySelector("#sentences"),
  toast: document.querySelector("#toast"),
  sentenceDialog: document.querySelector("#sentenceDialog"),
  detailSentence: document.querySelector("#detailSentence"),
  detailSentenceInput: document.querySelector("#detailSentenceInput"),
  detailFavorite: document.querySelector("#detailFavorite"),
  detailCategory: document.querySelector("#detailCategory"),
  detailReason: document.querySelector("#detailReason"),
  detailTags: document.querySelector("#detailTags"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSource: document.querySelector("#detailSource"),
  detailImageUrl: document.querySelector("#detailImageUrl"),
  detailCover: document.querySelector("#detailCover"),
  detailAnalyze: document.querySelector("#detailAnalyze"),
  detailImageSearch: document.querySelector("#detailImageSearch"),
  detailSave: document.querySelector("#detailSave"),
  detailDelete: document.querySelector("#detailDelete")
};

el.connectCsv.addEventListener("click", connectCsvFile);
el.csvInput.addEventListener("change", loadCsv);
el.saveCsv.addEventListener("click", saveCsv);
el.suggestTags.addEventListener("click", suggestTagsForNewSentence);
el.addSentence.addEventListener("click", addSentence);
el.notionCsvInput.addEventListener("change", loadNotionCsv);
el.importNotion.addEventListener("click", importNotionRows);
el.search.addEventListener("input", applyFilters);
el.categoryFilter.addEventListener("change", applyFilters);
el.tagsInput.addEventListener("input", () => renderTagSuggestions(el.tagsInput));
el.tagsInput.addEventListener("blur", () => {
  el.tagsInput.value = normalizeTags(el.tagsInput.value);
});
el.showAll.addEventListener("click", showAll);
el.showInbox.addEventListener("click", showInbox);
el.showReviewed.addEventListener("click", showReviewed);
el.showFavorites.addEventListener("click", showFavorites);
el.shuffleOne.addEventListener("click", shuffleOne);
el.sentences.addEventListener("click", handleCardClick);
el.detailSave.addEventListener("click", saveDetail);
el.detailDelete.addEventListener("click", deleteDetail);
el.detailAnalyze.addEventListener("click", suggestTagsForDetail);
el.detailImageSearch.addEventListener("click", searchSourceImage);
el.detailImageUrl.addEventListener("input", () => renderDetailCover(el.detailImageUrl.value, el.detailTitle.value));
el.detailTags.addEventListener("input", () => renderTagSuggestions(el.detailTags));
el.detailTags.addEventListener("blur", () => {
  el.detailTags.value = normalizeTags(el.detailTags.value);
});
el.cloudSave.addEventListener("click", saveCloudConfig);
el.cloudLogin.addEventListener("click", loginCloud);
el.cloudLogout.addEventListener("click", logoutCloud);
el.cloudPull.addEventListener("click", pullCloud);
el.cloudPush.addEventListener("click", pushCloud);
document.querySelectorAll("[data-open-panel]").forEach((button) => {
  button.addEventListener("click", () => toggleFloatingPanel(button.dataset.openPanel));
});

restoreCloudConfig();
render();
restoreConnectedCsv();
autoPullCloud();

function restoreCloudConfig() {
  const settings = getCloudSettings();
  el.cloudUrl.value = settings.url || "";
  el.cloudAnonKey.value = settings.anonKey || "";
  el.cloudEmail.value = settings.email || "";
  el.cloudPassword.value = settings.password || "";
  if (el.cloudAdvanced) el.cloudAdvanced.open = !settings.anonKey;
  state.cloudReady = hasCloudSession(settings);
  setCloudStatus(state.cloudReady ? "Supabase에 로그인되어 있습니다. 문장 DB를 불러올 수 있습니다." : "이메일/비밀번호로 로그인해 주세요. 처음 연결이라면 고급 설정에 anon key가 필요합니다.");
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
    setCloudStatus("Supabase에 로그인했습니다. 문장을 불러옵니다.");
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
    setCloudStatus(error.message || "Supabase 문장을 자동으로 불러오지 못했습니다.");
  }
}

async function pullCloud(options = {}) {
  if (!hasCloudSession()) {
    setCloudStatus("먼저 Supabase에 로그인해 주세요.");
    return;
  }
  if (!options.quiet) setCloudStatus("Supabase에서 문장을 불러오는 중...");
  try {
    const clips = (await fetchCloudClips()).filter((clip) => clip.contentType === "문장");
    state.clips = mergeClips(state.clips, clips);
    applyFilters();
    state.cloudReady = true;
    setCloudStatus(`Supabase에서 문장 ${clips.length}개를 불러왔습니다.`);
  } catch (error) {
    setCloudStatus(error.message || "Supabase에서 문장을 불러오지 못했습니다.");
  }
}

async function pushCloud() {
  if (!state.clips.length) {
    setCloudStatus("올릴 문장이 없습니다.");
    return;
  }
  if (!hasCloudSession()) {
    setCloudStatus("먼저 Supabase에 로그인해 주세요.");
    return;
  }
  setCloudStatus("현재 문장들을 Supabase에 저장 중...");
  try {
    await upsertCloudClips(state.clips);
    state.cloudReady = true;
    setCloudStatus(`Supabase에 문장 ${state.clips.length}개를 저장했습니다.`);
  } catch (error) {
    setCloudStatus(error.message || "Supabase에 문장을 저장하지 못했습니다.");
  }
}

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

  const clip = createSentenceClip({
    sentence,
    reason: el.reasonInput.value,
    source: el.sourceInput.value,
    title: el.titleInput.value,
    tags: el.tagsInput.value,
    category: el.categoryInput.value,
    favorite: el.favoriteInput.value === "true"
  });
  state.clips.unshift(clip);
  saveCloudClip(clip);
  clearForm();
  applyFilters();
  notify("문장을 추가했습니다.");
}

function clearForm() {
  el.sentenceInput.value = "";
  el.reasonInput.value = "";
  el.sourceInput.value = "";
  el.titleInput.value = "";
  el.categoryInput.value = "자동";
  el.favoriteInput.value = "";
  el.tagsInput.value = "";
}

function suggestTagsForNewSentence() {
  const sentence = el.sentenceInput.value.trim();
  if (!sentence) {
    notify("먼저 문장을 입력해 주세요.");
    el.sentenceInput.focus();
    return;
  }
  const category = el.categoryInput.value === "자동"
    ? inferCategory({ sentence, source: el.sourceInput.value, title: el.titleInput.value, tags: el.tagsInput.value })
    : el.categoryInput.value;
  el.categoryInput.value = category;
  el.tagsInput.value = suggestTags(sentence, el.tagsInput.value, category);
  renderTagSuggestions(el.tagsInput);
  notify("태그를 콤마 기준으로 정리했습니다. 기존 태그는 입력칸 아래에서 골라 넣을 수 있습니다.");
}

async function loadNotionCsv() {
  const file = el.notionCsvInput.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    state.notionRows = parseCsv(text);
    state.notionHeaders = Object.keys(state.notionRows[0] || {});
    if (!state.notionRows.length || !state.notionHeaders.length) {
      notify("노션 CSV에서 읽을 행을 찾지 못했습니다.");
      return;
    }
    renderMapper();
    notify(`${file.name}에서 ${state.notionRows.length}개 행을 읽었습니다. 컬럼을 맞춰 주세요.`);
  } catch (error) {
    notify(error.message || "노션 CSV를 읽지 못했습니다.");
  } finally {
    el.notionCsvInput.value = "";
  }
}

function renderMapper() {
  const fields = [
    [el.mapSentence, ["문장", "quote", "sentence", "text", "content", "name", "이름", "제목"]],
    [el.mapReason, ["수집한 이유", "이유", "why", "reason", "memo", "메모", "note"]],
    [el.mapSource, ["출처", "source", "url", "link", "링크"]],
    [el.mapTitle, ["제목", "title", "name", "이름"]],
    [el.mapTags, ["태그", "tags", "tag", "분류"]]
  ];

  for (const [select, guesses] of fields) {
    select.replaceChildren(optionView("", "선택 안 함"));
    for (const header of state.notionHeaders) {
      select.append(optionView(header, header));
    }
    select.value = guessHeader(guesses);
  }

  if (!el.mapSentence.value && state.notionHeaders[0]) {
    el.mapSentence.value = state.notionHeaders[0];
  }
  el.notionMapper.hidden = false;
}

function importNotionRows() {
  if (!state.notionRows.length) {
    notify("먼저 노션 CSV를 열어 주세요.");
    return;
  }
  const sentenceKey = el.mapSentence.value;
  if (!sentenceKey) {
    notify("문장 컬럼을 선택해 주세요.");
    el.mapSentence.focus();
    return;
  }

  const imported = state.notionRows
    .map((row) => createSentenceClip({
      sentence: row[sentenceKey],
      reason: valueFromRow(row, el.mapReason.value),
      source: valueFromRow(row, el.mapSource.value),
      title: valueFromRow(row, el.mapTitle.value),
      tags: valueFromRow(row, el.mapTags.value) || "#문장 #노션",
      category: inferCategory({
        sentence: row[sentenceKey],
        source: valueFromRow(row, el.mapSource.value),
        title: valueFromRow(row, el.mapTitle.value),
        tags: valueFromRow(row, el.mapTags.value)
      })
    }))
    .filter((clip) => clip.sentence);

  if (!imported.length) {
    notify("가져올 문장을 찾지 못했습니다. 문장 컬럼을 다시 확인해 주세요.");
    return;
  }

  state.clips = [...imported, ...state.clips];
  applyFilters();
  if (hasCloudSession()) upsertCloudClips(imported).catch((error) => setCloudStatus(error.message || "가져온 문장을 Supabase에 저장하지 못했습니다."));
  notify(`노션 문장 ${imported.length}개를 줍줍문장에 합쳤습니다.`);
}

function applyFilters() {
  const query = el.search.value.trim().toLowerCase();
  const category = el.categoryFilter.value;
  state.visible = state.clips.filter((clip) => {
    if (state.favoriteOnly && !clip.favorite) return false;
    if (state.viewMode === "inbox" && isReviewed(clip)) return false;
    if (state.viewMode === "reviewed" && !isReviewed(clip)) return false;
    if (category && categoryOf(clip) !== category) return false;
    if (!query) return true;
    return [
      clip.sentence,
      clip.reason,
      clip.source,
      clip.title,
      clip.tags,
      categoryOf(clip)
    ].join(" ").toLowerCase().includes(query);
  }).sort(sortNewest);
  state.page = 1;
  render();
}

function showAll() {
  el.search.value = "";
  el.categoryFilter.value = "";
  state.favoriteOnly = false;
  state.viewMode = "all";
  state.visible = [...state.clips].sort(sortNewest);
  state.page = 1;
  render();
  notify(`전체 문장 ${state.visible.length}개를 보여줍니다.`);
}

function showInbox() {
  state.favoriteOnly = false;
  state.viewMode = "inbox";
  applyFilters();
  notify(`아직 확인하지 않은 인박스 문장 ${state.visible.length}개를 보여줍니다.`);
}

function showReviewed() {
  state.favoriteOnly = false;
  state.viewMode = "reviewed";
  applyFilters();
  notify(`확인하거나 편집한 문장 ${state.visible.length}개를 보여줍니다.`);
}

function showFavorites() {
  state.favoriteOnly = true;
  state.viewMode = "all";
  applyFilters();
  notify(`기억하고 싶은 문장 ${state.visible.length}개를 보여줍니다.`);
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
  const pageCount = Math.max(1, Math.ceil(state.visible.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), pageCount);
  const start = (state.page - 1) * PAGE_SIZE;
  const displayed = state.visible.slice(start, start + PAGE_SIZE);
  el.sentences.replaceChildren();
  if (!state.visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "문장 CSV를 열거나 새 문장을 추가하면 여기에 나타납니다.";
    el.sentences.append(empty);
    return;
  }

  el.sentences.append(...displayed.map(sentenceCard));
  if (state.visible.length > PAGE_SIZE) el.sentences.append(paginationView(state.visible.length, pageCount));
}

function paginationView(total, pageCount) {
  const nav = document.createElement("nav");
  nav.className = "pagination";
  nav.setAttribute("aria-label", "페이지 이동");
  nav.append(
    pageButton("이전", state.page - 1, state.page <= 1),
    textEl("span", "page-info", `${state.page} / ${pageCount} · 전체 ${total}개`),
    pageButton("다음", state.page + 1, state.page >= pageCount)
  );
  return nav;
}

function pageButton(label, page, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", () => {
    state.page = page;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  return button;
}

function toggleFloatingPanel(name) {
  const panel = document.querySelector(`[data-floating-panel="${name}"]`);
  if (!panel) return;
  const shouldOpen = !panel.classList.contains("is-open");
  document.querySelectorAll("[data-floating-panel]").forEach((item) => item.classList.remove("is-open"));
  if (shouldOpen) panel.classList.add("is-open");
}

function sentenceCard(clip) {
  const card = document.createElement("article");
  card.className = "sentence-card";
  if (clip.favorite) card.classList.add("is-favorite");
  card.classList.add(isReviewed(clip) ? "is-reviewed-state" : "is-inbox-state");
  card.dataset.id = clip.id;

  const top = document.createElement("div");
  top.className = "sentence-top";
  const chips = document.createElement("div");
  chips.className = "sentence-chips";
  chips.append(textEl("span", "category-chip", categoryOf(clip)));
  chips.append(textEl("span", isReviewed(clip) ? "state-chip is-reviewed" : "state-chip", isReviewed(clip) ? "확인함" : "인박스"));
  const star = document.createElement("button");
  star.type = "button";
  star.className = clip.favorite ? "star is-on" : "star";
  star.dataset.action = "toggle-favorite";
  star.setAttribute("aria-label", clip.favorite ? "기억 표시 해제" : "기억 표시");
  star.textContent = clip.favorite ? "★" : "☆";
  top.append(chips, star);

  const quote = document.createElement("blockquote");
  quote.textContent = clip.sentence || "";

  const reason = document.createElement("p");
  reason.className = "reason";
  reason.textContent = clip.reason ? clip.reason : "이유를 아직 적지 않았습니다.";

  const meta = document.createElement("div");
  meta.className = "meta";
  if (clip.imageUrl) meta.append(imageThumb(clip.imageUrl, clip.title));
  meta.append(textEl("span", "", clip.title || "제목 없음"));
  if (clip.source) meta.append(anchorView("출처 열기", clip.source));

  const tags = tagsView(clip.tags);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    actionButton("자세히", "open-detail"),
    actionButton("확인 완료", "mark-reviewed", "secondary"),
    actionButton("삭제", "delete", "secondary")
  );
  card.append(top, quote, reason, meta, tags, actions);
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

  if (button.dataset.action === "toggle-favorite") {
    clip.favorite = !clip.favorite;
    markReviewed(clip);
    applyFilters();
    saveCloudClip(clip);
    notify(clip.favorite ? "기억하고 싶은 문장으로 표시했습니다." : "기억 표시를 해제했습니다.");
    return;
  }

  if (button.dataset.action === "open-detail") {
    openDetail(clip.id);
    return;
  }

  if (button.dataset.action === "mark-reviewed") {
    markReviewed(clip);
    applyFilters();
    saveCloudClip(clip);
    notify("확인한 문장으로 표시했습니다.");
    return;
  }

  if (button.dataset.action === "delete") {
    if (!confirm("이 문장을 삭제할까요?")) return;
    state.clips = state.clips.filter((item) => item.id !== clip.id);
    applyFilters();
    removeCloudClip(clip.id);
    notify("문장을 삭제했습니다.");
  }
}

function openDetail(id) {
  const clip = state.clips.find((item) => item.id === id);
  if (!clip) return;
  state.editingId = id;
  el.detailSentence.textContent = clip.sentence || "";
  el.detailSentenceInput.value = clip.sentence || "";
  el.detailFavorite.checked = Boolean(clip.favorite);
  el.detailCategory.value = categoryOf(clip);
  el.detailReason.value = clip.reason || "";
  el.detailTags.value = clip.tags || "";
  renderTagSuggestions(el.detailTags);
  el.detailTitle.value = clip.title || "";
  el.detailSource.value = clip.source || "";
  el.detailImageUrl.value = clip.imageUrl || "";
  renderDetailCover(clip.imageUrl, clip.title);
  el.sentenceDialog.showModal();
}

function saveDetail(event) {
  event.preventDefault();
  const clip = state.clips.find((item) => item.id === state.editingId);
  if (!clip) return;
  clip.sentence = normalizeSentence(el.detailSentenceInput.value);
  clip.favorite = el.detailFavorite.checked;
  clip.reason = normalizeText(el.detailReason.value);
  clip.tags = normalizeTags(el.detailTags.value);
  clip.title = normalizeText(el.detailTitle.value);
  clip.source = normalizeText(el.detailSource.value);
  clip.siteName = deriveSiteName(clip.source);
  clip.imageUrl = normalizeText(el.detailImageUrl.value);
  setCategory(clip, el.detailCategory.value);
  markReviewed(clip);
  el.sentenceDialog.close();
  applyFilters();
  saveCloudClip(clip);
  notify("문장 상세 정보를 저장했습니다.");
}

function deleteDetail(event) {
  event.preventDefault();
  const clip = state.clips.find((item) => item.id === state.editingId);
  if (!clip) return;
  if (!confirm("이 문장을 삭제할까요?")) return;
  state.clips = state.clips.filter((item) => item.id !== clip.id);
  state.editingId = "";
  el.sentenceDialog.close();
  applyFilters();
  removeCloudClip(clip.id);
  notify("문장을 삭제했습니다.");
}

function suggestTagsForDetail() {
  const clip = state.clips.find((item) => item.id === state.editingId);
  const sentence = el.detailSentenceInput.value.trim();
  if (!clip || !sentence) return;
  const category = inferCategory({
    sentence,
    source: el.detailSource.value,
    title: el.detailTitle.value,
    tags: el.detailTags.value
  });
  el.detailCategory.value = category;
  el.detailTags.value = suggestTags(sentence, el.detailTags.value, category);
  renderTagSuggestions(el.detailTags);
  notify("태그를 콤마 기준으로 정리했습니다. 기존 태그는 입력칸 아래에서 골라 넣을 수 있습니다.");
}

function searchSourceImage() {
  const query = [
    el.detailTitle.value,
    el.detailCategory.value === "영화" ? "movie poster" : "",
    el.detailCategory.value === "책" ? "book cover" : "",
    "이미지"
  ].filter(Boolean).join(" ");
  if (!query.trim()) {
    notify("먼저 출처 제목을 입력해 주세요.");
    return;
  }
  window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
}

function renderDetailCover(url, title) {
  el.detailCover.replaceChildren();
  if (!url) {
    el.detailCover.append(textEl("span", "", "표지나 참고 이미지를 넣고 싶으면 이미지 URL을 붙여넣으세요."));
    return;
  }
  const image = document.createElement("img");
  image.src = url;
  image.alt = title || "출처 이미지";
  el.detailCover.append(image);
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
  const category = input.category && input.category !== "자동"
    ? input.category
    : inferCategory(input);
  const tags = input.tags ? normalizeTags(input.tags) : suggestTags(input.sentence, "", category);
  const connection = withCategory("", category);
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    contentType: "문장",
    sentence: normalizeSentence(input.sentence || ""),
    reason: normalizeText(input.reason || ""),
    connection,
    useFor: "정리필요",
    action: "정리필요",
    source,
    siteName: deriveSiteName(source),
    iconUrl: "",
    imagePath: "",
    imageUrl: "",
    title: normalizeText(input.title || ""),
    tags,
    status: "새로 수집",
    favorite: Boolean(input.favorite),
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

function suggestTags(sentence, currentTags = "", category = "") {
  const base = normalizeTags(currentTags);
  const extra = ["#문장"];
  if (category && category !== "자동") extra.push(`#${category}`);
  return normalizeTags(`${base} ${extra.join(" ")}`);
}

function categoryOf(clip) {
  return readCategory(clip.connection) || inferCategory(clip);
}

function isReviewed(clip) {
  const status = clip.status || "새로 수집";
  return status !== "새로 수집"
    || Number(clip.reviewCount || 0) > 0
    || Boolean(clip.lastReviewed);
}

function markReviewed(clip) {
  if (clip.status === "새로 수집" || !clip.status) clip.status = "확인함";
  clip.reviewCount = Number(clip.reviewCount || 0) + 1;
  clip.lastReviewed = new Date().toISOString();
}

function setCategory(clip, category) {
  clip.connection = withCategory(clip.connection, category || inferCategory(clip));
}

function readCategory(connection) {
  const text = String(connection || "");
  const index = text.indexOf(CATEGORY_MARKER);
  if (index < 0) return "";
  const value = text.slice(index + CATEGORY_MARKER.length).trim().split(/\n/)[0].trim();
  return CATEGORIES.includes(value) ? value : "";
}

function withCategory(connection, category) {
  const cleanCategory = CATEGORIES.includes(category) ? category : "기타";
  const text = String(connection || "");
  const plain = text.split(CATEGORY_MARKER)[0].trim();
  return [plain, `${CATEGORY_MARKER}\n${cleanCategory}`].filter(Boolean).join("\n\n");
}

function inferCategory(input = {}) {
  const text = [
    input.sentence,
    input.title,
    input.source,
    input.tags
  ].join(" ").toLowerCase();
  if (/책|도서|소설|시집|문학|book|novel|출판|작가/.test(text)) return "책";
  if (/뉴스레터|newsletter|메일|letter/.test(text)) return "뉴스레터";
  if (/영화|드라마|movie|film|cinema|netflix|watcha|왓챠/.test(text)) return "영화";
  if (/강연|강의|lecture|talk|ted|세미나/.test(text)) return "강연";
  if (/article|아티클|칼럼|essay|longblack|brunch|medium|substack/.test(text)) return "아티클";
  if (/https?:\/\//.test(text)) return "웹";
  return "기타";
}

async function saveCloudClip(clip) {
  if (!hasCloudSession()) return;
  try {
    await upsertCloudClips([clip]);
    setCloudStatus("Supabase에도 문장을 저장했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "Supabase 문장 저장에 실패했습니다.");
  }
}

async function removeCloudClip(id) {
  if (!hasCloudSession()) return;
  try {
    await deleteCloudClip(id);
    setCloudStatus("Supabase에서도 문장을 삭제했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "Supabase 문장 삭제에 실패했습니다.");
  }
}

function mergeClips(current, incoming) {
  const output = [...current];
  const seen = new Set(output.map(clipKey));
  for (const clip of incoming) {
    const key = clipKey(clip);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(clip);
  }
  return output.sort(sortNewest);
}

function clipKey(clip) {
  return [
    clip.id,
    clip.createdAt,
    clip.source,
    clip.title,
    clip.sentence
  ].filter(Boolean).join("|") || crypto.randomUUID();
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

function imageThumb(url, title) {
  const image = document.createElement("img");
  image.className = "sentence-thumb";
  image.src = url;
  image.alt = title || "출처 이미지";
  return image;
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

function tagPool() {
  return [...new Set(state.clips
    .flatMap((clip) => String(Array.isArray(clip.tags) ? clip.tags.join(" ") : clip.tags || "").split(/[,\s]+/))
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.startsWith("#") ? tag : `#${tag}`))]
    .sort((a, b) => a.localeCompare(b, "ko"));
}

function renderTagSuggestions(input) {
  if (!input) return;
  let box = input.parentElement.querySelector(".tag-suggestions");
  if (!box) {
    box = document.createElement("div");
    box.className = "tag-suggestions";
    input.insertAdjacentElement("afterend", box);
  }
  const selected = new Set(normalizeTags(input.value).split(/\s+/).filter(Boolean));
  const query = String(input.value || "").split(/[,\s]+/).pop().replace(/^#/, "").toLowerCase();
  const tags = tagPool()
    .filter((tag) => !selected.has(tag) && (!query || tag.toLowerCase().includes(query)))
    .slice(0, 10);
  box.replaceChildren(...tags.map((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-suggestion";
    button.textContent = tag;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      input.value = normalizeTags(`${input.value} ${tag}`);
      renderTagSuggestions(input);
    });
    return button;
  }));
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

function optionView(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function guessHeader(candidates) {
  const normalized = state.notionHeaders.map((header) => ({
    raw: header,
    value: normalizeHeader(header)
  }));
  for (const candidate of candidates) {
    const needle = normalizeHeader(candidate);
    const exact = normalized.find((header) => header.value === needle);
    if (exact) return exact.raw;
    const partial = normalized.find((header) => header.value.includes(needle));
    if (partial) return partial.raw;
  }
  return "";
}

function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/[\s_/.-]+/g, "");
}

function valueFromRow(row, key) {
  return key ? row[key] || "" : "";
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

function setCloudStatus(message) {
  el.cloudStatus.textContent = message;
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
