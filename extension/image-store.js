import { getVaultHandle, verifyPermission } from "./fs-store.js";

const IMAGE_DIR = "images";

export async function saveImageFromUrl(imageUrl, sourceUrl = "") {
  const folder = await getVaultHandle();
  if (!folder) throw new Error("CSV 저장 폴더를 먼저 선택해 주세요.");
  const allowed = await verifyPermission(folder, true);
  if (!allowed) throw new Error("이미지 저장 폴더 쓰기 권한이 필요합니다.");

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("이미지를 가져오지 못했습니다.");

  const blob = await response.blob();
  const extension = extensionFromBlob(blob) || extensionFromUrl(imageUrl) || "png";
  const imageDir = await folder.getDirectoryHandle(IMAGE_DIR, { create: true });
  const filename = `${timestamp()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const fileHandle = await imageDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();

  return {
    imagePath: `${IMAGE_DIR}/${filename}`,
    imageUrl,
    sourceUrl
  };
}

function extensionFromBlob(blob) {
  const type = blob.type.toLowerCase();
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  return "";
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : "";
  } catch {
    return "";
  }
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
