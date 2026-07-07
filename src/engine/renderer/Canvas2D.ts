/** Canvas 2D 渲染辅助工具
 *  - DPI 适配
 *  - 通用绘制函数
 */

export interface CanvasContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

/** 设置 Canvas 真实分辨率（按 DPR） */
export const setupCanvas = (canvas: HTMLCanvasElement): CanvasContext => {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context 不可用");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height, dpr };
};

/** 清屏 */
export const clear = (c: CanvasContext, color = "#000") => {
  c.ctx.fillStyle = color;
  c.ctx.fillRect(0, 0, c.width, c.height);
};

/** 绘制圆 */
export const drawCircle = (
  c: CanvasContext,
  x: number,
  y: number,
  r: number,
  fillStyle: string | CanvasGradient,
  strokeStyle?: string,
  strokeWidth?: number,
) => {
  const { ctx } = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle && strokeWidth) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
};

/** 绘制圆环（描边圆） */
export const drawRing = (
  c: CanvasContext,
  x: number,
  y: number,
  r: number,
  strokeStyle: string,
  strokeWidth: number,
) => {
  const { ctx } = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
};

/** 绘制矩形 */
export const drawRect = (
  c: CanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  fillStyle: string,
  radius?: number,
) => {
  const { ctx } = c;
  if (radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  } else {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(x, y, w, h);
  }
};

export const GAME_FONT = '"Code Pro", "SF Mono", ui-monospace, monospace';

/** 绘制文本（居中） */
export const drawText = (
  c: CanvasContext,
  text: string,
  x: number,
  y: number,
  opts: {
    font?: string;
    fillStyle?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  } = {},
) => {
  const { ctx } = c;
  ctx.font = opts.font || `14px ${GAME_FONT}`;
  ctx.fillStyle = opts.fillStyle || "#fff";
  ctx.textAlign = opts.align || "center";
  ctx.textBaseline = opts.baseline || "middle";
  ctx.fillText(text, x, y);
};

/** hex → rgba */
export const hexToRgba = (hex: string, alpha: number): string => {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/** 绘制带半透明填充的圆（毛玻璃风格） */
export const drawGlassCircle = (
  c: CanvasContext,
  x: number,
  y: number,
  r: number,
  baseColor: string,
  strokeColor: string = "rgba(255,255,255,0.5)",
  lineWidth: number = 2,
) => {
  const { ctx } = c;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
  ctx.restore();
};

/** 绘制带半透明填充的矩形（毛玻璃风格） */
export const drawGlassRect = (
  c: CanvasContext,
  x: number,
  y: number,
  w: number,
  h: number,
  fillStyle: string,
  radius?: number,
  strokeStyle?: string,
  strokeWidth?: number,
) => {
  const { ctx } = c;
  ctx.save();
  if (radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    if (strokeStyle && strokeWidth) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(x, y, w, h);
    if (strokeStyle && strokeWidth) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.strokeRect(x, y, w, h);
    }
  }
  ctx.restore();
};

/** 线性插值 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 限制范围 */
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
