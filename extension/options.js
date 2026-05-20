import { CSV_FILENAME, ensureClipsCsvFile, readClipsCsv } from "./shared/csv-store.js";
import { setVaultHandle, getVaultHandle, verifyPermission } from "./fs-store.js";

const chooseVault = document.querySelector("#chooseVault");
const vaultStatus = document.querySelector("#vaultStatus");
const exportAll = document.querySelector("#exportAll");
const exportStatus = document.querySelector("#exportStatus");

refreshStatus();

chooseVault.addEventListener("click", async () => {
  await chooseVaultFolder();
});

exportAll.addEventListener("click", async () => {
  await exportCsv();
});

async function refreshStatus() {
  const handle = await getVaultHandle();
  vaultStatus.textContent = handle
    ? `현재 저장 폴더: ${handle.name} · ${CSV_FILENAME} 사용 중`
    : "아직 저장 폴더를 선택하지 않았습니다.";
}

async function chooseVaultFolder() {
  if (!window.showDirectoryPicker) {
    vaultStatus.textContent = "이 브라우저는 폴더 저장 권한을 지원하지 않습니다.";
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const allowed = await verifyPermission(handle, true);
    if (!allowed) throw new Error("CSV 저장 폴더 쓰기 권한이 필요합니다.");
    await setVaultHandle(handle);
    const result = await ensureClipsCsvFile(handle);
    vaultStatus.textContent = result.created
      ? `"${handle.name}" 폴더에 ${CSV_FILENAME}를 만들었습니다.`
      : `"${handle.name}" 폴더의 기존 ${CSV_FILENAME}를 사용합니다.`;
  } catch (error) {
    vaultStatus.textContent = error.message || "저장 폴더를 설정하지 못했습니다.";
  }
}

async function exportCsv() {
  exportStatus.textContent = "CSV를 준비하는 중...";
  try {
    const folder = await getVaultHandle();
    if (!folder) throw new Error("먼저 CSV 저장 폴더를 선택해 주세요.");
    const allowed = await verifyPermission(folder, false);
    if (!allowed) throw new Error("CSV 저장 폴더 읽기 권한이 필요합니다.");

    const csv = await readClipsCsv(folder);
    if (!csv.trim()) throw new Error("내려받을 수집 항목이 없습니다.");

    downloadText(CSV_FILENAME, csv, "text/csv;charset=utf-8");
    exportStatus.textContent = `${CSV_FILENAME}을 내려받았습니다.`;
  } catch (error) {
    exportStatus.textContent = error.message || "CSV를 내려받지 못했습니다.";
  }
}

function downloadText(filename, text, type) {
  const blob = new Blob(["\ufeff", text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
