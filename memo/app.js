import {
  clearCloudSession,
  deleteCloudClip,
  fetchCloudClips,
  getCloudSettings,
  hasCloudSession,
  saveCloudSettings,
  signInToCloud,
  updateCloudClip,
  upsertCloudClips
} from "../shared/supabase-store.js";

const STORAGE_KEY = "zzupzzup:memo";
const MEMO_TAG = "#멤모";

const state = {
  memos: [],
  editingId: "",
  query: ""
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
  cloudAdvanced: document.querySelector(".cloud-advanced"),
  newMemo: document.querySelector("#newMemo"),
  titleInput: document.querySelector("#titleInput"),
  memoInput: document.querySelector("#memoInput"),
  tagsInput: document.querySelector("#tagsInput"),
  saveMemo: document.querySelector("#saveMemo"),
  deleteMemo: document.querySelector("#deleteMemo"),
  search: document.querySelector("#search"),
  count: document.querySelector("#count"),
  memoList: document.querySelector("#memoList")
};

el.cloudSave.addEventListener("click", saveCloudConfig);
el.cloudLogin.addEventListener("click", loginCloud);
el.cloudLogout.addEventListener("click", logoutCloud);
el.cloudPull.addEventListener("click", pullCloud);
el.newMemo.addEventListener("click", clearEditor);
el.saveMemo.addEventListener("click", saveMemo);
el.deleteMemo.addEventListener("click", deleteMemo);
el.search.addEventListener("input", () => {
  state.query = el.search.value.trim().toLowerCase();
  render();
});
el.memoList.addEventListener("click", openMemoFromList);
el.tagsInput.addEventListener("input", () => renderTagSuggestions(el.tagsInput));
el.tagsInput.addEventListener("blur", () => {
  el.tagsInput.value = normalizeTags(el.tagsInput.value);
});

restoreCloudConfig();
state.memos = loadLocalMemos();
render();
autoPullCloud();

function restoreCloudConfig() {
  const settings = getCloudSettings();
  el.cloudUrl.value = settings.url || "";
  el.cloudAnonKey.value = settings.anonKey || "";
  el.cloudEmail.value = settings.email || "";
  el.cloudPassword.value = settings.password || "";
  if (el.cloudAdvanced) el.cloudAdvanced.open = !settings.anonKey;
  setCloudStatus(hasCloudSession(settings) ? "Supabase에 로그인되어 있습니다." : "이메일/비밀번호로 로그인해 주세요.");
}

function saveCloudConfig() {
  saveCloudSettings({
    url: el.cloudUrl.value,
    anonKey: el.cloudAnonKey.value,
    email: el.cloudEmail.value,
    password: el.cloudPassword.value
  });
  setCloudStatus("Supabase 설정을 저장했습니다.");
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
    await pullCloud();
  } catch (error) {
    setCloudStatus(error.message || "Supabase에 로그인하지 못했습니다.");
  }
}

function logoutCloud() {
  clearCloudSession();
  setCloudStatus("이 브라우저에서 로그아웃했습니다.");
}

async function autoPullCloud() {
  if (!hasCloudSession()) return;
  try {
    await pullCloud({ quiet: true });
  } catch (error) {
    setCloudStatus(error.message || "Supabase 메모를 자동으로 불러오지 못했습니다.");
  }
}

async function pullCloud(options = {}) {
  if (!hasCloudSession()) {
    setCloudStatus("먼저 Supabase에 로그인해 주세요.");
    return;
  }
  if (!options.quiet) setCloudStatus("Supabase에서 메모를 불러오는 중...");
  const clips = await fetchCloudClips();
  const memos = clips.filter(isMemoClip);
  state.memos = mergeMemos(state.memos, memos);
  saveLocalMemos();
  render();
  setCloudStatus(`메모 ${memos.length}개를 불러왔습니다.`);
}

