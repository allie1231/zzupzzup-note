import { clipsToCsv } from "./shared/csv.js";
import { createClip, deriveSiteName } from "./shared/schema.js";
import {
  clearCloudSession,
  deleteCloudClip,
  fetchCloudClips,
  getCloudSettings,
  hasCloudSession,
  saveCloudSettings,
  signInToCloud,
  updateCloudClip,
  uploadCloudImage,
  upsertCloudClips
} from "../shared/supabase-store.js";

const DEPLOYED_MOBILE_URL = "https://allie1231.github.io/zzupzzup-note/mobile-pwa/";
const STORAGE_KEY = "zzupzzup-mobile-cloud-mirror";
const DISPLAY_LIMIT = 15;

if (window.location.protocol === "file:") {
  redirectFilePageToDeployed();
}

const el = {
  install: document.querySelector("#install"),
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
  bookmarkletLink: document.querySelector("#bookmarkletLink"),
  bookmarkletCode: document.querySelector("#bookmarkletCode"),
  copyBookmarklet: document.querySelector("#copyBookmarklet"),
  quickSave: document.querySelector("#quickSave"),
  clear: document.querySelector("#clear"),
  contentType: document.querySelector("#contentType"),
  status: document.querySelector("#status"),
  source: document.querySelector("#source"),
  title: document.querySelector("#title"),
  sentence: document.querySelector("#sentence"),
  imageFile: document.querySelector("#imageFile"),
  imagePreview: document.querySelector("#imagePreview"),
  removeImage: document.querySelector("#removeImage"),
  imageUrl: document.querySelector("#imageUrl"),
  imagePath: document.querySelector("#imagePath"),
  useFor: document.querySelector("#useFor"),
  action: document.querySelector("#action"),
  tags: document.querySelector("#tags"),
  favorite: document.querySelector("#favorite"),
  save: document.querySelector("#save"),
  statusText: document.querySelector("#statusText"),
  exportMode: document.querySelector("#exportMode"),
  exportCsv: document.querySelector("#exportCsv"),
  copyCsv: document.querySelector("#copyCsv"),
  search: document.querySelector("#search"),
  showStarred: document.querySelector("#showStarred"),
  showAll: document.querySelector("#showAll"),
  clips: document.querySelector("#clips")
};

let installPrompt = null;
let favoriteOnly = false;
let imageDataUrl = "";
let selectedImageFile = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  el.install.hidden = false;
});

el.install.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  el.install.hidden = true;
});

el.cloudSave.addEventListener("click", saveCloudConfig);
el.cloudLogin.addEventListener("click", loginCloud);
el.cloudLogout.addEventListener("click", logoutCloud);
el.cloudPull.addEventListener("click", pullCloud);
el.copyBookmarklet.addEventListener("click", copyBookmarklet);
el.clear.addEventListener("click", clearEditor);
el.quickSave.addEventListener("click", saveClip);
el.imageFile.addEventListener("change", handleImageFile);
el.imageUrl.addEventListener("input", syncImageUrlPreview);
el.removeImage.addEventListener("click", clearImage);
el.save.addEventListener("click", saveClip);
el.exportCsv.addEventListener("click", exportCsv);
el.copyCsv.addEventListener("click", copyCsv);
el.search.addEventListener("input", render);
el.showStarred.addEventListener("click", () => {
  favoriteOnly = true;
  render();
});
el.showAll.addEventListener("click", () => {
  favoriteOnly = false;
  el.search.value = "";
  render();
});
document.querySelectorAll("[data-open-panel]").forEach((button) => {
  button.addEventListener("click", () => toggleFloatingPanel(button.dataset.openPanel));
});

setupBookmarklet();
restoreCloudConfig();
const prefillResult = prefillFromUrl();
render();
if (prefillResult.autosave) {
  autoSaveBookmarkletClip();
} else {
  autoPullCloud();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("url") || params.get("source") || "";
  const title = params.get("title") || params.get("pageTitle") || params.get("name") || "";
  const text = params.get("text") || params.get("memo") || params.get("sentence") || "";
  const imageUrl = params.get("imageUrl") || "";
  const type = params.get("type") || inferType(source, imageUrl, text);
  const autosave = ["1", "true", "yes", "y"].includes(String(params.get("autosave") || "").toLowerCase());

  if (!source && !title && !text && !imageUrl) return { autosave: false };
  el.contentType.value = type;
  el.source.value = source || imageUrl;
  el.title.value = title;
  el.sentence.value = text;
  el.imageUrl.value = imageUrl;
  syncImageUrlPreview();
  el.tags.value = `#${type} ${autosave ? "#북마클릿" : "#모바일"}`;
  setStatus(autosave ? "북마클릿으로 받은 내용을 서버에 바로 저장합니다." : "공유된 내용을 불러왔습니다. 확인 후 저장해 주세요.");
  return { autosave };
}

