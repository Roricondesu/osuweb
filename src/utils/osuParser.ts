// .osu 文件解析器
// 格式参考：https://osu.ppy.sh/wiki/en/Client/File_formats/Osu_(file_format)
//
// .osu 是 INI 风格文本，分 sections：General / Metadata / Difficulty / TimingPoints / HitObjects

import type {
  ParsedBeatmap,
  HitObject,
  HitObjectType,
  TimingPoint,
  GameMode,
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
    judged: false,
    judgement: null,
  };

  // params 在第 6 位（slider）或 5（hold mania）
  const params = parts[5] || "";
  if (type === "slider") {
    obj.curveType = parseCurve(params);
    obj.curvePoints = parseCurvePoints(params);
    // slides 在第 7 位，length 在第 8 位（params 之后）
    const afterCurve = params.split("|");
    // afterCurve[0] 是 curveType；曲线点最后一段是 "slides:length"
    // 实际上整个 objectParams 是 curveType|p1|p2|...
    // 然后 slides 和 length 在 parts[6] 和 parts[7]
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
  const volume = Number(parts[5]) || 100;
  const uninherited = parts[6] !== "0";
  const effects = Number(parts[7]) || 0;
  return {
    time,
    beatLength,
    meter,
    volume,
    uninherited,
    kiai: (effects & 1) !== 0,
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
  };

  const timingPoints: TimingPoint[] = [];
  const hitObjects: HitObject[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    const sec = parseSection(line);
    if (sec) {
      section = sec;
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

  result.timingPoints = timingPoints;
  result.hitObjects = hitObjects.sort((a, b) => a.time - b.time);
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
