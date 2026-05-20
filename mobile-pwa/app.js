import { clipsToCsv } from "./shared/csv.js";
import { createClip, deriveSiteName, localDateParts } from "./shared/schema.js";

const STORAGE_KEY = "zzupzzup-mobile-clips";
const el = {
  install: document.querySelector("#install"),
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

el.clear.addEventListener("click", clearEditor);
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

prefillFromUrl();
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("url") || params.get("source") || "";
  const title = params.get("title") || "";
  const text = params.get("text") || params.get("memo") || params.get("sentence") || "";
  const imageUrl = params.get("imageUrl") || "";
  const type = params.get("type") || inferType(source, imageUrl);

  if (!source && !title && !text && !imageUrl) return;
  el.contentType.value = type;
  el.source.value = source || imageUrl;
  el.title.value = title;
  el.sentence.value = text || title || source || imageUrl;
  el.imageUrl.value = imageUrl;
  syncImageUrlPreview();
  el.tags.value = `#${type} #모바일`;
  setStatus("공유된 내용을 불러왔습니다. 확인 후 저장해 주세요.");
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
    imageDataUrl = await imageFileToDataUrl(file);
    el.contentType.value = "이미지";
    el.imageUrl.value = imageDataUrl;
    el.imagePath.value = `mobile/${safeFilename(file.name)}`;
    el.imagePreview.src = imageDataUrl;
    el.imagePreview.hidden = false;
    el.removeImage.hidden = false;
    if (!el.title.value) el.title.value = "모바일에서 주운 이미지";
    if (!el.tags.value) el.tags.value = "#이미지 #모바일";
    setStatus("이미지를 추가했습니다. 메모를 적고 저장해 주세요.");
  } catch (error) {
    setStatus(error.message || "이미지를 추가하지 못했습니다.");
  }
}

function saveClip() {
  const source = el.source.value.trim();
  const imageUrl = imageDataUrl || el.imageUrl.value;
  const clip = createClip({
    contentType: el.contentType.value,
    sentence: el.sentence.value || el.title.value || source || (imageUrl ? "모바일에서 주운 이미지" : ""),
    reason: "",
    connection: "",
    useFor: el.useFor.value,
    action: el.action.value,
    source,
    siteName: deriveSiteName(source),
    imagePath: el.imagePath.value,
    imageUrl,
    title: el.title.value,
    tags: el.tags.value || `#${el.contentType.value} #모바일`,
    status: el.status.value,
    favorite: el.favorite.checked
  });

  const clips = getClips();
  clips.unshift(clip);
  setClips(clips);
  clearEditor();
  render();
  setStatus("모바일 임시 수집함에 저장했습니다.");
}

function exportCsv() {
  const clips = filteredClips();
  if (!clips.length) {
    setStatus("내보낼 항목이 없습니다.");
    return;
  }
  const month = localDateParts().monthKey.replace("-", "");
  downloadText(`줍줍노트-mobile-${month}.csv`, clipsToCsv(clips), "text/csv;charset=utf-8");
  setStatus("CSV를 내보냈습니다.");
}

async function copyCsv() {
  const clips = filteredClips();
  if (!clips.length) {
    setStatus("복사할 항목이 없습니다.");
    return;
  }
  try {
    await navigator.clipboard.writeText(clipsToCsv(clips));
    setStatus("CSV 내용을 복사했습니다.");
  } catch {
    setStatus("클립보드 복사가 막혔습니다. CSV 내보내기를 사용해 주세요.");
  }
}

function render() {
  const clips = filteredClips();
  el.clips.replaceChildren(...clips.map(cardView));
  if (!clips.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "공유 메뉴나 직접 입력으로 줍줍하면 여기에 쌓입니다.";
    el.clips.append(empty);
  }
}

function cardView(clip) {
  const item = document.createElement("li");
  item.className = clip.favorite ? "clip is-favorite" : "clip";
  const title = document.createElement("strong");
  const meta = document.createElement("p");
  const memo = document.createElement("blockquote");
  const actions = document.createElement("div");
  const star = document.createElement("button");
  const remove = document.createElement("button");

  title.textContent = clip.title || clip.source || clip.sentence || "주운 정보";
  memo.textContent = clip.sentence || "";
  meta.textContent = [
    clip.contentType || "링크",
    clip.status || "새로 수집",
    clip.favorite ? "별표" : "",
    clip.tags?.join ? clip.tags.join(" ") : clip.tags
  ].filter(Boolean).join(" · ");

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
  render();
}

function deleteClip(id) {
  setClips(getClips().filter((clip) => clip.id !== id));
  render();
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
  el.useFor.value = "레퍼런스";
  el.action.value = "참고";
  el.tags.value = "";
  el.favorite.checked = false;
  clearImage();
}

function clearImage() {
  imageDataUrl = "";
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

function inferType(source, imageUrl) {
  const text = `${source} ${imageUrl}`.toLowerCase();
  if (imageUrl || /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(text)) return "이미지";
  if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)/.test(text)) return "동영상";
  if (/\.(pdf|docx?|pptx?|xlsx?|zip)(\?|$)/.test(text)) return "자료";
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

function safeFilename(name) {
  const base = String(name || "mobile-image.jpg")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^-+/, "");
  return base || "mobile-image.jpg";
}
