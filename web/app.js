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

const DB_NAME = "zzupzzup-web";
const DB_STORE = "handles";
const CSV_HANDLE_KEY = "csv";
const IMAGE_FOLDER_HANDLE_KEY = "imageFolder";
const EXCLUDE_DONE_KEY = "zzupzzup:excludeDone";

const state = {
  clips: [],
  visible: [],
  imageUrls: new Map(),
  csvHandle: null,
  imageFolderHandle: null,
  csvFilename: "",
  autoSaveTimer: 0,
  activeDate: "",
  activeRange: "",
  favoriteOnly: false,
  calendarOpen: false,
  editingId: ""
};

const RANGE_LABELS = {
  today: "오늘 수집",
  week: "이번 주",
  month: "이번 달",
  year: "올해"
};

const el = {
  connectCsv: document.querySelector("#connectCsv"),
  csvInput: document.querySelector("#csvInput"),
  mergeCsvInput: document.querySelector("#mergeCsvInput"),
  connectImageFolder: document.querySelector("#connectImageFolder"),
  imageInput: document.querySelector("#imageInput"),
  downloadCsv: document.querySelector("#downloadCsv"),
  clockPanel: document.querySelector("#clockPanel"),
  todayText: document.querySelector("#todayText"),
  clockText: document.querySelector("#clockText"),
  onboarding: document.querySelector("#onboarding"),
  hideOnboarding: document.querySelector("#hideOnboarding"),
  showOnboarding: document.querySelector("#showOnboarding"),
  search: document.querySelector("#search"),
  typeFilter: document.querySelector("#typeFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  useForFilter: document.querySelector("#useForFilter"),
  tagFilter: document.querySelector("#tagFilter"),
  excludeDone: document.querySelector("#excludeDone"),
  showAll: document.querySelector("#showAll"),
  showToday: document.querySelector("#showToday"),
  showWeek: document.querySelector("#showWeek"),
  showMonth: document.querySelector("#showMonth"),
  showYear: document.querySelector("#showYear"),
  showPending: document.querySelector("#showPending"),
  showDone: document.querySelector("#showDone"),
  showStarred: document.querySelector("#showStarred"),
  showSentence: document.querySelector("#showSentence"),
  showCalendar: document.querySelector("#showCalendar"),
  pasteCsvText: document.querySelector("#pasteCsvText"),
  connectCsvFromPaste: document.querySelector("#connectCsvFromPaste"),
  readClipboardCsv: document.querySelector("#readClipboardCsv"),
  mergePastedCsv: document.querySelector("#mergePastedCsv"),
  clearPastedCsv: document.querySelector("#clearPastedCsv"),
  exportCsv: document.querySelector("#exportCsv"),
  copyNotion: document.querySelector("#copyNotion"),
  exportPendingCsv: document.querySelector("#exportPendingCsv"),
  exportDoneCsv: document.querySelector("#exportDoneCsv"),
  fileStatus: document.querySelector("#fileStatus"),
  stats: document.querySelector("#stats"),
  calendar: document.querySelector("#calendar"),
  cards: document.querySelector("#cards"),
  detailDialog: document.querySelector("#detailDialog"),
  detailHeading: document.querySelector("#detailHeading"),
  detailEmbed: document.querySelector("#detailEmbed"),
  detailText: document.querySelector("#detailText"),
  detailSource: document.querySelector("#detailSource"),
  detailTitle: document.querySelector("#detailTitle"),
  detailImageUrl: document.querySelector("#detailImageUrl"),
  detailImagePath: document.querySelector("#detailImagePath"),
  detailType: document.querySelector("#detailType"),
  detailStatus: document.querySelector("#detailStatus"),
  detailDone: document.querySelector("#detailDone"),
  detailFavorite: document.querySelector("#detailFavorite"),
  detailReason: document.querySelector("#detailReason"),
  detailConnection: document.querySelector("#detailConnection"),
  detailUseFor: document.querySelector("#detailUseFor"),
  detailAction: document.querySelector("#detailAction"),
  detailTags: document.querySelector("#detailTags"),
  detailSave: document.querySelector("#detailSave"),
  detailDelete: document.querySelector("#detailDelete")
};

el.connectCsv.addEventListener("click", connectCsvFile);
el.csvInput.addEventListener("change", loadCsv);
el.mergeCsvInput.addEventListener("change", mergeCsv);
el.connectImageFolder.addEventListener("click", connectImageFolder);
el.imageInput.addEventListener("change", loadImages);
el.downloadCsv.addEventListener("click", downloadCsv);
el.search.addEventListener("input", applyFilters);
el.typeFilter.addEventListener("change", applyFilters);
el.statusFilter.addEventListener("change", applyFilters);
el.useForFilter.addEventListener("change", applyFilters);
el.tagFilter.addEventListener("input", applyFilters);
el.excludeDone.addEventListener("change", toggleExcludeDone);
el.showAll.addEventListener("click", showAll);
el.showToday.addEventListener("click", showToday);
el.showWeek.addEventListener("click", showWeek);
el.showMonth.addEventListener("click", showMonth);
el.showYear.addEventListener("click", showYear);
el.showPending.addEventListener("click", showPending);
el.showDone.addEventListener("click", showDone);
el.showStarred.addEventListener("click", showStarred);
el.showSentence.addEventListener("click", () => showType("문장"));
el.showCalendar.addEventListener("click", toggleCalendar);
el.connectCsvFromPaste.addEventListener("click", connectCsvFile);
el.readClipboardCsv.addEventListener("click", readClipboardCsv);
el.mergePastedCsv.addEventListener("click", mergePastedCsv);
el.clearPastedCsv.addEventListener("click", clearPastedCsv);
el.detailSave.addEventListener("click", saveDetail);
el.detailDelete.addEventListener("click", deleteDetail);
el.exportCsv.addEventListener("click", downloadCsv);
el.copyNotion.addEventListener("click", copyNotionMarkdown);
el.exportPendingCsv.addEventListener("click", downloadPendingCsv);
el.exportDoneCsv.addEventListener("click", downloadDoneCsv);
el.hideOnboarding.addEventListener("click", hideOnboarding);
el.showOnboarding.addEventListener("click", showOnboarding);

restoreOnboarding();
restoreExcludeDone();
renderClock();
setInterval(renderClock, 30 * 1000);
render();
restoreConnectedCsv();
restoreConnectedImageFolder();

async function connectCsvFile() {
  if (!window.showOpenFilePicker) {
    setFileStatus("이 브라우저에서는 CSV 연결을 지원하지 않습니다. Chrome에서 GitHub Pages 주소로 열어 주세요.");
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
    await loadCsvFromHandle(handle);
  } catch (error) {
    if (error?.name === "AbortError") return;
    setFileStatus(error.message || "CSV 파일을 연결하지 못했습니다.");
  }
}

async function restoreConnectedCsv() {
  if (!window.showOpenFilePicker) return;
  try {
    const handle = await getStoredHandle(CSV_HANDLE_KEY);
    if (!handle) return;
    const allowed = await hasPermission(handle, false);
    if (!allowed) {
      state.csvHandle = handle;
      setFileStatus("이전에 연결한 CSV가 있습니다. CSV 저장/자동 반영을 쓰려면 CSV 연결을 다시 눌러 권한을 허용해 주세요.");
      return;
    }
    await loadCsvFromHandle(handle, { restored: true });
  } catch {
    setFileStatus("이전에 연결한 CSV를 다시 읽지 못했습니다. CSV 연결을 다시 눌러 주세요.");
  }
}

async function connectImageFolder() {
  if (!window.showDirectoryPicker) {
    setFileStatus("이 브라우저에서는 이미지 폴더 연결을 지원하지 않습니다. Chrome에서 GitHub Pages 주소로 열어 주세요.");
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    await storeHandle(IMAGE_FOLDER_HANDLE_KEY, handle);
    await loadImagesFromHandle(handle);
  } catch (error) {
    if (error?.name === "AbortError") return;
    setFileStatus(error.message || "이미지 폴더를 연결하지 못했습니다.");
  }
}

async function restoreConnectedImageFolder() {
  if (!window.showDirectoryPicker) return;
  try {
    const handle = await getStoredHandle(IMAGE_FOLDER_HANDLE_KEY);
    if (!handle) return;
    const allowed = await hasPermission(handle, false);
    if (!allowed) return;
    await loadImagesFromHandle(handle, { restored: true });
  } catch {
    setFileStatus("이전에 연결한 이미지 폴더를 다시 읽지 못했습니다. 이미지 폴더 연결을 다시 눌러 주세요.");
  }
}

async function loadImagesFromHandle(handle, options = {}) {
  const allowed = await verifyPermission(handle, false);
  if (!allowed) {
    setFileStatus("이미지 폴더를 읽을 권한이 없습니다. 이미지 폴더 연결을 다시 눌러 주세요.");
    return;
  }
  state.imageFolderHandle = handle;
  const count = await collectImageFiles(handle);
  render();
  setFileStatus(options.restored ? `이미지 폴더 ${count}개를 자동으로 다시 연결했습니다.` : `이미지 폴더에서 ${count}개를 연결했습니다.`);
}

async function loadCsvFromHandle(handle, options = {}) {
  const file = await handle.getFile();
  const text = await file.text();
  state.csvHandle = handle;
  state.csvFilename = file.name || "줍줍노트.csv";
  loadCsvText(text);
  setFileStatus(
    options.restored
      ? `${state.csvFilename}을 자동으로 다시 열었습니다. 수정하면 연결된 CSV에 반영됩니다.`
      : `${state.csvFilename}을 연결했습니다. 수정하면 연결된 CSV에 반영됩니다.`
  );
}

async function loadCsv() {
  const file = el.csvInput.files?.[0];
  if (!file) return;
  setFileStatus(`${file.name} 여는 중...`);
  try {
    const text = await file.text();
    state.csvHandle = null;
    state.csvFilename = file.name;
    loadCsvText(text);
    setFileStatus(
      state.clips.length
        ? `${file.name}에서 ${state.clips.length}개를 불러왔습니다.`
        : `${file.name}은 열렸지만 아직 수집 항목이 없습니다. 확장에서 먼저 줍줍해 주세요.`
    );
  } catch (error) {
    state.clips = [];
    state.visible = [];
    render();
    setFileStatus(error.message || "CSV를 읽지 못했습니다.");
  } finally {
    el.csvInput.value = "";
  }
}

function loadCsvText(text) {
  const rows = parseCsv(text);
  state.clips = rows.map(rowToClip);
  state.visible = [...state.clips].sort(sortNewest);
  resetFilters();
  applyFilters();
}

async function mergeCsv() {
  const file = el.mergeCsvInput.files?.[0];
  if (!file) return;
  setFileStatus(`${file.name} 합치는 중...`);
  try {
    const text = await file.text();
    mergeCsvText(text, "모바일 CSV");
  } catch (error) {
    setFileStatus(error.message || "모바일 CSV를 합치지 못했습니다.");
  } finally {
    el.mergeCsvInput.value = "";
  }
}

async function readClipboardCsv() {
  if (!navigator.clipboard?.readText) {
    setFileStatus("이 브라우저에서는 클립보드 읽기를 지원하지 않습니다. 직접 붙여넣어 주세요.");
    el.pasteCsvText.focus();
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    el.pasteCsvText.value = text;
    setFileStatus(text.trim() ? "클립보드의 CSV 내용을 붙여넣었습니다." : "클립보드가 비어 있습니다.");
  } catch {
    setFileStatus("클립보드 접근이 막혔습니다. 모바일에서 복사한 내용을 직접 붙여넣어 주세요.");
    el.pasteCsvText.focus();
  }
}

function mergePastedCsv() {
  const text = el.pasteCsvText.value.trim();
  if (!text) {
    setFileStatus("붙여넣은 CSV 내용이 없습니다.");
    el.pasteCsvText.focus();
    return;
  }
  try {
    mergeCsvText(text, "붙여넣은 CSV");
    el.pasteCsvText.value = "";
  } catch (error) {
    setFileStatus(error.message || "붙여넣은 CSV를 합치지 못했습니다.");
  }
}

function clearPastedCsv() {
  el.pasteCsvText.value = "";
  setFileStatus("붙여넣기 칸을 비웠습니다.");
}

function mergeCsvText(text, label) {
  const incoming = parseCsv(text).map(rowToClip);
  if (!incoming.length) {
    setFileStatus(`${label}에서 합칠 항목을 찾지 못했습니다.`);
    return;
  }
  const before = state.clips.length;
  state.clips = mergeClips(state.clips, incoming);
  resetFilters();
  applyFilters();
  scheduleAutoSave();
  const added = state.clips.length - before;
  if (state.csvHandle) {
    setFileStatus(`${label} ${incoming.length}개를 확인했고, 새 항목 ${added}개를 기존 CSV에 합쳤습니다. 자동 저장합니다.`);
  } else {
    setFileStatus(`${label} ${incoming.length}개를 확인했고, 새 항목 ${added}개를 화면에 합쳤습니다. 기존 CSV에 반영하려면 먼저 기존 CSV 연결을 눌러 주세요.`);
  }
}

function loadImages() {
  let count = 0;
  for (const file of el.imageInput.files || []) {
    if (file.type && !file.type.startsWith("image/")) continue;
    const url = URL.createObjectURL(file);
    const relativePath = file.webkitRelativePath || file.name;
    state.imageUrls.set(file.name, url);
    state.imageUrls.set(relativePath, url);
    state.imageUrls.set(relativePath.split("/").slice(-2).join("/"), url);
    count += 1;
  }
  render();
  if (count) setFileStatus(`이미지 폴더에서 ${count}개를 연결했습니다.`);
  el.imageInput.value = "";
}

async function collectImageFiles(directoryHandle, prefix = "") {
  let count = 0;
  for await (const [name, handle] of directoryHandle.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      count += await collectImageFiles(handle, relativePath);
      continue;
    }
    const file = await handle.getFile();
    if (file.type && !file.type.startsWith("image/")) continue;
    const url = URL.createObjectURL(file);
    state.imageUrls.set(name, url);
    state.imageUrls.set(relativePath, url);
    state.imageUrls.set(relativePath.split("/").slice(-2).join("/"), url);
    count += 1;
  }
  return count;
}

