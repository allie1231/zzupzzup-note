import { normalizeTags } from "./schema.js";

const RULES = [
  { tags: ["감정", "에세이"], words: ["사랑", "슬픔", "외로", "기쁨", "마음", "상처", "위로"] },
  { tags: ["시간", "기억"], words: ["시간", "기억", "과거", "미래", "순간", "언젠가", "어제"] },
  { tags: ["관계", "대화"], words: ["우리", "너", "나", "사람", "관계", "말", "침묵"] },
  { tags: ["일", "생산성"], words: ["일", "성공", "실패", "습관", "노력", "성장", "선택"] },
  { tags: ["비유", "문체"], words: ["처럼", "같이", "듯", "마치", "빛", "그림자", "바다"] },
  { tags: ["질문", "사유"], words: ["왜", "어떻게", "무엇", "질문", "생각", "의미"] },
  { tags: ["영어", "표현"], words: ["the", "and", "that", "what", "you", "i "] }
];

export function analyzeSentence(sentence) {
  const text = String(sentence || "").toLowerCase();
  const hits = new Set(["정보수집"]);
  for (const rule of RULES) {
    if (rule.words.some((word) => text.includes(word.toLowerCase()))) {
      rule.tags.forEach((tag) => hits.add(tag));
    }
  }

  const lengthTag = text.length > 120 ? "긴자료" : "짧은메모";
  hits.add(lengthTag);

  return {
    tags: normalizeTags([...hits]),
    reason: suggestReason(sentence),
    connection: "",
    useFor: suggestUseFor([...hits]),
    action: suggestAction([...hits])
  };
}

function suggestReason(sentence) {
  const text = String(sentence || "");
  if (/[?？]$/.test(text.trim())) return "나중에 다시 확인할 질문이나 단서가 있어서";
  if (text.includes("처럼") || text.includes("같이") || text.includes("듯")) return "이미지나 관점이 떠오르는 자료라서";
  if (text.length > 120) return "맥락까지 함께 보관할 만한 정보라서";
  return "나중에 다시 꺼내 쓸 정보라서";
}

function suggestUseFor(tags) {
  if (tags.includes("비유") || tags.includes("문체")) return "에세이";
  if (tags.includes("일") || tags.includes("생산성")) return "아이디어";
  if (tags.includes("질문") || tags.includes("사유")) return "일기";
  return "에세이";
}

function suggestAction(tags) {
  if (tags.includes("질문") || tags.includes("사유")) return "확장";
  if (tags.includes("비유") || tags.includes("문체")) return "고쳐쓰기";
  return "연결";
}
