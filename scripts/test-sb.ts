import fs from "fs";
import { parseStoryboardEvents } from "../src/utils/osuParser";

const file = process.argv[2] || "/tmp/osu_analysis/2067764/YOASOBI - Yuusha (iljaaz).osb";
const text = fs.readFileSync(file, "utf8");
const sprites = parseStoryboardEvents(text);

console.log("Total sprites:", sprites.length);

// 检查 frieren.png 和 bg.jpg 的 sprite 命令
for (const s of sprites) {
  if (s.fileName?.toLowerCase().includes("frieren.png") || s.fileName?.toLowerCase().includes("asset\\bg.jpg")) {
    console.log(`\n--- ${s.fileName} (${s.x},${s.y}) ---`);
    for (const c of s.commands.slice(0, 8)) {
      const extra: string[] = [];
      if ("startX" in c) extra.push(`sx:${(c as any).startX},ex:${(c as any).endX}`);
      if ("startY" in c) extra.push(`sy:${(c as any).startY},ey:${(c as any).endY}`);
      if ("startScale" in c) extra.push(`ss:${(c as any).startScale},es:${(c as any).endScale}`);
      if ("startOpacity" in c) extra.push(`so:${(c as any).startOpacity},eo:${(c as any).endOpacity}`);
      console.log(c.type, c.startTime, c.endTime, ...extra);
    }
  }
}