function applyFilters() {
  const query = el.search.value.trim().toLowerCase();
  const contentType = el.typeFilter.value;
  const status = el.statusFilter.value;
  const useFor = el.useForFilter.value;
  const tag = el.tagFilter.value.trim();
  const excludeDone = el.excludeDone.checked;

  state.visible = state.clips.filter((clip) => {
    const haystack = [
      clip.sentence,
      clip.contentType,
      clip.reason,
      clip.connection,
      clip.title,
      clip.tags,
      clip.siteName,
      clip.source
    ].join(" ").toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (contentType && clip.contentType !== contentType) return false;
    if (status && clip.status !== status) return false;
    if (excludeDone && clip.status === "정리 완료") return false;
    if (useFor && clip.useFor !== useFor) return false;
    if (tag && !clip.tags.includes(tag.startsWith("#") ? tag : `#${tag}`)) return false;
    if (state.activeDate && dateKey(clip.createdAt) !== state.activeDate) return false;
    if (state.activeRange && !matchesActiveRange(clip)) return false;
    if (state.favoriteOnly && !clip.favorite) return false;
    return true;
  }).sort(sortNewest);
  render();
}

function showAll() {
  resetFilters();
  applyFilters();
  setFileStatus(state.clips.length ? `전체 ${state.visible.length}개를 보여줍니다.` : "아직 열려 있는 CSV 항목이 없습니다.");
}

