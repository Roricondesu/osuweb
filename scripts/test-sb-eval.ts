import fs from "fs";
import { parseStoryboardEvents, type StoryboardCommand } from "../src/utils/osuParser";

const file = process.argv[2] || "/tmp/osu_analysis/2067764/YOASOBI - Yuusha (iljaaz).osb";
const text = fs.readFileSync(file, "utf8");
const sprites = parseStoryboardEvents(text);

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function ease(t: number, _easing: number): number {
  return clamp(t, 0, 1);
}

function lastCmd(list: (StoryboardCommand & { startTime: number; endTime: number })[] | undefined, time: number) {
  if (!list || list.length === 0) return null;
  let ans = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].startTime <= time) ans = i;
  }
  return ans < 0 ? null : (list[ans] as any);
}

function firstMoveTime(cmds: StoryboardCommand[]) {
  let t = Infinity;
  for (const c of cmds) {
    if (c.type === "M" || c.type === "MX" || c.type === "MY") t = Math.min(t, c.startTime);
  }
  return t;
}

let visible = 0;
for (const s of sprites) {
  const hasF = s.commands.some((c) => c.type === "F");
  const fTime = hasF
    ? Math.min(...s.commands.filter((c) => c.type === "F").map((c) => c.startTime))
    : Infinity;
  const mTime = firstMoveTime(s.commands);
  const hideUntilMove = fTime === Infinity && mTime > 0;

  let alpha = fTime === Infinity ? 1 : 0;
  if (hideUntilMove && 0 < mTime) alpha = 0;

  const fades = s.commands.filter((c) => c.type === "F").sort((a, b) => a.startTime - b.startTime);
  const fade = lastCmd(fades as any, 0);
  if (fade) {
    const f = fade as any;
    const dur = f.endTime - f.startTime;
    alpha = dur <= 0 ? f.endOpacity : f.startOpacity + (f.endOpacity - f.startOpacity) * ease((0 - f.startTime) / dur, f.easing);
  }

  if (alpha > 0.01) {
    visible++;
    console.log(s.fileName, `(${s.x},${s.y})`, "alpha:", alpha.toFixed(2), "firstF:", fTime);
  }
}
console.log("Visible:", visible);
