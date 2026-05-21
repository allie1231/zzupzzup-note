import { saveClipToCloud } from "./supabase-writer.js";

export async function saveClip(clip) {
  await saveClipToCloud(clip);
  return "Supabase 서버 보관함";
}