function setupBookmarklet() {
  const script = `javascript:(()=>{const s=(window.getSelection&&window.getSelection().toString().trim())||prompt('줍줍할 문장을 입력하세요','')||'';const u=location.href;const t=document.title||'';const y=s?'문장':'링크';location.href='${DEPLOYED_MOBILE_URL}?autosave=1&type='+encodeURIComponent(y)+'&url='+encodeURIComponent(u)+'&title='+encodeURIComponent(t)+'&text='+encodeURIComponent(s);})()`;
  el.bookmarkletLink.href = script;
  el.bookmarkletCode.value = script;
}

async function copyBookmarklet() {
  try {
    await navigator.clipboard.writeText(el.bookmarkletCode.value);
    setStatus("북마클릿 코드를 복사했습니다. Safari 책갈피의 주소 칸에 붙여넣어 주세요.");
  } catch {
    el.bookmarkletCode.select();
    setStatus("복사가 막혔습니다. 코드 칸을 길게 눌러 직접 복사해 주세요.");
  }
}

function restoreCloudConfig() {
  const settings = getCloudSettings();
  el.cloudUrl.value = settings.url || "";
  el.cloudAnonKey.value = settings.anonKey || "";
  el.cloudEmail.value = settings.email || "";
  el.cloudPassword.value = settings.password || "";
  if (el.cloudAdvanced) el.cloudAdvanced.open = !settings.anonKey;
  setCloudStatus(hasCloudSession(settings) ? "Supabase에 로그인되어 있습니다. 저장하면 서버에 바로 들어갑니다." : "이메일/비밀번호로 로그인해 주세요. 처음 연결이라면 고급 설정에 anon key가 필요합니다.");
}

function saveCloudConfig() {
  saveCloudSettings({
    url: el.cloudUrl.value,
    anonKey: el.cloudAnonKey.value,
    email: el.cloudEmail.value,
    password: el.cloudPassword.value
  });
  setCloudStatus("Supabase 설정을 저장했습니다. 로그인해 주세요.");
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
    setCloudStatus("Supabase에 로그인했습니다. 서버 저장함을 불러옵니다.");
    await pullCloud({ quiet: true });
  } catch (error) {
    setCloudStatus(loginErrorMessage(error));
  }
}

function logoutCloud() {
  clearCloudSession();
  setCloudStatus("이 기기에서 Supabase 로그아웃했습니다.");
}

async function autoPullCloud() {
  if (!hasCloudSession()) return;
  try {
    await pullCloud({ quiet: true });
  } catch (error) {
    setCloudStatus(error.message || "Supabase 데이터를 자동으로 불러오지 못했습니다.");
  }
}

async function autoSaveBookmarkletClip() {
  if (!hasCloudSession()) {
    setStatus("북마클릿 내용을 받았습니다. Supabase에 로그인한 뒤 서버에 바로 저장을 눌러 주세요.");
    setCloudStatus("이 기기에서 한 번 로그인하면 다음 북마클릿 줍줍부터 자동 저장됩니다.");
    return;
  }
  await saveClip({ autosave: true });
}

async function pullCloud(options = {}) {
  if (!hasCloudSession()) {
    setCloudStatus("먼저 Supabase에 로그인해 주세요.");
    return;
  }
  if (!options.quiet) setCloudStatus("Supabase에서 불러오는 중...");
  const cloudClips = await fetchCloudClips();
  setClips(mergeClips(getClips(), cloudClips));
  render();
  setCloudStatus(`Supabase에서 ${cloudClips.length}개를 불러왔습니다.`);
}

async function handleImageFile() {
  const file = el.imageFile.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("이미지 파일만 추가할 수 있습니다.");
    return;
  }

  setStatus("이미지를 준비하는 중...");
  try {
    selectedImageFile = file;
    imageDataUrl = await imageFileToDataUrl(file);
    el.contentType.value = "이미지";
    el.imageUrl.value = imageDataUrl;
    el.imagePath.value = "";
    el.imagePreview.src = imageDataUrl;
    el.imagePreview.hidden = false;
    el.removeImage.hidden = false;
    if (!el.tags.value) el.tags.value = "#이미지 #모바일";
    setStatus("이미지를 추가했습니다. 저장하면 Supabase Storage에 올라갑니다.");
  } catch (error) {
    setStatus(error.message || "이미지를 추가하지 못했습니다.");
  }
}

