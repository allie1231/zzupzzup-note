import { createClip } from "./shared/schema.js";
import { saveClip } from "./data-writer.js";
import { uploadImageFromUrl } from "./supabase-writer.js";

const el = {
  contentType: document.querySelector("#contentType"),
  source: document.querySelector("#source"),
  title: document.querySelector("#title"),
  sentence: document.querySelector("#sentence"),
  imageSection: document.querySelector("#imageSection"),
  imagePreview: document.querySelector("#imagePreview"),
  imageUrlText: document.querySelector("#imageUrlText"),
  save: document.querySelector("#save"),
  status: document.querySelector("#status"),
  openOptions: document.querySelector("#openOptions")
};

hydrateFromPendingClip();

el.openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

el.save.addEventListener("click", async () => {
  setStatus("저장 중...");
  try {
    const pending = (await chrome.storage.local.get("pendingClip")).pendingClip || {};
    let imagePath = pending.imagePath || "";
    let imageUrl = pending.imageUrl || "";
    if (imageUrl && !imagePath) {
      setStatus("이미지를 서버에 올리는 중...");
      const image = await uploadImageFromUrl(imageUrl);
      imagePath = image.imagePath;
      imageUrl = image.imageUrl;
    }

    const source = el.source.value.trim() || pending.source || imageUrl || "";
    const title = el.title.value.trim() || pending.title || "";
    const contentType = el.contentType.value || pending.contentType || "링크";
    const clip = createClip({
      contentType,
      sentence: el.sentence.value || "",
      reason: "",
      connection: "",
      useFor: "정리필요",
      action: "정리필요",
      source,
      siteName: pending.siteName || "",
      iconUrl: pending.iconUrl || "",
      imagePath,
      imageUrl,
      title,
      tags: `#${contentType}`,
      status: "새로 수집"
    });

    const path = await saveClip(clip);
    await chrome.storage.local.remove("pendingClip");
    setStatus(`${path}에 저장했습니다.`);
    setTimeout(() => window.close(), 700);
  } catch (error) {
    setStatus(error.message || "저장하지 못했습니다.");
  }
});

async function hydrateFromPendingClip() {
  const { pendingClip } = await chrome.storage.local.get("pendingClip");
  if (!pendingClip) return;
  el.contentType.value = pendingClip.contentType || pendingClip.type || (pendingClip.imageUrl ? "이미지" : "링크");
  el.source.value = pendingClip.source || pendingClip.imageUrl || "";
  el.title.value = pendingClip.title || "";
  el.sentence.value = pendingClip.sentence || "";

  if (pendingClip.imageUrl) {
    el.imageSection.hidden = false;
    el.imagePreview.src = pendingClip.imageUrl;
    el.imageUrlText.textContent = pendingClip.imageUrl;
    el.sentence.placeholder = "이미지에 붙일 짧은 메모만 남겨도 좋아요.";
  }
}

function setStatus(message) {
  el.status.textContent = message;
}
