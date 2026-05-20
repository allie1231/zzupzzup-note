import { appendClipToCsvFile, CSV_FILENAME } from "./shared/csv-store.js";
import { getVaultHandle, verifyPermission } from "./fs-store.js";

export async function saveClipToCsv(clip) {
  const folder = await getVaultHandle();
  if (!folder) throw new Error("CSV 저장 폴더를 먼저 선택해 주세요.");
  const allowed = await verifyPermission(folder, true);
  if (!allowed) throw new Error("CSV 저장 폴더 쓰기 권한이 필요합니다.");
  await appendClipToCsvFile(folder, clip);
  return CSV_FILENAME;
}
