import { createClip } from "./schema.js";

export const CSV_HEADERS = [
  "id",
  "수집 일시",
  "유형",
  "주운 글",
  "수집한 이유",
  "연결/확장",
  "활용처",
  "다음 액션",
  "출처",
  "사이트명",
  "아이콘 URL",
  "이미지 경로",
  "이미지 URL",
  "제목",
  "태그",
  "상태",
  "확인 횟수",
  "마지막 확인"
];

export function clipsToCsv(clips) {
  const rows = clips.map((clip) => buildCsvRow(clip));
  return [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function clipToCsvRow(clip) {
  return buildCsvRow(clip).map(csvCell).join(",");
}

function buildCsvRow(clip) {
  const safeClip = createClip(clip);
  return [
    safeClip.id,
    safeClip.createdAt,
    safeClip.contentType,
    safeClip.sentence,
    safeClip.reason,
    safeClip.connection,
    safeClip.useFor,
    safeClip.action,
    safeClip.source,
    safeClip.siteName,
    safeClip.iconUrl,
    safeClip.imagePath,
    safeClip.imageUrl,
    safeClip.title,
    safeClip.tags.join(" "),
    safeClip.status,
    safeClip.reviewCount,
    safeClip.lastReviewed
  ];
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
