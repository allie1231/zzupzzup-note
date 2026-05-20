export const DEFAULT_ACTIONS = ["확장", "고쳐쓰기", "연결", "인용", "참고", "조사", "보관"];
export const DEFAULT_USE_FOR = ["에세이", "일기", "카피라이팅", "연설", "리서치", "레퍼런스", "아이디어"];
export const DEFAULT_CONTENT_TYPES = ["링크", "이미지", "동영상", "자료"];

const USE_FOR_LABELS = {
  essay: "에세이",
  journal: "일기",
  copywriting: "카피라이팅",
  speech: "연설",
  research: "리서치",
  reference: "레퍼런스",
  idea: "아이디어"
};

const ACTION_LABELS = {
  expand: "확장",
  rewrite: "고쳐쓰기",
  connect: "연결",
  quote: "인용",
  refer: "참고",
  research: "조사",
  archive: "보관"
};

const STATUS_LABELS = {
  new: "새로 수집",
  done: "정리 완료",
  reviewed: "확인함",
  used: "활용함",
  archived: "보관함"
};

const CONTENT_TYPE_LABELS = {
  link: "링크",
  image: "이미지",
  video: "동영상",
  material: "자료"
};

export function createClip(input = {}) {
  const now = input.createdAt ? new Date(input.createdAt) : new Date();
  return {
    id: input.id || crypto.randomUUID(),
    contentType: normalizeContentType(input.contentType || input.type || "링크"),
    sentence: normalizeSentence(input.sentence || ""),
    reason: normalizeText(input.reason || ""),
    connection: normalizeText(input.connection || ""),
    useFor: normalizeUseFor(input.useFor || "에세이"),
    action: normalizeAction(input.action || "확장"),
    source: normalizeText(input.source || ""),
    siteName: normalizeText(input.siteName || deriveSiteName(input.source || "")),
    iconUrl: normalizeText(input.iconUrl || ""),
    imagePath: normalizeText(input.imagePath || ""),
    imageUrl: normalizeText(input.imageUrl || ""),
    title: normalizeText(input.title || ""),
    tags: normalizeTags(input.tags || []),
    status: normalizeStatus(input.status || "새로 수집"),
    reviewCount: Number(input.reviewCount || 0),
    lastReviewed: normalizeText(input.lastReviewed || ""),
    createdAt: now.toISOString()
  };
}

export function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeSentence(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

export function normalizeUseFor(value) {
  const text = normalizeText(value);
  return USE_FOR_LABELS[text] || text || "에세이";
}

export function normalizeAction(value) {
  const text = normalizeText(value);
  return ACTION_LABELS[text] || text || "확장";
}

export function normalizeStatus(value) {
  const text = normalizeText(value);
  return STATUS_LABELS[text] || text || "새로 수집";
}

export function normalizeContentType(value) {
  const text = normalizeText(value);
  return CONTENT_TYPE_LABELS[text] || text || "링크";
}

export function normalizeTags(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[,\s]+/);
  return [...new Set(raw
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.startsWith("#") ? tag : `#${tag}`))];
}

export function deriveSiteName(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return "";
  }
}

export function localDateParts(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    year: String(date.getFullYear()),
    month: pad(date.getMonth() + 1),
    day: pad(date.getDate()),
    hour: pad(date.getHours()),
    minute: pad(date.getMinutes()),
    dateKey: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    monthKey: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
    timeKey: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}