function showToday() {
  showRange("today");
}

function showWeek() {
  showRange("week");
}

function showMonth() {
  showRange("month");
}

function showYear() {
  showRange("year");
}

function showPending() {
  resetFilters();
  el.statusFilter.value = "새로 수집";
  applyFilters();
  setFileStatus(`정리 대기 항목 ${state.visible.length}개를 보여줍니다.`);
}

function showDone() {
  resetFilters();
  el.statusFilter.value = "정리 완료";
  applyFilters();
  setFileStatus(`정리 완료 항목 ${state.visible.length}개를 보여줍니다.`);
}

function showStarred() {
  resetFilters();
  state.favoriteOnly = true;
  applyFilters();
  setFileStatus(`별표 항목 ${state.visible.length}개를 보여줍니다.`);
}

function showRange(range) {
  resetFilterControls();
  state.activeDate = "";
  state.activeRange = range;
  state.favoriteOnly = false;
  applyFilters();
  setFileStatus(`${RANGE_LABELS[range]} 항목 ${state.visible.length}개를 보여줍니다.`);
}

function showType(contentType) {
  resetFilters();
  el.typeFilter.value = contentType;
  applyFilters();
  setFileStatus(`${contentType} 항목 ${state.visible.length}개를 보여줍니다.`);
}

