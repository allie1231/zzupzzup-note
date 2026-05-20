import { createClip, localDateParts, normalizeTags } from "./schema.js";

export function clipToMarkdown(input) {
  const clip = createClip(input);
  const parts = localDateParts(clip.createdAt);
  const lines = [
    `## ${parts.dateKey}`,
    "",
    `### ${parts.timeKey}`,
    "",
    `> ${escapeBlockquote(clip.sentence)}`,
    "",
    `- 수집한 이유: ${clip.reason}`,
    `- 연결/확장: ${clip.connection}`,
    `- 활용처: ${clip.useFor}`,
    `- 다음 액션: ${clip.action}`,
    `- 출처: ${clip.source}`,
    `- 제목: ${clip.title}`,
    `- 태그: ${clip.tags.join(" ")}`,
    `- 상태: ${clip.status}`,
    `- 확인 횟수: ${clip.reviewCount}`,
    `- 마지막 확인: ${clip.lastReviewed}`,
    ""
  ];
  return lines.join("\n");
}

export function appendClipToMonthlyMarkdown(existingMarkdown, input) {
  const clip = createClip(input);
  const parts = localDateParts(clip.createdAt);
  const block = clipToMarkdown(clip);
  const existing = String(existingMarkdown || "").trimEnd();
  if (!existing) return `${block}\n`;

  const blockWithoutDate = block.replace(new RegExp(`^## ${parts.dateKey}\\n\\n`), "");
  if (existing.includes(`## ${parts.dateKey}`)) {
    const nextDateMatch = findNextDateHeading(existing, parts.dateKey);
    if (!nextDateMatch) return `${existing}\n\n${blockWithoutDate}\n`;
    return `${existing.slice(0, nextDateMatch.index).trimEnd()}\n\n${blockWithoutDate}\n${existing.slice(nextDateMatch.index)}`;
  }

  return `${existing}\n\n${block}\n`;
}

export function parseMarkdownClips(markdown) {
  const text = String(markdown || "");
  const blocks = text.split(/\n(?=### \d{2}:\d{2}\n)/g);
  const clips = [];
  let currentDate = "";

  for (const block of blocks) {
    const dateMatch = block.match(/## (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) currentDate = dateMatch[1];

    const timeMatch = block.match(/### (\d{2}:\d{2})/);
    const sentenceMatch = block.match(/>\s*([\s\S]*?)(?:\n\n- |\n- )/);
    if (!timeMatch || !sentenceMatch) continue;

    const readField = (...names) => {
      for (const name of names) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const fieldMatch = block.match(new RegExp(`- ${escapedName}:\\s*(.*)`));
        if (fieldMatch) return fieldMatch[1].trim();
      }
      return "";
    };

    clips.push(createClip({
      sentence: sentenceMatch[1].replace(/\n>\s?/g, "\n").trim(),
      reason: readField("수집한 이유", "reason"),
      connection: readField("연결/확장", "connection"),
      useFor: readField("활용처", "use_for"),
      action: readField("다음 액션", "action"),
      source: readField("출처", "source"),
      title: readField("제목", "title"),
      tags: normalizeTags(readField("태그", "tags")),
      status: readField("상태", "status"),
      reviewCount: Number(readField("확인 횟수", "review_count") || 0),
      lastReviewed: readField("마지막 확인", "last_reviewed"),
      createdAt: currentDate && timeMatch ? `${currentDate}T${timeMatch[1]}:00` : undefined
    }));
  }

  return clips;
}

function findNextDateHeading(markdown, dateKey) {
  const pattern = /^## \d{4}-\d{2}-\d{2}$/gm;
  let match;
  let foundCurrent = false;
  while ((match = pattern.exec(markdown))) {
    if (foundCurrent) return match;
    if (match[0] === `## ${dateKey}`) foundCurrent = true;
  }
  return null;
}

function escapeBlockquote(value) {
  return String(value || "").replace(/\n/g, "\n> ");
}
