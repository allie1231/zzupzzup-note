import { clipsToCsv, clipToCsvRow } from "./csv.js";

export const CSV_FILENAME = "줍줍노트.csv";

export async function appendClipToCsvFile(folderHandle, clip) {
  const fileHandle = await folderHandle.getFileHandle(CSV_FILENAME, { create: true });
  const file = await fileHandle.getFile();
  const currentText = await file.text();
  const nextText = buildNextCsv(currentText, clip);
  const writable = await fileHandle.createWritable();
  await writable.write(nextText);
  await writable.close();
  return CSV_FILENAME;
}

export async function readClipsCsv(folderHandle) {
  const fileHandle = await folderHandle.getFileHandle(CSV_FILENAME, { create: true });
  const file = await fileHandle.getFile();
  return file.text();
}

function buildNextCsv(currentText, clip) {
  const text = stripBom(String(currentText || "")).trimEnd();
  if (!text) return `\ufeff${clipsToCsv([clip])}\n`;
  return `\ufeff${text}\n${clipToCsvRow(clip)}\n`;
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}
