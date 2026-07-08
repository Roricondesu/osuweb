/** 引擎工厂：根据模式创建对应引擎实例 */
import type { GameMode } from "@/types";
import { GameEngine, type EngineOptions } from "./GameEngine";
import { StandardEngine } from "./modes/StandardEngine";
import { TaikoEngine } from "./modes/TaikoEngine";
import { CatchEngine } from "./modes/CatchEngine";
import { ManiaEngine } from "./modes/ManiaEngine";

export const createEngine = (
  mode: GameMode,
  opts: EngineOptions,
): GameEngine => {
  switch (mode) {
    case "taiko":
      return new TaikoEngine(opts);
    case "catch":
      return new CatchEngine(opts);
    case "mania":
      return new ManiaEngine(opts);
    case "standard":
    default:
      return new StandardEngine(opts);
  }
};

export { GameEngine } from "./GameEngine";
export type { ScoreState } from "./Judger";
