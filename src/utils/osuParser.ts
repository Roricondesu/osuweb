// .osu 文件解析器
// 格式参考：https://osu.ppy.sh/wiki/en/Client/File_formats/Osu_(file_format)
//
// .osu 是 INI 风格文本，分 sections：General / Metadata / Difficulty / TimingPoints / HitObjects / Events

import type {
  ParsedBeatmap,
  HitObject,
  HitObjectType,
  TimingPoint,
  GameMode,
  StoryboardSprite,
  StoryboardCommand,
  StoryboardLayer,
  StoryboardOrigin,
  StoryboardLoopCommand,
  StoryboardTriggerCommand,
} from "@/types";
import { MODE_FROM_ID } from "@/types";

const parseSection = (line: string): string | null => {
  const m = line.match(/^\[(.+)\]$/);
  return m ? m[1] : null;
};

const parseKV = (line: string): [string, string] | null => {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
};

const parseHitObjectType = (raw: number): { type: HitObjectType; newCombo: boolean } => {
  // 位掩码：1=circle, 2=slider, 4=new combo, 8=spinner, 128=hold
  const newCombo = (raw & 4) !== 0;
  let type: HitObjectType = "circle";
  if (raw & 128) type = "hold";
  else if (raw & 8) type = "spinner";
  else if (raw & 2) type = "slider";
  else if (raw & 1) type = "circle";
  return { type, newCombo };
};

const parseCurve = (params: string): HitObject["curveType"] => {
  if (!params) return undefined;
  const colon = params.indexOf("|");
  if (colon < 0) return undefined;
  const t = params.slice(0, colon);
  if (t === "B" || t === "C" || t === "L" || t === "P") return t;
  return undefined;
};

const parseCurvePoints = (params: string): { x: number; y: number }[] => {
  if (!params) return [];
  const colon = params.indexOf("|");
  if (colon < 0) return [];
  const rest = params.slice(colon + 1);
  return rest.split("|").map((p) => {
    const [x, y] = p.split(":").map(Number);
    return { x: x || 0, y: y || 0 };
  });
};

const computeManiaColumn = (x: number, cs: number): number => {
  // mania 列数 = CircleSize；x 范围 0-512，按列数均分
  const cols = Math.max(1, Math.round(cs));
  const colWidth = 512 / cols;
  return Math.min(cols - 1, Math.max(0, Math.floor(x / colWidth)));
};

/** 解析单行 HitObject */
const parseHitObjectLine = (line: string, mode: GameMode, cs: number): HitObject | null => {
  // x,y,time,type,hitSound,objectParams,hitSample
  const parts = line.split(",");
  if (parts.length < 4) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  const time = Number(parts[2]);
  const typeRaw = Number(parts[3]);
  if (Number.isNaN(time)) return null;

  const { type, newCombo } = parseHitObjectType(typeRaw);
  const obj: HitObject = {
    x,
    y,
    time,
    type,
    newCombo,
    hitSound: Number(parts[4]) || 0,
    judged: false,
    judgement: null,
  };

  // params 在第 6 位（slider）或 5（hold mania）
  const params = parts[5] || "";
  if (type === "slider") {
    obj.curveType = parseCurve(params);
    obj.curvePoints = parseCurvePoints(params);
    // slides 在第 7 位，length 在第 8 位（params 之后）
    obj.slides = Number(parts[6]) || 1;
    obj.length = Number(parts[7]) || 0;
  } else if (type === "spinner") {
    obj.endTime = Number(parts[5]) || time;
  } else if (type === "hold") {
    // mania hold：endTime 在 parts[5]（如果末尾有 ":"，是 hitSample）
    const endTimeStr = parts[5] || "";
    const colon = endTimeStr.indexOf(":");
    const et = colon >= 0 ? Number(endTimeStr.slice(0, colon)) : Number(endTimeStr);
    obj.endTime = Number.isNaN(et) ? time : et;
  }

  if (mode === "mania") {
    obj.column = computeManiaColumn(x, cs);
  }

  return obj;
};