function hideOnboarding() {
  el.onboarding.hidden = true;
  el.showOnboarding.hidden = false;
  localStorage.setItem("zzupzzup:onboardingHidden", "1");
}

function showOnboarding() {
  el.onboarding.hidden = false;
  el.showOnboarding.hidden = true;
  localStorage.removeItem("zzupzzup:onboardingHidden");
}

function restoreOnboarding() {
  const hidden = localStorage.getItem("zzupzzup:onboardingHidden") === "1";
  el.onboarding.hidden = hidden;
  el.showOnboarding.hidden = !hidden;
}

function restoreExcludeDone() {
  el.excludeDone.checked = localStorage.getItem(EXCLUDE_DONE_KEY) === "1";
}

function toggleExcludeDone() {
  localStorage.setItem(EXCLUDE_DONE_KEY, el.excludeDone.checked ? "1" : "0");
  applyFilters();
  setFileStatus(el.excludeDone.checked ? "정리 완료 항목을 목록에서 숨깁니다." : "정리 완료 항목도 함께 보여줍니다.");
}

function toggleCalendar() {
  state.calendarOpen = !state.calendarOpen;
  renderCalendar();
}

function render() {
  const clips = state.visible.length || state.clips.length ? state.visible : [];
  renderStats();
  renderCalendar();
  el.cards.replaceChildren();

  if (!clips.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "줍줍노트.csv를 열면 문장, 링크, 이미지, 동영상, 자료가 여기에 모입니다.";
    el.cards.append(empty);
    return;
  }

  el.cards.append(...clips.map(cardView));
}

