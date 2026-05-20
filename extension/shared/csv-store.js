import { clipsToCsv, clipToCsvRow, CSV_HEADERS } from "./csv.js";

export const CSV_FILENAME = "줍줍노트.csv";

export async function ensureClipsCsvFile(folderHandle) {
  const fileHandle = await folderHandle.getFileHandle(CSV_FILENAME, { create: true });
  const file = await fileHandle.getFile();
  const currentText = await file.text();
  const migratedText = migrateCsv(currentText);
  if (migratedText.trim()) {
    if (migratedText !== stripBom(String(currentText || "")).trimEnd()) {
      const writable = await fileHandle.createWritable();
      await writable.write(`\ufeff${migratedText}\n`);
      await writable.close();
    }
    return { filename: CSV_FILENAME, created: false };
  }

  const writable = await fileHandle.createWritable();
  await writable.write(`\ufeff${clipsToCsv([])}\n`);
  await writable.close();
  return { filename: CSV_FILENAME, created: true };
}

export async function appendClipToCsvFile(folderHandle, clip) {
  await ensureClipsCsvFile(folderHandle);
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
  await ensureClipsCsvFile(folderHandle);
  const fileHandle = await folderHandle.getFileHandle(CSV_FILENAME);
  const file = await fileHandle.getFile();
  return file.text();
}

function buildNextCsv(currentText, clip) {
  const text = migrateCsv(currentText).trimEnd();
  if (!text) return `\ufeff${clipsToCsv([clip])}\n`;
  return `\ufeff${text}\n${clipToCsvRow(clip)}\n`;
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}

function migrateCsv(currentText) {
  const text = stripBom(String(currentText || "")).trimEnd();
  if (!text) return "";
  const rows = parseCsvRows(text);
  const headers = rows[0] || [];
  if (headers.length === CSV_HEADERS.length && headers.every((header, index) => header === CSV_HEADERS[index])) return text;

  const clips = rows.slice(1).filter((values) => values.some(Boolean)).map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    return {
      id: row.id || row["id"] || "",
      createdAt: row["수집 일시"] || "",
      contentType: inferContentType(row),
      sentence: row["주운 글"] || row["문장"] || "",
      reason: row["수집한 이유"] || "",
      connection: row["연결/확장"] || "",
      useFor: row["활용처"] || "",
      action: row["다음 액션"] || "",
      source: row["출처"] || "",
      siteName: row["사이트명"] || "",
      iconUrl: row["아이콘 URL"] || "",
      imagePath: row["이미지 경로"] || "",
      imageUrl: row["이미지 URL"] || "",
      title: row["제목"] || "",
      tags: row["태그"] || "",
      status: row["상태"] || "",
      favorite: row["별표"] || row["즐겨찾기"] || row["좋아요"] || "",
      reviewCount: row["확인 횟수"] || "",
      lastReviewed: row["마지막 확인"] || ""
    };
  });
  return clipsToCsv(clips);
}

function inferContentType(row) {
  if (row["유형"]) return row["유형"];
  if (row["이미지 경로"] || row["이미지 URL"]) return "이미지";
  if (row["문장"] && !row["출처"]) return "문장";
  if (row["출처"]) return "링크";
  return "자료";
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