const parseTimingPoint = (line: string): TimingPoint | null => {
  // time,beatLength,meter,sampleSet,sampleIndex,volume,uninherited,effects
  const parts = line.split(",");
  if (parts.length < 2) return null;
  const time = Number(parts[0]);
  const beatLength = Number(parts[1]);
  if (Number.isNaN(time) || Number.isNaN(beatLength)) return null;
  const meter = Number(parts[2]) || 4;
  const sampleSet = Number(parts[3]) || 0;
  const sampleIndex = Number(parts[4]) || 0;
  const volume = Number(parts[5]) || 100;
  const uninherited = parts[6] !== "0";
  const effects = Number(parts[7]) || 0;
  return {
    time,
    beatLength,
    meter,
    sampleSet,
    sampleIndex,
    volume,
    uninherited,
    kiai: (effects & 1) !== 0,
  };
};

// === Storyboard 解析 ===

const LAYER_MAP: Record<string, StoryboardLayer> = {
  background: "Background",
  fail: "Fail",
  pass: "Pass",
  foreground: "Foreground",
  overlay: "Overlay",
  0: "Background",
  1: "Fail",
  2: "Pass",
  3: "Foreground",
  4: "Overlay",
};

const ORIGIN_MAP: Record<string, StoryboardOrigin> = {
  topleft: "TopLeft",
  topcentre: "TopCentre",
  topcenter: "TopCentre",
  topright: "TopRight",
  centreleft: "CentreLeft",
  centerleft: "CentreLeft",
  centre: "Centre",
  center: "Centre",
  centreright: "CentreRight",
  centerright: "CentreRight",
  bottomleft: "BottomLeft",
  bottomcentre: "BottomCentre",
  bottomcenter: "BottomCentre",
  bottomright: "BottomRight",
};

const parseLayer = (raw: string): StoryboardLayer =>
  LAYER_MAP[raw.trim().toLowerCase()] || "Background";
const parseOrigin = (raw: string): StoryboardOrigin =>
  ORIGIN_MAP[raw.trim().toLowerCase()] || "Centre";

const stripQuotes = (s: string): string => s.replace(/^"/, "").replace(/"$/, "");