async function saveClip(options = {}) {
  if (!hasCloudSession()) {
    setStatus("먼저 Supabase에 로그인해 주세요. 이제 모바일 줍기는 서버에 바로 저장됩니다.");
    setCloudStatus("Supabase 로그인 후 다시 저장하면 서버 보관함에 들어갑니다.");
    return;
  }

  const source = el.source.value.trim();
  let imageUrl = imageDataUrl || el.imageUrl.value;
  let imagePath = el.imagePath.value;
  if (selectedImageFile) {
    setStatus("이미지를 Supabase에 올리는 중...");
    try {
      const uploaded = await uploadCloudImage(selectedImageFile);
      imageUrl = uploaded.imageUrl;
      imagePath = uploaded.imagePath;
    } catch (error) {
      setCloudStatus(error.message || "이미지를 Supabase에 올리지 못했습니다.");
      setStatus("이미지 업로드에 실패해서 저장을 멈췄습니다.");
      return;
    }
  }

  const clip = createClip({
    contentType: el.contentType.value,
    sentence: el.sentence.value || "",
    reason: "",
    connection: "",
    useFor: el.useFor.value,
    action: el.action.value,
    source,
    siteName: deriveSiteName(source),
    imagePath,
    imageUrl,
    title: el.title.value,
    tags: el.tags.value || `#${el.contentType.value} #모바일`,
    status: el.status.value,
    favorite: el.favorite.checked
  });

  setStatus("Supabase에 저장 중...");
  try {
    const saved = await upsertCloudClips([clip]);
    const savedClip = saved[0] || clip;
    setClips(mergeClips([savedClip], getClips()));
    clearEditor();
    render();
    setStatus(options.autosave ? "북마클릿 문장을 서버에 저장했습니다. Safari로 돌아가도 됩니다." : "서버에 바로 저장했습니다.");
    setCloudStatus("Supabase 저장함에 저장했습니다. 웹홈에서도 바로 불러올 수 있습니다.");
  } catch (error) {
    setStatus("서버 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    setCloudStatus(error.message || "Supabase 저장에 실패했습니다.");
  }
}

function loginErrorMessage(error) {
  const message = error?.message || "";
  if (message === "Failed to fetch" || message.includes("Failed to fetch")) {
    return "서버에 닿지 못했습니다. file:// 로컬 파일이 아니라 배포 주소에서 열어 주세요.";
  }
  return message || "Supabase에 로그인하지 못했습니다.";
}

function redirectFilePageToDeployed() {
  const target = new URL(DEPLOYED_MOBILE_URL);
  target.search = window.location.search;
  target.hash = window.location.hash;
  window.location.replace(target.href);
}

function exportCsv() {
  const clips = filteredClips();
  if (!clips.length) {
    setStatus("내보낼 항목이 없습니다.");
    return;
  }
  if (el.exportMode.value === "replace") {
    downloadText("줍줍노트.csv", clipsToCsv(clips), "text/csv;charset=utf-8");
    setStatus("백업용 CSV 파일을 내보냈습니다.");
    return;
  }
  downloadText("줍줍노트-mobile-backup.csv", clipsToCsv(clips), "text/csv;charset=utf-8");
  setStatus("모바일 서버 저장함의 백업 CSV를 내보냈습니다.");
}

async function copyCsv() {
  const clips = filteredClips();
  if (!clips.length) {
    setStatus("복사할 항목이 없습니다.");
    return;
  }
  try {
    await navigator.clipboard.writeText(clipsToCsv(clips));
    setStatus("백업용 CSV 내용을 복사했습니다.");
  } catch {
    setStatus("클립보드 복사가 막혔습니다. 백업 내보내기를 사용해 주세요.");
  }
}

function render() {
  const clips = filteredClips();
  const displayed = clips.slice(0, DISPLAY_LIMIT);
  el.clips.replaceChildren(...displayed.map(cardView));
  if (!clips.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = hasCloudSession() ? "서버 저장함이 비어 있습니다. 저장하면 여기에 표시됩니다." : "Supabase에 로그인하면 서버 저장함을 불러옵니다.";
    el.clips.append(empty);
  } else if (clips.length > DISPLAY_LIMIT) {
    const more = document.createElement("li");
    more.className = "empty";
    more.textContent = `최근 ${DISPLAY_LIMIT}개만 표시 중입니다. 검색으로 더 좁혀 보세요.`;
    el.clips.append(more);
  }
}

function toggleFloatingPanel(name) {
  const panel = document.querySelector(`[data-floating-panel="${name}"]`);
  if (!panel) return;
  const shouldOpen = !panel.classList.contains("is-open");
  document.querySelectorAll("[data-floating-panel]").forEach((item) => item.classList.remove("is-open"));
  if (shouldOpen) panel.classList.add("is-open");
}

function cardView(clip) {
  const item = document.createElement("li");
  item.className = clip.favorite ? "clip is-favorite" : "clip";
  const title = document.createElement("strong");
  const meta = document.createElement("div");
  const memo = document.createElement("blockquote");
  const actions = document.createElement("div");
  const star = document.createElement("button");
  const remove = document.createElement("button");

  title.textContent = clip.title || clip.source || clip.sentence || "주운 정보";
  memo.textContent = clip.sentence || "";
  meta.className = "clip-tags";
  [
    clip.contentType || "링크",
    clip.status || "새로 수집",
    clip.favorite ? "별표" : "",
    clip.tags?.join ? clip.tags.join(" ") : clip.tags
  ].filter(Boolean).join(" ").split(/\s+/).filter(Boolean).forEach((tag) => {
    const item = document.createElement("span");
    item.textContent = tag;
    meta.append(item);
  });

  actions.className = "clip-actions";
  star.className = "secondary";
  star.textContent = clip.favorite ? "별표 해제" : "별표";
  star.addEventListener("click", () => toggleFavorite(clip.id));
  remove.className = "secondary danger";
  remove.textContent = "삭제";
  remove.addEventListener("click", () => deleteClip(clip.id));
  actions.append(star, remove);

  if (clip.imageUrl) {
    const image = document.createElement("img");
    image.className = "clip-thumb";
    image.src = clip.imageUrl;
    image.alt = clip.title || "주운 이미지";
    item.append(image);
  }
  item.append(title, memo, meta, sourceLink(clip), actions);
  return item;
}

function sourceLink(clip) {
  if (!clip.source) return document.createElement("span");
  const link = document.createElement("a");
  link.href = clip.source;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "원본 열기";
  return link;
}

function filteredClips() {
  const query = el.search.value.trim().toLowerCase();
  return getClips().filter((clip) => {
    if (favoriteOnly && !clip.favorite) return false;
    if (!query) return true;
    return [
      clip.sentence,
      clip.title,
      clip.source,
      clip.tags?.join ? clip.tags.join(" ") : clip.tags
    ].join(" ").toLowerCase().includes(query);
  });
}

function toggleFavorite(id) {
  const clips = getClips();
  const clip = clips.find((item) => item.id === id);
  if (!clip) return;
  clip.favorite = !clip.favorite;
  setClips(clips);
  syncCloudClip(clip);
  render();
}

function deleteClip(id) {
  setClips(getClips().filter((clip) => clip.id !== id));
  removeCloudClip(id);
  render();
}

async function syncCloudClip(clip) {
  if (!hasCloudSession()) return;
  try {
    await updateCloudClip(clip);
    setCloudStatus("Supabase에도 변경사항을 저장했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "Supabase 변경 저장에 실패했습니다.");
  }
}

async function removeCloudClip(id) {
  if (!hasCloudSession()) return;
  try {
    await deleteCloudClip(id);
    setCloudStatus("Supabase에서도 삭제했습니다.");
  } catch (error) {
    setCloudStatus(error.message || "Supabase 삭제에 실패했습니다.");
  }
}

function getClips() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function setClips(clips) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
}

function clearEditor() {
  el.contentType.value = "링크";
  el.status.value = "새로 수집";
  el.source.value = "";
  el.title.value = "";
  el.sentence.value = "";
  el.imageUrl.value = "";
  el.imagePath.value = "";
  el.useFor.value = "정리필요";
  el.action.value = "정리필요";
  el.tags.value = "";
  el.favorite.checked = false;
  clearImage();
}

function clearImage() {
  imageDataUrl = "";
  selectedImageFile = null;
  el.imageFile.value = "";
  el.imageUrl.value = "";
  el.imagePath.value = "";
  el.imagePreview.removeAttribute("src");
  el.imagePreview.hidden = true;
  el.removeImage.hidden = true;
}

function syncImageUrlPreview() {
  const url = el.imageUrl.value.trim();
  if (!url) {
    if (!imageDataUrl) clearImage();
    return;
  }
  el.imagePreview.src = url;
  el.imagePreview.hidden = false;
  el.removeImage.hidden = false;
}

function inferType(source, imageUrl, textValue = "") {
  const text = `${source} ${imageUrl}`.toLowerCase();
  if (imageUrl || /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(text)) return "이미지";
  if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)/.test(text)) return "동영상";
  if (/\.(pdf|docx?|pptx?|xlsx?|zip)(\?|$)/.test(text)) return "자료";
  if (textValue && !source) return "문장";
  return "링크";
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

function setStatus(message) {
  el.statusText.textContent = message;
}

function setCloudStatus(message) {
  el.cloudStatus.textContent = message;
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
  return output.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

function imageFileToDataUrl(file) {
  if (file.type.includes("gif") || file.type.includes("svg")) {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1400;
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    image.src = URL.createObjectURL(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}
