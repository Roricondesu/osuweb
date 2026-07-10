import React, { useState, useCallback, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { GlassSwitch, GlassSlider } from "@/components/glass";
import {
  Moon,
  Volume2,
  Clock,
  Palette,
  Info,
  Gamepad2,
  Search,
  Download,
  Image,
  Music,
  Activity,
  ChevronDown,
  Maximize,
  RotateCcw,
  Trash2,
  Zap,
  Brush,
} from "lucide-react";
import type { Settings, ModType } from "@/types";
import { DEFAULT_SETTINGS, MOD_LABEL, MOD_COLOR } from "@/types";
import { checkApiHealth, type ApiHealthResult } from "@/utils/apiHealth";
import { deleteReplay, loadReplays } from "@/utils/replayStorage";

const ALL_MODS: ModType[] = [
  "easy", "notail", "halfTime", "hardRock", "suddenDeath",
  "doubleTime", "hidden", "flashlight", "relax", "autopilot",
];

const ACCENTS = [
  { key: "#0a84ff", label: "蓝" },
  { key: "#ff375f", label: "红" },
  { key: "#ff9100", label: "橙" },
  { key: "#66cc44", label: "绿" },
  { key: "#9966ff", label: "紫" },
  { key: "#ff66aa", label: "粉" },
];

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
  open?: boolean;
  onToggle?: () => void;
}> = ({ icon, title, children, delay = 1, open = true, onToggle }) => (
  <section className={`animate-enter animate-enter-${delay}`}>
    <div className="solid-card p-5">
      <button
        type="button"
        onClick={onToggle}
        className="mb-4 flex w-full items-center justify-between"
        style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-secondary)" }}>{icon}</span>
          <h2 className="text-base font-semibold md:text-lg" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
        </div>
        <ChevronDown
          size={18}
          style={{
            color: "var(--text-secondary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </button>
      <div className={`collapsible-content ${open ? "open" : ""}`}>
        <div className="collapsible-inner">{children}</div>
      </div>
    </div>
  </section>
);

export default function Settings() {
  const settings = useGameStore((s) => s.settings);
  const updateSetting = useGameStore((s) => s.updateSetting);
  const importSkinFile = useGameStore((s) => s.importSkinFile);
  const scheme = settings.theme === "dark" ? "dark" : "light";
  const [health, setHealth] = React.useState<ApiHealthResult | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const [skinImporting, setSkinImporting] = useState(false);
  const [skinImportMsg, setSkinImportMsg] = useState<string>("");
  const skinInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleMod = useCallback((mod: ModType) => {
    const current = settings.mods;
    const next = current.includes(mod)
      ? current.filter((m) => m !== mod)
      : [...current, mod];
    updateSetting("mods", next);
  }, [settings.mods, updateSetting]);

  const handleSkinImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSkinImporting(true);
    setSkinImportMsg("");
    try {
      const ok = await importSkinFile(file);
      if (ok) {
        updateSetting("useCustomSkin", true);
        setSkinImportMsg(`已导入皮肤：${file.name}`);
      } else {
        setSkinImportMsg("导入失败：无法解析该皮肤文件");
      }
    } catch {
      setSkinImportMsg("导入失败：文件损坏或格式不支持");
    } finally {
      setSkinImporting(false);
      if (skinInputRef.current) skinInputRef.current.value = "";
    }
  }, [importSkinFile, updateSetting]);

  const resetSettings = useCallback(() => {
    (Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>).forEach((key) => {
      updateSetting(key, DEFAULT_SETTINGS[key]);
    });
  }, [updateSetting]);

  const clearReplays = useCallback(() => {
    loadReplays().forEach((r) => deleteReplay(r.id));
  }, []);

  const runCheck = async () => {
    setChecking(true);
    setHealth(null);
    try {
      const res = await checkApiHealth();
      setHealth(res);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="page-shell mx-auto max-w-3xl space-y-4">
      <Section icon={<Moon size={18} />} title="外观" delay={1} open={openSections.has("appearance")} onToggle={() => toggleSection("appearance")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>深色主题</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>切换浅色 / 深色界面</div>
            </div>
            <GlassSwitch
              checked={settings.theme === "dark"}
              onCheckedChange={(c) => updateSetting("theme", c ? "dark" : "light")}
              scheme={scheme}
              ariaLabel="深色主题"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Palette size={14} style={{ color: "var(--text-secondary)" }} />
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>主题色</div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => {
                const selected = settings.accent === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => updateSetting("accent", a.key)}
                    aria-label={a.label}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: a.key,
                      border: selected ? "3px solid var(--text-primary)" : "3px solid transparent",
                      boxShadow: selected ? `0 0 0 2px ${a.key}40` : "none",
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section icon={<Volume2 size={18} />} title="音量" delay={2} open={openSections.has("audio")} onToggle={() => toggleSection("audio")}>
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>音乐音量</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <GlassSlider
              value={settings.volume}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateSetting("volume", v)}
              scheme={scheme}
              ariaLabel="音量"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>播放速度</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                ×{settings.playbackRate.toFixed(2)}
              </span>
            </div>
            <GlassSlider
              value={settings.playbackRate}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(v) => updateSetting("playbackRate", v)}
              scheme={scheme}
              ariaLabel="播放速度"
            />
          </div>
        </div>
      </Section>

      <Section icon={<Clock size={18} />} title="判定偏移" delay={3} open={openSections.has("timing")} onToggle={() => toggleSection("timing")}>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span style={{ color: "var(--text-primary)" }}>音频偏移（ms）</span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
              {settings.offset > 0 ? "+" : ""}
              {settings.offset}
            </span>
          </div>
          <p className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            正值 = 提前判定（适合音频延迟大的设备），负值 = 推后判定
          </p>
          <GlassSlider
            value={settings.offset}
            min={-200}
            max={200}
            step={5}
            onChange={(v) => updateSetting("offset", v)}
            scheme={scheme}
            ariaLabel="判定偏移"
          />
        </div>
      </Section>

      <Section icon={<Gamepad2 size={18} />} title="游戏" delay={4} open={openSections.has("game")} onToggle={() => toggleSection("game")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>自动模式</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>自动击打音符，适合练习观赏</div>
            </div>
            <GlassSwitch
              checked={settings.auto}
              onCheckedChange={(c) => updateSetting("auto", c)}
              scheme={scheme}
              ariaLabel="自动模式"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示光标</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>在游戏画面中显示指针位置</div>
            </div>
            <GlassSwitch
              checked={settings.showCursor}
              onCheckedChange={(c) => updateSetting("showCursor", c)}
              scheme={scheme}
              ariaLabel="显示光标"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>光标拖尾</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Auto / 显示光标时绘制移动轨迹</div>
            </div>
            <GlassSwitch
              checked={settings.showCursorTrail}
              onCheckedChange={(c) => updateSetting("showCursorTrail", c)}
              scheme={scheme}
              ariaLabel="光标拖尾"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>光标按下反馈</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>点击 / Auto 击打时放大光圈</div>
            </div>
            <GlassSwitch
              checked={settings.showCursorPress}
              onCheckedChange={(c) => updateSetting("showCursorPress", c)}
              scheme={scheme}
              ariaLabel="光标按下反馈"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>光标大小</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                ×{settings.cursorSize.toFixed(1)}
              </span>
            </div>
            <GlassSlider
              value={settings.cursorSize}
              min={0.5}
              max={2}
              step={0.1}
              onChange={(v) => updateSetting("cursorSize", v)}
              scheme={scheme}
              ariaLabel="光标大小"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>Auto 光标速度</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {settings.autoCursorSpeed.toFixed(1)}x
              </span>
            </div>
            <GlassSlider
              value={settings.autoCursorSpeed}
              min={0.5}
              max={2.0}
              step={0.1}
              onChange={(v) => updateSetting("autoCursorSpeed", v)}
              scheme={scheme}
              ariaLabel="Auto 光标速度"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Auto 圆周模式</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>光标沿圆弧匀速移动，流畅衔接每个音符</div>
            </div>
            <GlassSwitch
              checked={settings.autoCircleMode}
              onCheckedChange={(c) => updateSetting("autoCircleMode", c)}
              scheme={scheme}
              ariaLabel="Auto 圆周模式"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>按键音音量</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {Math.round(settings.hitSoundVolume * 100)}%
              </span>
            </div>
            <p className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              使用谱面自带音效（normal / soft / drum）
            </p>
            <GlassSlider
              value={settings.hitSoundVolume}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateSetting("hitSoundVolume", v)}
              scheme={scheme}
              ariaLabel="按键音音量"
            />
          </div>
        </div>
      </Section>

      <Section icon={<Zap size={18} />} title="Mod" delay={5} open={openSections.has("mod")} onToggle={() => toggleSection("mod")}>
        <div className="flex flex-col gap-4">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            点击切换 Mod，可多选。难度调整类（DT/HT/HR/Easy）会实际影响游戏速度与判定。
          </p>
          <div className="flex flex-wrap gap-2.5">
            {ALL_MODS.map((mod) => {
              const active = settings.mods.includes(mod);
              const color = MOD_COLOR[mod];
              return (
                <button
                  key={mod}
                  onClick={() => toggleMod(mod)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold transition-transform active:scale-95"
                  style={{
                    border: "1px solid",
                    borderColor: active ? color : "var(--border)",
                    color: active ? "#fff" : "var(--text-primary)",
                    background: active ? color : "transparent",
                    boxShadow: active ? `0 0 12px ${color}55` : "none",
                    cursor: "pointer",
                  }}
                >
                  {MOD_LABEL[mod]}
                </button>
              );
            })}
          </div>
          {settings.mods.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                已启用 {settings.mods.length} 个 Mod
              </span>
              <button
                onClick={() => updateSetting("mods", [])}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                清除全部
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section icon={<Brush size={18} />} title="皮肤" delay={6} open={openSections.has("skin")} onToggle={() => toggleSection("skin")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>使用谱面自带皮肤</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>加载谱面包内的 hitcircle / cursor / slider 等纹理</div>
            </div>
            <GlassSwitch
              checked={settings.useBeatmapSkin}
              onCheckedChange={(c) => updateSetting("useBeatmapSkin", c)}
              scheme={scheme}
              ariaLabel="使用谱面自带皮肤"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>使用自定义皮肤</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>应用导入的 .osk 皮肤，优先级高于谱面皮肤</div>
            </div>
            <GlassSwitch
              checked={settings.useCustomSkin}
              onCheckedChange={(c) => updateSetting("useCustomSkin", c)}
              scheme={scheme}
              ariaLabel="使用自定义皮肤"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>导入 .osk 皮肤</div>
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>从本地选择 osu! 皮肤压缩包</div>
              </div>
              <button
                onClick={() => skinInputRef.current?.click()}
                disabled={skinImporting}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  background: "var(--accent-soft)",
                  cursor: skinImporting ? "not-allowed" : "pointer",
                }}
              >
                {skinImporting ? "导入中..." : "选择文件"}
              </button>
              <input
                ref={skinInputRef}
                type="file"
                accept=".osk,.zip"
                onChange={handleSkinImport}
                style={{ display: "none" }}
              />
            </div>
            {skinImportMsg && (
              <p className="text-xs" style={{ color: "var(--accent)" }}>{skinImportMsg}</p>
            )}
            {settings.useCustomSkin && settings.customSkinAssetUrls && (
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                当前皮肤已加载 {Object.keys(settings.customSkinAssetUrls).length} 个资源文件
              </p>
            )}
          </div>

          {/* 默认皮肤自定义属性 */}
          <div className="mt-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              默认皮肤自定义
            </div>

            {/* 自定义 combo 颜色 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>自定义 Combo 颜色</div>
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>覆盖默认 8 色 combo 配色</div>
              </div>
              <GlassSwitch
                checked={settings.useCustomComboColors}
                onCheckedChange={(c) => updateSetting("useCustomComboColors", c)}
                scheme={scheme}
                ariaLabel="自定义 Combo 颜色"
              />
            </div>
            {settings.useCustomComboColors && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {settings.customComboColors.map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const next = [...settings.customComboColors];
                        next[i] = e.target.value;
                        updateSetting("customComboColors", next);
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: "transparent",
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (settings.customComboColors.length < 8) {
                      updateSetting("customComboColors", [...settings.customComboColors, "#ffffff"]);
                    }
                  }}
                  disabled={settings.customComboColors.length >= 8}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  + 添加
                </button>
                <button
                  onClick={() => updateSetting("customComboColors", ["#f472b6", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15"])}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-transform active:scale-95"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer" }}
                >
                  重置
                </button>
              </div>
            )}

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>圆圈缩放</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.hitCircleScale.toFixed(2)}x</span>
              </div>
              <GlassSlider
                min={0.5}
                max={2}
                step={0.05}
                value={settings.hitCircleScale}
                onChange={(v) => updateSetting("hitCircleScale", v)}
                scheme={scheme}
              />
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>圆圈边框宽度</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.circleBorderWidth.toFixed(2)}x</span>
              </div>
              <GlassSlider
                min={0.5}
                max={3}
                step={0.05}
                value={settings.circleBorderWidth}
                onChange={(v) => updateSetting("circleBorderWidth", v)}
                scheme={scheme}
              />
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>滑条边框宽度</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.sliderBorderWidth.toFixed(2)}x</span>
              </div>
              <GlassSlider
                min={0.5}
                max={3}
                step={0.05}
                value={settings.sliderBorderWidth}
                onChange={(v) => updateSetting("sliderBorderWidth", v)}
                scheme={scheme}
              />
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>滑条球缩放</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.sliderBallScale.toFixed(2)}x</span>
              </div>
              <GlassSlider
                min={0.5}
                max={2}
                step={0.05}
                value={settings.sliderBallScale}
                onChange={(v) => updateSetting("sliderBallScale", v)}
                scheme={scheme}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section icon={<Search size={18} />} title="搜索" delay={5} open={openSections.has("search")} onToggle={() => toggleSection("search")}>
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>搜索源</div>
            <div className="mt-2 flex gap-2">
              {(["osu", "sayobot"] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => updateSetting("searchSource", src)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
                  style={{
                    border: "1px solid",
                    borderColor: settings.searchSource === src ? "var(--accent)" : "var(--border)",
                    color: settings.searchSource === src ? "var(--accent)" : "var(--text-primary)",
                    background: settings.searchSource === src ? "var(--accent-soft)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {src === "osu" ? "osu.direct" : "Sayobot"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>仅显示有 Storyboard</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>osu.direct 结果过滤（Sayobot 不支持）</div>
            </div>
            <GlassSwitch
              checked={settings.storyboardOnly}
              onCheckedChange={(c) => updateSetting("storyboardOnly", c)}
              scheme={scheme}
              ariaLabel="仅显示有 Storyboard"
            />
          </div>
        </div>
      </Section>

      <Section icon={<Activity size={18} />} title="连接检测" delay={5} open={openSections.has("network")} onToggle={() => toggleSection("network")}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>检测 API 连接</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>osu.direct / Sayobot / LRCLIB</div>
            </div>
            <button
              onClick={runCheck}
              disabled={checking}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-50"
              style={{
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                background: "var(--accent-soft)",
                cursor: checking ? "not-allowed" : "pointer",
              }}
            >
              {checking ? "检测中..." : "开始检测"}
            </button>
          </div>

          {health && (
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {[
                { key: "osuDirect", label: "osu.direct 搜索" },
                { key: "sayobotSearch", label: "Sayobot 搜索" },
                { key: "sayobotDownload", label: "Sayobot 详情" },
                { key: "lrclibLyrics", label: "LRCLIB 歌词" },
              ].map(({ key, label }) => {
                const ok = health[key as keyof ApiHealthResult];
                return (
                  <div key={key} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "var(--accent-soft)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: ok ? "#66cc44" : "#ff375f" }} />
                    <span style={{ color: "var(--text-primary)" }}>{label}</span>
                    <span style={{ color: ok ? "#66cc44" : "#ff375f", marginLeft: "auto" }}>{ok ? "正常" : "不可用"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      <Section icon={<Download size={18} />} title="下载" delay={6} open={openSections.has("download")} onToggle={() => toggleSection("download")}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>下载完整谱面包</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>含 Storyboard / 视频资源，体积更大</div>
          </div>
          <GlassSwitch
            checked={settings.downloadFullPackage}
            onCheckedChange={(c) => updateSetting("downloadFullPackage", c)}
            scheme={scheme}
            ariaLabel="下载完整谱面包"
          />
        </div>
      </Section>

      <Section icon={<Image size={18} />} title="画面" delay={7} open={openSections.has("display")} onToggle={() => toggleSection("display")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>全屏模式</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>切换浏览器全屏，等同 F11</div>
            </div>
            <GlassSwitch
              checked={settings.fullscreen}
              onCheckedChange={(c) => updateSetting("fullscreen", c)}
              scheme={scheme}
              ariaLabel="全屏模式"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示 Storyboard</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>游戏内渲染完整 Storyboard</div>
            </div>
            <GlassSwitch
              checked={settings.showStoryboard}
              onCheckedChange={(c) => updateSetting("showStoryboard", c)}
              scheme={scheme}
              ariaLabel="显示 Storyboard"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>观赏模式</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>只播放 Storyboard、背景与音频，隐藏音符与判定</div>
            </div>
            <GlassSwitch
              checked={settings.spectatorMode}
              onCheckedChange={(c) => updateSetting("spectatorMode", c)}
              scheme={scheme}
              ariaLabel="观赏模式"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>强制横屏</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>游戏内强制使用横屏布局</div>
            </div>
            <GlassSwitch
              checked={settings.forceLandscape}
              onCheckedChange={(c) => updateSetting("forceLandscape", c)}
              scheme={scheme}
              ariaLabel="强制横屏"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>背景变暗</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {Math.round(settings.backgroundDim * 100)}%
              </span>
            </div>
            <GlassSlider
              value={settings.backgroundDim}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => updateSetting("backgroundDim", v)}
              scheme={scheme}
              ariaLabel="背景变暗"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>引导线提前</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                ×{settings.approachMultiplier.toFixed(1)}
              </span>
            </div>
            <p className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              调大后引导线（引导圈）更早出现，1.0 为标准
            </p>
            <GlassSlider
              value={settings.approachMultiplier}
              min={1.0}
              max={2.5}
              step={0.1}
              onChange={(v) => updateSetting("approachMultiplier", v)}
              scheme={scheme}
              ariaLabel="引导线提前"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>背景模糊</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {Math.round(settings.backgroundBlur)}px
              </span>
            </div>
            <GlassSlider
              value={settings.backgroundBlur}
              min={0}
              max={20}
              step={1}
              onChange={(v) => updateSetting("backgroundBlur", v)}
              scheme={scheme}
              ariaLabel="背景模糊"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示引导线</div>
            </div>
            <GlassSwitch
              checked={settings.showFollowPoints}
              onCheckedChange={(c) => updateSetting("showFollowPoints", c)}
              scheme={scheme}
              ariaLabel="显示引导线"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示引导圈</div>
            </div>
            <GlassSwitch
              checked={settings.showApproachCircles}
              onCheckedChange={(c) => updateSetting("showApproachCircles", c)}
              scheme={scheme}
              ariaLabel="显示引导圈"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示连击数字</div>
            </div>
            <GlassSwitch
              checked={settings.showComboNumbers}
              onCheckedChange={(c) => updateSetting("showComboNumbers", c)}
              scheme={scheme}
              ariaLabel="显示连击数字"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示击中特效</div>
            </div>
            <GlassSwitch
              checked={settings.showHitEffects}
              onCheckedChange={(c) => updateSetting("showHitEffects", c)}
              scheme={scheme}
              ariaLabel="显示击中特效"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示 FPS</div>
            </div>
            <GlassSwitch
              checked={settings.showFPS}
              onCheckedChange={(c) => updateSetting("showFPS", c)}
              scheme={scheme}
              ariaLabel="显示 FPS"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>HUD 缩放</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                ×{settings.hudScale.toFixed(1)}
              </span>
            </div>
            <GlassSlider
              value={settings.hudScale}
              min={0.8}
              max={1.5}
              step={0.1}
              onChange={(v) => updateSetting("hudScale", v)}
              scheme={scheme}
              ariaLabel="HUD 缩放"
            />
          </div>
        </div>
      </Section>

      <Section icon={<Music size={18} />} title="歌词" delay={8} open={openSections.has("lyrics")} onToggle={() => toggleSection("lyrics")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示歌词</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>游戏内底部显示匹配歌词</div>
            </div>
            <GlassSwitch
              checked={settings.showLyrics}
              onCheckedChange={(c) => updateSetting("showLyrics", c)}
              scheme={scheme}
              ariaLabel="显示歌词"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>歌词效果</div>
            <div className="flex flex-wrap gap-2">
              {(["none", "fade", "slide"] as const).map((effect) => {
                const selected = settings.lyricsEffect === effect;
                return (
                  <button
                    key={effect}
                    onClick={() => updateSetting("lyricsEffect", effect)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
                    style={{
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      color: selected ? "#fff" : "var(--text-primary)",
                      background: selected ? "var(--accent)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {effect === "none" ? "无" : effect === "fade" ? "淡入" : "滑动"}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-primary)" }}>歌词大小</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{settings.lyricsSize}px</span>
            </div>
            <GlassSlider
              value={settings.lyricsSize}
              min={12}
              max={24}
              step={1}
              onChange={(v) => updateSetting("lyricsSize", v)}
              scheme={scheme}
              ariaLabel="歌词大小"
            />
          </div>

        </div>
      </Section>

      <Section icon={<RotateCcw size={18} />} title="高级" delay={9} open={openSections.has("advanced")} onToggle={() => toggleSection("advanced")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>恢复默认设置</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>将所有选项重置为初始值</div>
            </div>
            <button
              onClick={resetSettings}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
              style={{
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                background: "var(--accent-soft)",
                cursor: "pointer",
              }}
            >
              重置
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>清除本地回放</div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>删除所有已保存的游戏回放</div>
            </div>
            <button
              onClick={clearReplays}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
              style={{
                border: "1px solid #ff375f",
                color: "#ff375f",
                background: "rgba(255, 55, 95, 0.12)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={12} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} />
              清除
            </button>
          </div>
        </div>
      </Section>

      <Section icon={<Info size={18} />} title="关于" delay={10} open={openSections.has("about")} onToggle={() => toggleSection("about")}>
        <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <div>
            <strong style={{ color: "var(--text-primary)", fontSize: 16 }}>osu!web</strong>
          </div>
          <p>纯前端 osu! 客户端，在浏览器里畅玩谱面。</p>
          <p>
            在线体验：
            <a href="https://osu.yuiro.top" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>osu.yuiro.top</a>
          </p>
          <div className="pt-1">
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>功能</div>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>osu!standard / Taiko / Catch / Mania 四种模式</li>
              <li>Storyboard 渲染与歌词同步</li>
              <li>回放系统、Auto 演示、全屏模式</li>
              <li>内置默认打击音效，零延迟反馈</li>
              <li>Mod 系统（DT/HT/HR/Easy/Hidden 等）</li>
              <li>谱面自带皮肤与 .osk 自定义皮肤导入</li>
            </ul>
          </div>
          <div className="pt-1">
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>数据来源</div>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>谱面搜索：osu.direct / Sayobot</li>
              <li>谱面下载：Sayobot 镜像</li>
              <li>歌词：LRCLIB 开源歌词库</li>
            </ul>
          </div>
          <p className="pt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            仅供学习交流，请勿用于商业用途
          </p>
        </div>
      </Section>
    </div>
  );
}