const parseCommand = (line: string): StoryboardCommand | null => {
  // 命令行可能有前导缩进（循环内），先去掉
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(",");
  if (parts.length < 2) return null;

  const type = parts[0] as StoryboardCommand["type"];
  const easing = Number(parts[1]) || 0;
  const startTime = Number(parts[2]) || 0;
  // 第四项可能是 endTime 或第一个参数；通过 type 判断
  let paramStart = 3;
  let endTime = startTime;

  switch (type) {
    case "F":
    case "M":
    case "MX":
    case "MY":
    case "S":
    case "V":
    case "R":
    case "C":
      // 这些命令都有 endTime 在 parts[3]；空字符串表示与 startTime 相同
      if (parts.length > 3) {
        const endPart = parts[3].trim();
        if (endPart !== "" && !Number.isNaN(Number(endPart))) {
          endTime = Number(endPart);
        }
        paramStart = 4;
      }
      break;
    case "P":
      // P,easing,startTime,parameter
      endTime = startTime;
      paramStart = 3;
      break;
    default:
      return null;
  }

  const rest = parts.slice(paramStart).map((p) => p.trim());
  const num = (idx: number): number | undefined => {
    const v = rest[idx];
    if (v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };

  switch (type) {
    case "F": {
      if (rest.length < 1) return null;
      const endOpacity = num(rest.length >= 2 ? 1 : 0) ?? 1;
      const startOpacity = rest.length >= 2 ? (num(0) ?? endOpacity) : 1;
      return {
        type: "F",
        startTime,
        endTime,
        easing,
        startOpacity,
        endOpacity,
      };
    }
    case "M": {
      if (rest.length < 2) return null;
      // 支持简写：M,,endX,endY（省略 startX/startY）
      const full = rest.length >= 4;
      const sx = full ? num(0) : undefined;
      const sy = full ? num(1) : undefined;
      const ex = full ? num(2) : num(0);
      const ey = full ? num(3) : num(1);
      if (ex === undefined || ey === undefined) return null;
      return {
        type: "M",
        startTime,
        endTime,
        easing,
        startX: sx,
        startY: sy,
        endX: ex,
        endY: ey,
      };
    }
    case "MX": {
      if (rest.length < 1) return null;
      const sx = rest.length >= 2 ? num(0) : undefined;
      const ex = rest.length >= 2 ? num(1) : num(0);
      if (ex === undefined) return null;
      return {
        type: "MX",
        startTime,
        endTime,
        easing,
        startX: sx,
        endX: ex,
      };
    }
    case "MY": {
      if (rest.length < 1) return null;
      const sy = rest.length >= 2 ? num(0) : undefined;
      const ey = rest.length >= 2 ? num(1) : num(0);
      if (ey === undefined) return null;
      return {
        type: "MY",
        startTime,
        endTime,
        easing,
        startY: sy,
        endY: ey,
      };
    }
    case "S": {
      if (rest.length < 1) return null;
      const endScale = num(rest.length >= 2 ? 1 : 0) ?? 1;
      const startScale = rest.length >= 2 ? (num(0) ?? endScale) : 1;
      return {
        type: "S",
        startTime,
        endTime,
        easing,
        startScale,
        endScale,
      };
    }
    case "V": {
      if (rest.length < 2) return null;
      const full = rest.length >= 4;
      const sx = full ? num(0) : undefined;
      const sy = full ? num(1) : undefined;
      const ex = full ? num(2) : num(0);
      const ey = full ? num(3) : num(1);
      if (ex === undefined || ey === undefined) return null;
      return {
        type: "V",
        startTime,
        endTime,
        easing,
        startScaleX: sx,
        startScaleY: sy,
        endScaleX: ex,
        endScaleY: ey,
      };
    }
    case "R": {
      if (rest.length < 1) return null;
      const endRotation = num(rest.length >= 2 ? 1 : 0) ?? 0;
      const startRotation = rest.length >= 2 ? (num(0) ?? endRotation) : 0;
      return {
        type: "R",
        startTime,
        endTime,
        easing,
        startRotation,
        endRotation,
      };
    }
    case "C": {
      if (rest.length < 3) return null;
      const full = rest.length >= 6;
      const sr = full ? num(0) : num(0);
      const sg = full ? num(1) : num(1);
      const sb = full ? num(2) : num(2);
      const er = full ? num(3) : num(0);
      const eg = full ? num(4) : num(1);
      const eb = full ? num(5) : num(2);
      if (er === undefined || eg === undefined || eb === undefined) return null;
      return {
        type: "C",
        startTime,
        endTime,
        easing,
        startR: sr,
        startG: sg,
        startB: sb,
        endR: er,
        endG: eg,
        endB: eb,
      };
    }
    case "P": {
      if (rest.length < 1) return null;
      const p = rest[0];
      if (p !== "H" && p !== "V" && p !== "A") return null;
      return {
        type: "P",
        startTime,
        endTime,
        easing: 0,
        parameter: p,
      };
    }
  }

  return null;
};

/** 将循环命令展开为绝对时间 */
const flattenCommands = (
  commands: StoryboardCommand[],
  baseTime = 0,
): StoryboardCommand[] => {
  const out: StoryboardCommand[] = [];
  for (const c of commands) {
    if (c.type === "L") {
      const loopBase = baseTime + c.startTime;
      // 循环时长 = 内部命令最大相对 endTime（至少 1ms 避免除零）
      const loopDuration = c.commands.length > 0
        ? Math.max(1, ...c.commands.map((cmd) => Math.max(cmd.endTime, cmd.startTime)))
        : 1;
      for (let i = 0; i < c.loopCount; i++) {
        out.push(...flattenCommands(c.commands, loopBase + i * loopDuration));
      }
    } else if (c.type === "T") {
      // 触发器依赖运行时条件（血量/音效等），当前无法准确判断，
      // 直接展开会导致大量元素在不该出现时显示，因此暂不展开。
      continue;
    } else {
      const shifted = { ...c, startTime: baseTime + c.startTime, endTime: baseTime + c.endTime };
      out.push(shifted);
    }
  }
  return out;
};

/** 解析 Storyboard 的 Events 区段原始文本 */
export const parseStoryboardEvents = (text: string): StoryboardSprite[] => {
  const lines = text.split(/\r?\n/);
  const sprites: StoryboardSprite[] = [];
  let current: StoryboardSprite | null = null;
  // 记录每个循环/触发器行自身的缩进；子命令缩进必须严格更大
  let stack: { loop: StoryboardCommand; indent: number }[] = [];

  const closeLoopsToIndent = (indent: number) => {
    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      const top = stack.pop();
      if (top?.loop && current) {
        current.commands.push(top.loop);
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;

    // 缩进级别：用于循环 / 触发器嵌套
    const indentMatch = raw.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    const parts = line.split(",");
    const head = parts[0].trim().toLowerCase();

    if (head === "sprite" || head === "animation") {
      // 保存上一个 sprite 的命令（先关闭所有未闭合循环）
      closeLoopsToIndent(-1);
      if (current) {
        sprites.push(current);
      }
      stack = [];
      const isAnimation = head === "animation";
      const layer = parseLayer(parts[1] || "Background");
      const origin = parseOrigin(parts[2] || "Centre");
      const fileName = stripQuotes(parts[3] || "");
      const x = Number(parts[4]) || 0;
      const y = Number(parts[5]) || 0;
      current = {
        type: isAnimation ? "animation" : "sprite",
        layer,
        origin,
        fileName,
        x,
        y,
        commands: [],
      };
      if (isAnimation) {
        current.frameCount = Number(parts[6]) || 1;
        current.frameDelay = Number(parts[7]) || 0;
        current.loopType = (parts[8] || "LoopForever") as "LoopOnce" | "LoopForever";
      }
      continue;
    }

    if (!current) continue;

    if (head === "l") {
      // 进入新循环前，先关闭同级或外层缩进不小于当前行的循环
      closeLoopsToIndent(indent);
      // L,startTime,loopCount
      const startTime = Number(parts[1]) || 0;
      const loopCount = Number(parts[2]) || 1;
      stack.push({
        loop: { type: "L", startTime, endTime: startTime, easing: 0, loopCount, commands: [] } as StoryboardCommand,
        indent,
      });
      continue;
    }

    if (head === "t") {
      closeLoopsToIndent(indent);
      // T,triggerName,startTime,endTime
      const triggerName = parts[1] || "";
      const startTime = Number(parts[2]) || 0;
      const endTime = Number(parts[3]) || startTime;
      stack.push({
        loop: { type: "T", triggerName, startTime, endTime, easing: 0, startCondition: 0, endCondition: 0, groupNumber: 0, commands: [] } as StoryboardCommand,
        indent,
      });
      continue;
    }

    // 普通命令：先按当前缩进关闭循环栈
    closeLoopsToIndent(indent);

    const cmd = parseCommand(line);
    if (!cmd) continue;

    // 如果有循环栈，加到最内层 loop 的 commands
    if (stack.length > 0) {
      const topLoop = stack[stack.length - 1].loop;
      if (topLoop && (topLoop.type === "L" || topLoop.type === "T")) {
        (topLoop as StoryboardLoopCommand | StoryboardTriggerCommand).commands.push(cmd);
        continue;
      }
    }

    current.commands.push(cmd);
  }

  // 文件末尾关闭所有未闭合循环
  closeLoopsToIndent(-1);

  if (current) {
    sprites.push(current);
  }

  // 展开循环
  for (const s of sprites) {
    s.commands = flattenCommands(s.commands);
  }

  return sprites;
};

/** 解析 [Events] 区段，返回背景和 storyboard 精灵 */
export const parseEventsSection = (
  text: string,
): { backgroundFilename?: string; storyboard: StoryboardSprite[] } => {
  const lines = text.split(/\r?\n/);
  let inEvents = false;
  const eventLines: string[] = [];
  let backgroundFilename: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    const sec = parseSection(line);
    if (sec) {
      inEvents = sec === "Events";
      continue;
    }
    if (!inEvents) continue;
    eventLines.push(rawLine);

    // 背景事件：0,0,"bg.jpg"
    if (line.startsWith("0,")) {
      const m = line.match(/0,0,\s*"?([^"]+)"?/);
      if (m) backgroundFilename = m[1];
    }
  }

  return {
    backgroundFilename,
    storyboard: parseStoryboardEvents(eventLines.join("\n")),
  };
};