function renderStats() {
  const total = state.clips.length;
  const todayCount = state.clips.filter(isToday).length;
  const weekCount = state.clips.filter(isThisWeek).length;
  const monthCount = state.clips.filter(isThisMonth).length;
  const yearCount = state.clips.filter(isThisYear).length;
  el.stats.replaceChildren(
    statView("전체", total, showAll),
    statView("오늘 수집", todayCount, () => showRange("today")),
    statView("이번 주", weekCount, () => showRange("week")),
    statView("이번 달", monthCount, () => showRange("month")),
    statView("올해", yearCount, () => showRange("year")),
    statView("정리 대기", countByStatus("새로 수집"), showPending),
    statView("정리 완료", countByStatus("정리 완료"), showDone),
    statView("별표", countFavorite(), showStarred),
    statView("문장", countByType("문장"), () => showType("문장")),
    statView("링크", countByType("링크"), () => showType("링크")),
    statView("이미지", countByType("이미지"), () => showType("이미지")),
    statView("동영상", countByType("동영상"), () => showType("동영상")),
    statView("자료", countByType("자료"), () => showType("자료"))
  );
}

function statView(label, value, onClick) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "stat";
  item.setAttribute("aria-label", `${label} ${value}개 보기`);
  item.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
  if (onClick) item.addEventListener("click", onClick);
  return item;
}

function cardView(clip) {
  const card = document.createElement("article");
  card.className = "card";
  if (clip.status === "정리 완료") card.classList.add("is-done");
  if (clip.favorite) card.classList.add("is-favorite");
  card.tabIndex = 0;
  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    openDetail(clip.id);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openDetail(clip.id);
  });

  const imageSrc = resolveImage(clip);
  const star = document.createElement("button");
  star.type = "button";
  star.className = clip.favorite ? "star-toggle is-on" : "star-toggle";
  star.setAttribute("aria-label", clip.favorite ? "별표 해제" : "별표 표시");
  star.textContent = clip.favorite ? "★" : "☆";
  star.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(clip.id);
  });
  card.append(star);

  if (imageSrc) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = imageSrc;
    img.alt = clip.title || "줍줍 이미지";
    card.append(img);
  } else if (clip.source) {
    card.append(cardEmbedView(clip));
  }

  const body = document.createElement("div");
  body.className = "card-body";
  const badges = document.createElement("div");
  badges.className = "badges";
  badges.append(badgeView(clip.contentType || "링크"));
  badges.append(badgeView(clip.status || "새로 수집", clip.status === "정리 완료" ? "done" : ""));
  body.append(
    badges,
    textEl("p", "sentence", clip.sentence || clip.title || clip.source || "주운 정보"),
    textEl("p", "reason", clip.reason),
    textEl("p", "meta", `${clip.contentType || "링크"} · ${clip.useFor || "활용처 없음"} · ${clip.action || "액션 없음"}`),
    sourceView(clip),
    linkView(clip),
    tagsView(clip.tags)
  );
  card.append(body);
  return card;
}

function badgeView(text, modifier = "") {
  const badge = document.createElement("span");
  badge.className = modifier ? `badge ${modifier}` : "badge";
  badge.textContent = text;
  return badge;
}

function cardEmbedView(clip) {
  const embed = document.createElement("div");
  embed.className = "card-embed";
  if (clip.iconUrl) {
    const icon = document.createElement("img");
    icon.src = clip.iconUrl;
    icon.alt = "";
    embed.append(icon);
  }
  const text = document.createElement("div");
  text.append(
    textEl("strong", "", clip.title || clip.siteName || clip.contentType || "수집 링크"),
    textEl("span", "", clip.source)
  );
  embed.append(text);
  return embed;
}

function sourceView(clip) {
  const item = document.createElement("div");
  item.className = "source";
  if (clip.iconUrl) {
    const icon = document.createElement("img");
    icon.src = clip.iconUrl;
    icon.alt = "";
    item.append(icon);
  }
  const text = document.createElement("span");
  text.textContent = [clip.siteName, clip.title].filter(Boolean).join(" · ") || "출처 없음";
  item.append(text);
  return item;
}

