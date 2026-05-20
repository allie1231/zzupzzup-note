import { saveClipToCsv } from "./csv-writer.js";

export async function saveClip(clip) {
  return saveClipToCsv(clip);
}