export const parseOsu = (text: string): ParsedBeatmap => {
  const lines = text.split(/\r?\n/);
  let section = "";
  const result: ParsedBeatmap = {
    formatVersion: 14,
    audioFilename: "",
    mode: "standard",
    title: "",
    titleUnicode: "",
    artist: "",
    artistUnicode: "",
    creator: "",
    beatmapId: 0,
    beatmapSetId: 0,
    hp: 5,
    cs: 5,
    od: 5,
    ar: 5,
    sliderMultiplier: 1.4,
    sliderTickRate: 1,
    timingPoints: [],
    hitObjects: [],
    storyboard: [],
  };

  const timingPoints: TimingPoint[] = [];
  const hitObjects: HitObject[] = [];
  const eventLines: string[] = [];
  const comboColors: string[] = [];
  let inEvents = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    const sec = parseSection(line);
    if (sec) {
      section = sec;
      inEvents = section === "Events";
      if (inEvents) continue;
      continue;
    }

    if (section === "Events") {
      eventLines.push(rawLine);
      if (line.startsWith("0,")) {
        const m = line.match(/0,0,\s*"?([^"]+)"?/);
        if (m) result.backgroundFilename = m[1];
      }
      continue;
    }

    if (section === "General") {
      const kv = parseKV(line);
      if (!kv) continue;
      const [k, v] = kv;
      if (k === "AudioFilename") result.audioFilename = v;
      else if (k === "Mode") {
        const num = Number(v);
        if (!Number.isNaN(num)) {
          result.mode = MODE_FROM_ID[num] || "standard";
        } else {
          const word = v.toLowerCase();
          const map: Record<string, GameMode> = {
            osu: "standard",
            standard: "standard",
            taiko: "taiko",
            fruits: "catch",
            catch: "catch",
            mania: "mania",
          };
          result.mode = map[word] || "standard";
        }
      }
      else if (k === "StackLeniency") {
        /* 暂不处理堆叠 */
      }
    } else if (section === "Metadata") {
      const kv = parseKV(line);
      if (!kv) continue;
      const [k, v] = kv;
      if (k === "Title") result.title = v;
      else if (k === "TitleUnicode") result.titleUnicode = v;
      else if (k === "Artist") result.artist = v;
      else if (k === "ArtistUnicode") result.artistUnicode = v;
      else if (k === "Creator") result.creator = v;
      else if (k === "BeatmapID") result.beatmapId = Number(v) || 0;
      else if (k === "BeatmapSetID") result.beatmapSetId = Number(v) || 0;
    } else if (section === "Difficulty") {
      const kv = parseKV(line);
      if (!kv) continue;
      const [k, v] = kv;
      const num = Number(v);
      if (Number.isNaN(num)) continue;
      if (k === "HPDrainRate") result.hp = num;
      else if (k === "CircleSize") result.cs = num;
      else if (k === "OverallDifficulty") result.od = num;
      else if (k === "ApproachRate") result.ar = num;
      else if (k === "SliderMultiplier") result.sliderMultiplier = num;
      else if (k === "SliderTickRate") result.sliderTickRate = num;
    } else if (section === "Colours") {
      const kv = parseKV(line);
      if (!kv) continue;
      const [k, v] = kv;
      if (k.startsWith("Combo") && comboColors.length < 8) {
        const parts = v.split(",").map((s) => parseInt(s.trim(), 10));
        if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
          comboColors.push(`#${parts.slice(0, 3).map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("")}`);
        }
      }
    } else if (section === "TimingPoints") {
      const tp = parseTimingPoint(line);
      if (tp) timingPoints.push(tp);
    } else if (section === "HitObjects") {
      const ho = parseHitObjectLine(line, result.mode, result.cs);
      if (ho) hitObjects.push(ho);
    }
  }

  // ApproachRate 默认等于 OverallDifficulty
  if (result.ar === 0 && result.od) result.ar = result.od;

  if (comboColors.length > 0) result.comboColors = comboColors;
  result.timingPoints = timingPoints;
  result.hitObjects = hitObjects.sort((a, b) => a.time - b.time);

  // 解析 Storyboard
  if (eventLines.length > 0) {
    result.storyboard = parseStoryboardEvents(eventLines.join("\n"));
  }

  return result;
};

/** 给定时间点查找当前 BPM */
export const getBPMAt = (timingPoints: TimingPoint[], time: number): number => {
  let current = timingPoints[0];
  for (const tp of timingPoints) {
    if (tp.time > time) break;
    if (tp.uninherited && tp.beatLength > 0) current = tp;
  }
  if (!current || !current.beatLength || current.beatLength <= 0) return 180;
  return Math.round(60000 / current.beatLength);
};