function linkView(clip) {
  const links = document.createElement("div");
  links.className = "card-links";
  if (clip.source) links.append(anchorView(sourceLinkLabel(clip), clip.source));
  if (clip.imageUrl) links.append(anchorView("이미지 원본", clip.imageUrl));
  if (clip.imagePath) {
    const local = document.createElement("span");
    local.className = "local-path";
    local.textContent = clip.imagePath;
    links.append(local);
  }
  return links;
}

function sourceLinkLabel(clip) {
  if (clip.contentType === "문장") return "출처 열기";
  if (clip.contentType === "동영상") return "동영상 열기";
  if (clip.contentType === "자료") return "자료 열기";
  return "링크 열기";
}

function renderCalendar() {
  el.calendar.hidden = !state.calendarOpen;
  if (!state.calendarOpen) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const counts = new Map();
  for (const clip of state.clips) {
    const key = dateKey(clip.createdAt);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }

  el.calendar.replaceChildren();
  const title = document.createElement("div");
  title.className = "calendar-title";
  title.textContent = `${year}.${String(month + 1).padStart(2, "0")}`;
  el.calendar.append(title);

  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  ["일", "월", "화", "수", "목", "금", "토"].forEach((label) => {
    const day = document.createElement("span");
    day.className = "calendar-weekday";
    day.textContent = label;
    grid.append(day);
  });

  for (let i = 0; i < first.getDay(); i += 1) {
    grid.append(document.createElement("span"));
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const button = document.createElement("button");
    button.className = "calendar-day";
    if (state.activeDate === key) button.classList.add("is-active");
    button.textContent = day;
    const count = counts.get(key) || 0;
    if (count) {
      const badge = document.createElement("span");
      badge.textContent = count;
      button.append(badge);
    }
    button.addEventListener("click", () => {
      resetFilterControls();
      state.activeDate = key;
      state.activeRange = "";
      state.favoriteOnly = false;
      applyFilters();
      setFileStatus(`${key}에 수집한 항목 ${state.visible.length}개를 보여줍니다.`);
    });
    grid.append(button);
  }

  el.calendar.append(grid);
}

function openDetail(id) {
  const clip = state.clips.find((item) => item.id === id);
  if (!clip) return;
  state.editingId = id;
  el.detailHeading.textContent = clip.title || clip.sentence || clip.source || "수집 상세";
  el.detailText.value = clip.sentence || "";
  el.detailSource.value = clip.source || "";
  el.detailTitle.value = clip.title || "";
  el.detailImageUrl.value = clip.imageUrl || "";
  el.detailImagePath.value = clip.imagePath || "";
  el.detailType.value = clip.contentType || "링크";
  el.detailStatus.value = clip.status || "새로 수집";
  el.detailDone.checked = clip.status === "정리 완료";
  el.detailFavorite.checked = Boolean(clip.favorite);
  el.detailReason.value = clip.reason || "";
  el.detailConnection.value = clip.connection || "";
  el.detailUseFor.value = clip.useFor || "정리필요";
  el.detailAction.value = clip.action || "정리필요";
  el.detailTags.value = clip.tags || "";
  renderDetailEmbed(clip);
  el.detailDialog.showModal();
}

function renderDetailEmbed(clip) {
  el.detailEmbed.replaceChildren();
  const imageSrc = resolveImage(clip);
  if (imageSrc) {
    const image = document.createElement("img");
    image.src = imageSrc;
    image.alt = clip.title || "수집 이미지";
    el.detailEmbed.append(image);
  }

  const box = document.createElement("div");
  box.className = "embed-card";
  box.append(
    textEl("strong", "", clip.title || clip.siteName || clip.contentType || "수집 정보"),
    textEl("span", "", clip.source || "링크 없음")
  );
  if (clip.source) box.append(anchorView("원본 열기", clip.source));
  if (clip.imageUrl) box.append(anchorView("이미지 원본 열기", clip.imageUrl));
  if (clip.imagePath) box.append(textEl("span", "local-path", clip.imagePath));
  el.detailEmbed.append(box);
}

function saveDetail(event) {
  event.preventDefault();
  const clip = state.clips.find((item) => item.id === state.editingId);
  if (!clip) return;
  clip.sentence = el.detailText.value;
  clip.source = el.detailSource.value;
  clip.title = el.detailTitle.value;
  clip.imageUrl = el.detailImageUrl.value;
  clip.imagePath = el.detailImagePath.value;
  clip.contentType = el.detailType.value;
  clip.status = el.detailDone.checked ? "정리 완료" : el.detailStatus.value;
  clip.favorite = el.detailFavorite.checked;
  clip.reason = el.detailReason.value;
  clip.connection = el.detailConnection.value;
  clip.useFor = el.detailUseFor.value;
  clip.action = el.detailAction.value;
  clip.tags = el.detailTags.value;
  clip.reviewCount = Number(clip.reviewCount || 0) + 1;
  clip.lastReviewed = new Date().toISOString();
  el.detailDialog.close();
  applyFilters();
  scheduleAutoSave();
  setFileStatus(state.csvHandle ? "카드에 반영했습니다. 연결된 CSV에 자동 저장합니다." : "카드에 반영했습니다. 저장하려면 CSV 저장을 눌러 주세요.");
}

