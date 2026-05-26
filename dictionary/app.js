import {
  clearCloudSession,
  fetchCloudClips,
  getCloudSettings,
  hasCloudSession,
  saveCloudSettings,
  signInToCloud
} from "../shared/supabase-store.js";

const state = {
  clips: [],
  activeTag: "",
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
  search: document.querySelector("#search"),
  showAll: document.querySelector("#showAll"),
  tagList: document.querySelector("#tagList"),
  activeTag: document.querySelector("#activeTag"),
  count: document.querySelector("#count"),
  entries: document.querySelector("#entries")
};

el.cloudSave.addEventListener("click", saveCloudConfig);
el.cloudLogin.addEventListener("click", loginCloud);
el.cloudLogout.addEventListener("click", logoutCloud);
el.cloudPull.addEventListener("click", pullCloud);
el.search.addEventListener("input", () => {
  state.query = el.search.value.trim().toLowerCase();
  render();
});
el.showAll.addEventListener("click", () => {
  state.activeTag = "";
  render();
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
  state.clips = [];
  setCloudStatus("이 브라우저에서 로그아웃했습니다.");
  render();
}

async function autoPullCloud() {
  if (!hasCloudSession()) return;
  try {
    await pullCloud({ quiet: true });
  } catch (error) {
    setCloudStatus(error.message || "Supabase 데이터를 자동으로 불러오지 못했습니다.");
  }
}

async function pullCloud(options = {}) {
  if (!hasCloudSession()) {
    setCloudStatus("먼저 Supabase에 로그인해 주세요.");
    return;
  }
  if (!options.quiet) setCloudStatus("Supabase에서 불러오는 중...");
  state.clips = await fetchCloudClips();
  render();
  setCloudStatus(`태그 사전용 항목 ${state.clips.length}개를 불러왔습니다.`);
}

function render() {
  const tags = tagStats();
  el.tagList.replaceChildren(...tags.map(tagButton));
  if (!tags.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "아직 태그가 없습니다. 웹홈이나 문장/사진에서 태그를 붙이면 여기에 사전처럼 모입니다.";
    el.tagList.append(empty);
  }

  const entries = filteredEntries();
  el.activeTag.textContent = state.activeTag || "전체 태그";
  el.count.textContent = String(entries.length);
  el.entries.replaceChildren(...entries.map(entryCard));
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "연결된 항목이 없습니다.";
    el.entries.append(empty);
  }
}

function tagStats() {
  const counts = new Map();
  state.clips.forEach((clip) => parseTags(clip.tags).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
  return [...counts.entries()]
    .filter(([tag]) => !state.query || tag.toLowerCase().includes(state.query) || entriesForTag(tag).some(matchesQuery))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

function tagButton([tag, count]) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = tag === state.activeTag ? "tag-button is-active" : "tag-button";
  button.append(textEl("span", "", tag), textEl("strong", "", String(count)));
  button.addEventListener("click", () => {
    state.activeTag = tag;
    render();
  });
  return button;
}

function filteredEntries() {
  const source = state.activeTag ? entriesForTag(state.activeTag) : state.clips;
  return source
    .filter((clip) => !state.query || matchesQuery(clip))
    .slice(0, 120);
}

function entriesForTag(tag) {
  return state.clips.filter((clip) => parseTags(clip.tags).includes(tag));
}

function matchesQuery(clip) {
  return [
    clip.contentType,
    clip.title,
    clip.sentence,
    clip.reason,
    clip.source,
    clip.siteName,
    Array.isArray(clip.tags) ? clip.tags.join(" ") : clip.tags
  ].join(" ").toLowerCase().includes(state.query);
}

function entryCard(clip) {
  const card = document.createElement("article");
  card.className = "entry-card";
  card.append(
    textEl("span", "type", clip.contentType || "자료"),
    textEl("h3", "", clip.title || clip.sentence || clip.source || "주운 정보")
  );
  if (clip.imageUrl) {
    const image = document.createElement("img");
    image.src = clip.imageUrl;
    image.alt = clip.title || "주운 이미지";
    card.append(image);
  }
  if (clip.sentence) card.append(textEl("p", "sentence", clip.sentence));
  if (clip.reason) card.append(textEl("p", "reason", clip.reason));
  card.append(tagsView(clip.tags));
  if (clip.source) {
    const link = document.createElement("a");
    link.href = clip.source;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "원본 열기";
    card.append(link);
  }
  return card;
}

function parseTags(tags) {
  return [...new Set(String(Array.isArray(tags) ? tags.join(" ") : tags || "")
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.startsWith("#") ? tag : `#${tag}`))];
}

function tagsView(tags) {
  const wrap = document.createElement("div");
  wrap.className = "tags";
  parseTags(tags).forEach((tag) => wrap.append(textEl("span", "", tag)));
  return wrap;
}

function textEl(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className || "";
  node.textContent = text || "";
  return node;
}

function setCloudStatus(message) {
  el.cloudStatus.textContent = message;
}