async function saveMemo() {
  const body = normalizeMultiline(el.memoInput.value);
  const title = el.titleInput.value.trim();
  if (!body && !title) {
    setCloudStatus("저장할 메모를 입력해 주세요.");
    el.memoInput.focus();
    return;
  }
  const editingId = state.editingId;
  const memo = {
    id: editingId || crypto.randomUUID(),
    createdAt: editingId ? currentMemo()?.createdAt || new Date().toISOString() : new Date().toISOString(),
    contentType: "자료",
    sentence: body,
    reason: "",
    connection: "",
    useFor: "정리필요",
    action: "정리필요",
    source: "",
    siteName: "",
    iconUrl: "",
    imagePath: "",
    imageUrl: "",
    title,
    tags: normalizeTags(`${el.tagsInput.value} ${MEMO_TAG}`),
    status: "새로 수집",
    favorite: false,
    reviewCount: Number(currentMemo()?.reviewCount || 0) + 1,
    lastReviewed: new Date().toISOString()
  };
  upsertMemo(memo);
  saveLocalMemos();
  render();
  clearEditor();
  if (!hasCloudSession()) {
    setCloudStatus("이 기기에 메모를 저장했습니다. 로그인하면 서버에도 저장됩니다.");
    return;
  }
  try {
    const saved = editingId ? [await updateCloudClip(memo)] : await upsertCloudClips([memo]);
    upsertMemo(saved[0] || memo);
    saveLocalMemos();
    render();
    setCloudStatus("메모를 Supabase에 저장했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "Supabase에 메모를 저장하지 못했습니다.");
  }
}

async function deleteMemo() {
  const memo = currentMemo();
  if (!memo) return;
  if (!confirm("이 메모를 삭제할까요?")) return;
  state.memos = state.memos.filter((item) => item.id !== memo.id);
  saveLocalMemos();
  clearEditor();
  render();
  if (!hasCloudSession()) {
    setCloudStatus("이 기기에서 메모를 삭제했습니다.");
    return;
  }
  try {
    await deleteCloudClip(memo.id);
    setCloudStatus("Supabase에서도 메모를 삭제했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "Supabase 메모를 삭제하지 못했습니다.");
  }
}

function openMemoFromList(event) {
  const card = event.target.closest(".memo-card");
  if (!card) return;
  const memo = state.memos.find((item) => item.id === card.dataset.id);
  if (!memo) return;
  state.editingId = memo.id;
  el.titleInput.value = memo.title || "";
  el.memoInput.value = memo.sentence || "";
  el.tagsInput.value = normalizeTags(memo.tags);
  el.deleteMemo.hidden = false;
  renderTagSuggestions(el.tagsInput);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearEditor() {
  state.editingId = "";
  el.titleInput.value = "";
  el.memoInput.value = "";
  el.tagsInput.value = MEMO_TAG;
  el.deleteMemo.hidden = true;
  renderTagSuggestions(el.tagsInput);
}

function render() {
  const memos = filteredMemos();
  el.count.textContent = String(memos.length);
  el.memoList.replaceChildren(...memos.map(memoCard));
  if (!memos.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "아직 메모가 없습니다.";
    el.memoList.append(empty);
  }
}

function memoCard(memo) {
  const card = document.createElement("article");
  card.className = "memo-card";
  card.dataset.id = memo.id;
  card.append(
    textEl("span", "type", "memo"),
    textEl("h3", "", memo.title || "제목 없는 메모"),
    textEl("p", "memo-body", memo.sentence || ""),
    tagsView(memo.tags),
    textEl("time", "", formatDate(memo.createdAt))
  );
  return card;
}

function filteredMemos() {
  return state.memos
    .filter((memo) => !state.query || [
      memo.title,
      memo.sentence,
      memo.tags
    ].join(" ").toLowerCase().includes(state.query))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function isMemoClip(clip) {
  return parseTags(clip.tags).includes(MEMO_TAG);
}

function currentMemo() {
  return state.memos.find((memo) => memo.id === state.editingId) || null;
}

function upsertMemo(memo) {
  const index = state.memos.findIndex((item) => item.id === memo.id);
  if (index >= 0) state.memos[index] = memo;
  else state.memos.unshift(memo);
}

function mergeMemos(current, incoming) {
  const output = [...current];
  incoming.forEach((memo) => {
    const index = output.findIndex((item) => item.id === memo.id);
    if (index >= 0) output[index] = memo;
    else output.push(memo);
  });
  return output;
}

function loadLocalMemos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalMemos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.memos));
}

function parseTags(tags) {
  return normalizeTags(tags).split(/\s+/).filter(Boolean);
}

function normalizeTags(tags) {
  return [...new Set(String(Array.isArray(tags) ? tags.join(" ") : tags || "")
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.startsWith("#") ? tag : `#${tag}`))]
    .join(" ");
}

function tagsView(tags) {
  const wrap = document.createElement("div");
  wrap.className = "tags";
  parseTags(tags).forEach((tag) => wrap.append(textEl("span", "", tag)));
  return wrap;
}

function tagPool() {
  return [...new Set(state.memos.flatMap((memo) => parseTags(memo.tags)))]
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

function normalizeMultiline(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function textEl(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className || "";
  node.textContent = text || "";
  return node;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function setCloudStatus(message) {
  el.cloudStatus.textContent = message;
}