function deleteDetail(event) {
  event.preventDefault();
  const clip = state.clips.find((item) => item.id === state.editingId);
  if (!clip) return;
  const title = clip.title || clip.sentence || clip.source || "이 항목";
  if (!confirm(`"${title}"을 삭제할까요?`)) return;
  state.clips = state.clips.filter((item) => item.id !== state.editingId);
  state.visible = state.visible.filter((item) => item.id !== state.editingId);
  state.editingId = "";
  el.detailDialog.close();
  applyFilters();
  scheduleAutoSave();
  setFileStatus(state.csvHandle ? "항목을 삭제했습니다. 연결된 CSV에 자동 저장합니다." : "항목을 삭제했습니다. 변경사항을 보존하려면 CSV 저장을 눌러 주세요.");
}

function anchorView(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
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

function resolveImage(clip) {
  if (clip.imagePath) {
    const filename = clip.imagePath.split("/").pop();
    if (state.imageUrls.has(clip.imagePath)) return state.imageUrls.get(clip.imagePath);
    if (state.imageUrls.has(filename)) return state.imageUrls.get(filename);
  }
  return clip.imageUrl || "";
}

function rowToClip(row) {
  return {
    id: row["id"] || "",
    createdAt: row["수집 일시"] || "",
    contentType: normalizeContentType(row["유형"], row),
    sentence: row["주운 글"] || row["문장"] || "",
    reason: row["수집한 이유"] || "",
    connection: row["연결/확장"] || "",
    useFor: row["활용처"] || "",
    action: row["다음 액션"] || "",
    source: row["출처"] || "",
    siteName: row["사이트명"] || "",
    iconUrl: row["아이콘 URL"] || "",
    imagePath: row["이미지 경로"] || "",
    imageUrl: row["이미지 URL"] || "",
    title: row["제목"] || "",
    tags: row["태그"] || "",
    status: row["상태"] || "",
    favorite: parseFavorite(row["별표"] || row["즐겨찾기"] || row["좋아요"] || ""),
    reviewCount: row["확인 횟수"] || "",
    lastReviewed: row["마지막 확인"] || ""
  };
}

function resetFilters() {
  resetFilterControls();
  clearTimeFilters();
}

function resetFilterControls() {
  el.search.value = "";
  el.typeFilter.value = "";
  el.statusFilter.value = "";
  el.useForFilter.value = "";
  el.tagFilter.value = "";
}

function clearTimeFilters() {
  state.activeDate = "";
  state.activeRange = "";
  state.favoriteOnly = false;
}

function countByType(contentType) {
  return state.clips.filter((clip) => clip.contentType === contentType).length;
}

function countByStatus(status) {
  return state.clips.filter((clip) => clip.status === status).length;
}

function countFavorite() {
  return state.clips.filter((clip) => clip.favorite).length;
}

function toggleFavorite(id) {
  const clip = state.clips.find((item) => item.id === id);
  if (!clip) return;
  clip.favorite = !clip.favorite;
  applyFilters();
  scheduleAutoSave();
  setFileStatus(clip.favorite ? saveHint("별표를 표시했습니다.") : saveHint("별표를 해제했습니다."));
}

function saveHint(message) {
  return state.csvHandle ? `${message} 연결된 CSV에 자동 저장합니다.` : `${message} 저장하려면 CSV 저장을 눌러 주세요.`;
}

function parseFavorite(value) {
  return ["true", "1", "yes", "y", "예", "좋아요", "별표", "★"].includes(String(value || "").trim().toLowerCase());
}

function normalizeContentType(value, row = {}) {
  if (value) return value;
  if (row["이미지 경로"] || row["이미지 URL"]) return "이미지";
  if (row["문장"]) return "문장";
  if (row["출처"]) return "링크";
  return "자료";
}

function setFileStatus(message) {
  el.fileStatus.textContent = message;
}

function renderClock() {
  const now = new Date();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  el.todayText.textContent = `${year}.${month}.${day} ${weekdays[now.getDay()]}요일`;
  el.clockText.textContent = `${hours}:${minutes}`;
  el.clockPanel.dateTime = now.toISOString();
}

function dateKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function matchesActiveRange(clip) {
  if (state.activeRange === "today") return isToday(clip);
  if (state.activeRange === "week") return isThisWeek(clip);
  if (state.activeRange === "month") return isThisMonth(clip);
  if (state.activeRange === "year") return isThisYear(clip);
  return true;
}

function isToday(clip) {
  if (!clip.createdAt) return false;
  const date = new Date(clip.createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function isThisWeek(clip) {
  if (!clip.createdAt) return false;
  const date = new Date(clip.createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < nextWeekStart;
}

function isThisMonth(clip) {
  if (!clip.createdAt) return false;
  const date = new Date(clip.createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth();
}

function isThisYear(clip) {
  if (!clip.createdAt) return false;
  const date = new Date(clip.createdAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === new Date().getFullYear();
}

function startOfWeek(date) {
  const output = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = output.getDay() || 7;
  output.setDate(output.getDate() - day + 1);
  output.setHours(0, 0, 0, 0);
  return output;
}

function sortNewest(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const clean = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    const next = clean[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
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
    clip.sentence,
    clip.imageUrl
  ].filter(Boolean).join("|") || crypto.randomUUID();
}

async function downloadCsv() {
  if (state.csvHandle) {
    const saved = await saveConnectedCsv();
    if (saved) return;
  }
  downloadClipsCsv(state.clips, "줍줍노트.csv");
}

function downloadPendingCsv() {
  const pending = state.clips.filter((clip) => clip.status !== "정리 완료");
  if (!pending.length) {
    setFileStatus("정리 완료 제외 후 내보낼 항목이 없습니다.");
    return;
  }
  downloadClipsCsv(pending, "줍줍노트-정리대기.csv");
}

function downloadDoneCsv() {
  const done = state.clips.filter((clip) => clip.status === "정리 완료");
  if (!done.length) {
    setFileStatus("정리 완료된 항목이 아직 없습니다.");
    return;
  }
  downloadClipsCsv(done, "줍줍노트-정리완료.csv");
}

function downloadClipsCsv(clips, filename) {
  const csv = clipsToCsvText(clips);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  setFileStatus(`${filename}을 내보냈습니다.`);
}

function clipsToCsvText(clips) {
  const rows = clips.map((clip) => [
    clip.id,
    clip.createdAt,
    clip.contentType,
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

function scheduleAutoSave() {
  if (!state.csvHandle) return;
  window.clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = window.setTimeout(saveConnectedCsv, 500);
}

async function saveConnectedCsv() {
  if (!state.csvHandle) return false;
  const allowed = await verifyPermission(state.csvHandle, true);
  if (!allowed) {
    setFileStatus("연결된 CSV에 쓸 권한이 없습니다. CSV 연결을 다시 눌러 권한을 허용해 주세요.");
    return false;
  }
  try {
    const writable = await state.csvHandle.createWritable();
    await writable.write(`\uFEFF${clipsToCsvText(state.clips)}`);
    await writable.close();
    setFileStatus(`${state.csvFilename || "줍줍노트.csv"}에 변경사항을 저장했습니다.`);
    return true;
  } catch (error) {
    setFileStatus(error.message || "연결된 CSV에 저장하지 못했습니다. CSV 저장으로 파일을 내려받아 주세요.");
    return false;
  }
}

async function copyNotionMarkdown() {
  const markdown = buildNotionMarkdown(state.clips);
  if (!markdown.trim()) {
    setFileStatus("복사할 항목이 없습니다.");
    return;
  }
  try {
    await navigator.clipboard.writeText(markdown);
    setFileStatus("Notion에 붙여넣을 Markdown을 복사했습니다.");
  } catch {
    downloadText("줍줍노트-notion.md", markdown, "text/markdown;charset=utf-8");
    setFileStatus("클립보드 복사가 막혀 Markdown 파일로 내보냈습니다.");
  }
}

function buildNotionMarkdown(clips) {
  return clips.map((clip) => [
    `## ${clip.title || clip.sentence || clip.source || "수집 항목"}`,
    `- 유형: ${clip.contentType || ""}`,
    `- 상태: ${clip.status || ""}`,
    `- 별표: ${clip.favorite ? "TRUE" : "FALSE"}`,
    `- 활용처: ${clip.useFor || ""}`,
    `- 다음 액션: ${clip.action || ""}`,
    `- 링크: ${clip.source || ""}`,
    `- 수집한 이유: ${clip.reason || ""}`,
    `- 연결/확장: ${clip.connection || ""}`,
    `- 태그: ${clip.tags || ""}`,
    "",
    clip.sentence || "",
    ""
  ].join("\n")).join("\n");
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
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
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

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
