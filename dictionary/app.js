import {
  clearCloudSession,
  deleteCloudClip,
  fetchCloudClips,
  getCloudSettings,
  hasCloudSession,
  saveCloudSettings,
  signInToCloud,
  updateCloudClip
} from "../shared/supabase-store.js";

const state = {
  clips: [],
  activeTag: "",
  query: "",
  editingId: "",
  page: 1
};

const PAGE_SIZE = 10;

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
  entries: document.querySelector("#entries"),
  detailDialog: document.querySelector("#detailDialog"),
  detailHeading: document.querySelector("#detailHeading"),
  detailPreview: document.querySelector("#detailPreview"),
  detailType: document.querySelector("#detailType"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSentence: document.querySelector("#detailSentence"),
  detailReason: document.querySelector("#detailReason"),
  detailSource: document.querySelector("#detailSource"),
  detailImageUrl: document.querySelector("#detailImageUrl"),
  detailTags: document.querySelector("#detailTags"),
  detailStatus: document.querySelector("#detailStatus"),
  detailFavorite: document.querySelector("#detailFavorite"),
  detailSave: document.querySelector("#detailSave"),
  detailDelete: document.querySelector("#detailDelete")
};

el.cloudSave.addEventListener("click", saveCloudConfig);
el.cloudLogin.addEventListener("click", loginCloud);
el.cloudLogout.addEventListener("click", logoutCloud);
el.cloudPull.addEventListener("click", pullCloud);
el.search.addEventListener("input", () => {
  state.query = el.search.value.trim().toLowerCase();
  state.page = 1;
  render();
});
el.showAll.addEventListener("click", () => {
  state.activeTag = "";
  state.page = 1;
  render();
});
el.entries.addEventListener("click", handleEntryClick);
el.detailSave.addEventListener("click", saveDetail);
el.detailDelete.addEventListener("click", deleteDetail);
el.detailTags.addEventListener("input", () => renderTagSuggestions(el.detailTags));
el.detailTags.addEventListener("blur", () => {
  el.detailTags.value = normalizeTags(el.detailTags.value);
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
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), pageCount);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageEntries = entries.slice(start, start + PAGE_SIZE);
  el.activeTag.textContent = state.activeTag || "전체 태그";
  el.count.textContent = String(entries.length);
  el.entries.replaceChildren(...pageEntries.map(entryCard));
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "연결된 항목이 없습니다.";
    el.entries.append(empty);
  } else if (entries.length > PAGE_SIZE) {
    el.entries.append(paginationView(entries.length, pageCount));
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
    state.page = 1;
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

function paginationView(total, pageCount) {
  const nav = document.createElement("nav");
  nav.className = "pagination";
  nav.setAttribute("aria-label", "줍줍사전 페이지");
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
    window.scrollTo({ top: el.entries.offsetTop - 24, behavior: "smooth" });
  });
  return button;
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
  card.dataset.id = clip.id;
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
  const actions = document.createElement("div");
  actions.className = "entry-actions";
  const detail = document.createElement("button");
  detail.type = "button";
  detail.dataset.action = "detail";
  detail.textContent = "자세히 / 편집";
  actions.append(detail);
  if (clip.source) {
    const link = document.createElement("a");
    link.href = clip.source;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "원본 열기";
    actions.append(link);
  }
  card.append(actions);
  return card;
}

function handleEntryClick(event) {
  const button = event.target.closest("[data-action='detail']");
  if (!button) return;
  const card = event.target.closest(".entry-card");
  if (!card) return;
  openDetail(card.dataset.id);
}

function openDetail(id) {
  const clip = state.clips.find((item) => item.id === id);
  if (!clip) return;
  state.editingId = id;
  el.detailHeading.textContent = clip.title || clip.sentence || clip.source || "주운 정보";
  el.detailType.value = clip.contentType || "링크";
  el.detailTitle.value = clip.title || "";
  el.detailSentence.value = clip.sentence || "";
  el.detailReason.value = clip.reason || "";
  el.detailSource.value = clip.source || "";
  el.detailImageUrl.value = clip.imageUrl || "";
  el.detailTags.value = normalizeTags(clip.tags);
  el.detailStatus.value = clip.status || "새로 수집";
  el.detailFavorite.checked = Boolean(clip.favorite);
  renderDetailPreview(clip);
  renderTagSuggestions(el.detailTags);
  el.detailDialog.showModal();
}

function renderDetailPreview(clip) {
  el.detailPreview.replaceChildren();
  if (clip.imageUrl) {
    const image = document.createElement("img");
    image.src = clip.imageUrl;
    image.alt = clip.title || "주운 이미지";
    el.detailPreview.append(image);
  }
  if (clip.sentence) el.detailPreview.append(textEl("p", "sentence", clip.sentence));
  if (clip.source) {
    const link = document.createElement("a");
    link.href = clip.source;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "원본 열기";
    el.detailPreview.append(link);
  }
}

async function saveDetail(event) {
  event.preventDefault();
  const clip = state.clips.find((item) => item.id === state.editingId);
  if (!clip) return;
  Object.assign(clip, {
    contentType: el.detailType.value,
    title: el.detailTitle.value.trim(),
    sentence: normalizeMultiline(el.detailSentence.value),
    reason: el.detailReason.value.trim(),
    source: el.detailSource.value.trim(),
    siteName: deriveSiteName(el.detailSource.value),
    imageUrl: el.detailImageUrl.value.trim(),
    tags: normalizeTags(el.detailTags.value),
    status: el.detailStatus.value,
    favorite: el.detailFavorite.checked,
    reviewCount: Number(clip.reviewCount || 0) + 1,
    lastReviewed: new Date().toISOString()
  });
  try {
    if (hasCloudSession()) {
      const updated = await updateCloudClip(clip);
      Object.assign(clip, updated);
    }
    el.detailDialog.close();
    render();
    setCloudStatus("사전 항목을 저장했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "사전 항목을 저장하지 못했습니다.");
  }
}

async function deleteDetail() {
  const clip = state.clips.find((item) => item.id === state.editingId);
  if (!clip) return;
  if (!confirm("이 항목을 삭제할까요?")) return;
  try {
    if (hasCloudSession()) await deleteCloudClip(clip.id);
    state.clips = state.clips.filter((item) => item.id !== clip.id);
    state.editingId = "";
    el.detailDialog.close();
    render();
    setCloudStatus("사전 항목을 삭제했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "사전 항목을 삭제하지 못했습니다.");
  }
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

function textEl(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className || "";
  node.textContent = text || "";
  return node;
}

function normalizeMultiline(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function deriveSiteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function tagPool() {
  return [...new Set(state.clips.flatMap((clip) => parseTags(clip.tags)))]
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

function setCloudStatus(message) {
  el.cloudStatus.textContent = message;
}
