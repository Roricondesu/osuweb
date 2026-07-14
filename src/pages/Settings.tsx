import React, { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { GlassSwitch, GlassSlider } from "@/components/glass";
import {
  AppearanceIcon,
  AudioIcon,
  TimingIcon,
  GameIcon,
  KeysIcon,
  ModIcon,
  SkinIcon,
  SearchSettingIcon,
  NetworkIcon,
  DownloadIcon,
  DisplayIcon,
  LyricsIcon,
  AdvancedIcon,
  AboutIcon,
} from "@/components/common";
import { Trash2, Palette } from "lucide-react";
import type { Settings, ModType, KeyBindings } from "@/types";
import { DEFAULT_SETTINGS, DEFAULT_KEY_BINDINGS, MOD_LABEL, MOD_COLOR, defaultManiaKeys } from "@/types";
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
  { key: "#8866ff", label: "紫" },
  { key: "#ff66aa", label: "粉" },
];

interface SectionItem {
  id: string;
  icon: React.FC<{ size?: number; color?: string }>;
  title: string;
}

const SECTIONS: SectionItem[] = [
  { id: "appearance", icon: AppearanceIcon, title: "外观" },
  { id: "audio", icon: AudioIcon, title: "音频" },
  { id: "timing", icon: TimingIcon, title: "判定偏移" },
  { id: "game", icon: GameIcon, title: "游戏" },
  { id: "keys", icon: KeysIcon, title: "键位" },
  { id: "mod", icon: ModIcon, title: "Mod" },
  { id: "skin", icon: SkinIcon, title: "皮肤" },
  { id: "search", icon: SearchSettingIcon, title: "搜索" },
  { id: "network", icon: NetworkIcon, title: "连接检测" },
  { id: "download", icon: DownloadIcon, title: "下载" },
  { id: "display", icon: DisplayIcon, title: "画面" },
  { id: "lyrics", icon: LyricsIcon, title: "歌词" },
  { id: "advanced", icon: AdvancedIcon, title: "高级" },
  { id: "about", icon: AboutIcon, title: "关于" },
];

/** osu! lazer 风格右侧内容面板 */
const SectionPanel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <section
    style={{
      borderRadius: "var(--radius-lg)",
      background: "var(--glass-bg)",
      backdropFilter: "blur(24px) saturate(160%)",
      WebkitBackdropFilter: "blur(24px) saturate(160%)",
      border: "1px solid var(--glass-border)",
      boxShadow: "var(--glass-shadow)",
      overflow: "hidden",
      padding: "var(--panel-pad, 22px)",
    }}
  >
    {children}
  </section>
);

/** 设置项卡片容器 */
const SettingRow: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "14px 16px",
      borderRadius: "var(--radius-md)",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--glass-border)",
      transition: "background 0.2s ease",
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
  >
    {children}
  </div>
);

/** 设置项左侧文字区 */
const SettingLabel: React.FC<{ title: string; desc?: string }> = ({ title, desc }) => (
  <div style={{ minWidth: 0, flex: 1 }}>
    <div
      className="text-sm font-medium"
      style={{ color: "var(--text-primary)", lineHeight: 1.4 }}
    >
      {title}
    </div>
    {desc && (
      <div
        className="text-xs"
        style={{ color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.45 }}
      >
        {desc}
    </div>
    )}
  </div>
);

/** 带标签的滑块 */
const SliderSetting: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  scheme: "dark" | "light";
  ariaLabel: string;
}> = ({ label, value, min, max, step, format, onChange, scheme, ariaLabel }) => (
  <div>
    <div className="mb-2 flex items-center justify-between text-sm">
      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: "var(--accent)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {format(value)}
      </span>
    </div>
    <GlassSlider value={value} min={min} max={max} step={step} onChange={onChange} scheme={scheme} ariaLabel={ariaLabel} />
  </div>
);

/** 将键盘 key 值转为可读标签 */
const keyToLabel = (key: string): string => {
  const map: Record<string, string> = {
    " ": "Space",
    arrowleft: "←",
    arrowright: "→",
    arrowup: "↑",
    arrowdown: "↓",
    shift: "Shift",
    control: "Ctrl",
    alt: "Alt",
    meta: "Meta",
    enter: "Enter",
    escape: "Esc",
    tab: "Tab",
    backspace: "⌫",
  };
  return map[key] ?? (key.length === 1 ? key.toUpperCase() : key);
};

/** 单个键位绑定按钮 */
const KeyBindingButton: React.FC<{
  label: string;
  keyVal: string;
  onChange: (key: string) => void;
}> = ({ label, keyVal, onChange }) => {
  const [listening, setListening] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setListening(false);
      return;
    }
    onChange(e.key.toLowerCase());
    setListening(false);
  }, [onChange]);

  useEffect(() => {
    if (!listening) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [listening, handleKeyDown]);

  return (
    <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <button
        onClick={() => setListening(true)}
        style={{
          minWidth: 64,
          padding: "6px 10px",
          borderRadius: 8,
          border: `1px solid ${listening ? "var(--accent)" : "var(--border)"}`,
          color: listening ? "#fff" : "var(--text-primary)",
          background: listening ? "var(--accent)" : "rgba(255,255,255,0.04)",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.15s ease",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {listening ? "按下…" : keyToLabel(keyVal)}
      </button>
    </div>
  );
};

/** 一组键位绑定 */
const KeyBindingGroup: React.FC<{
  label: string;
  keys: string[];
  labels: string[];
  onChange: (index: number, key: string) => void;
  onReset: () => void;
}> = ({ label, keys, labels, onChange, onReset }) => (
  <div
    style={{
      padding: 16,
      borderRadius: "var(--radius-md)",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--glass-border)",
    }}
  >
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
      <button
        onClick={onReset}
        className="text-xs"
        style={{ color: "var(--accent)", background: "transparent", border: "none", cursor: "pointer", fontWeight: 600 }}
      >
        重置
      </button>
    </div>
    <div className="grid grid-cols-2 gap-x-4">
      {keys.map((k, i) => (
        <KeyBindingButton
          key={i}
          label={labels[i] || `按键 ${i + 1}`}
          keyVal={k}
          onChange={(key) => onChange(i, key)}
        />
      ))}
    </div>
  </div>
);

/** 分段标题 */
const SubHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="font-torus text-sm font-semibold"
    style={{ color: "var(--text-primary)", marginBottom: 8, marginTop: 6 }}
  >
    {children}
  </div>
);

/** 小标签按钮组 */
const ChipGroup = <T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel: (v: T) => string;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => {
      const selected = value === opt;
      return (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
          style={{
            border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
            color: selected ? "#fff" : "var(--text-primary)",
            background: selected ? "var(--accent)" : "rgba(255,255,255,0.04)",
            cursor: "pointer",
          }}
        >
          {renderLabel(opt)}
        </button>
      );
    })}
  </div>
);

export default function Settings() {
  const settings = useGameStore((s) => s.settings);
  const updateSetting = useGameStore((s) => s.updateSetting);
  const importSkinFile = useGameStore((s) => s.importSkinFile);
  const importHitSoundsFromFile = useGameStore((s) => s.importHitSoundsFromFile);
  const clearCustomHitSounds = useGameStore((s) => s.clearCustomHitSounds);
  const scheme = settings.theme === "dark" ? "dark" : "light";
  const [health, setHealth] = React.useState<ApiHealthResult | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [skinImporting, setSkinImporting] = useState(false);
  const [skinImportMsg, setSkinImportMsg] = useState<string>("");
  const skinInputRef = useRef<HTMLInputElement>(null);

  const [hitSoundImporting, setHitSoundImporting] = useState(false);
  const [hitSoundImportMsg, setHitSoundImportMsg] = useState<string>("");
  const hitSoundInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<string>("appearance");

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

  const handleHitSoundImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHitSoundImporting(true);
    setHitSoundImportMsg("");
    try {
      const ok = await importHitSoundsFromFile(file);
      if (ok) {
        setHitSoundImportMsg(`已导入音效采样：${file.name}`);
      } else {
        setHitSoundImportMsg("导入失败：未找到可用的音效采样文件");
      }
    } catch {
      setHitSoundImportMsg("导入失败：文件损坏或格式不支持");
    } finally {
      setHitSoundImporting(false);
      if (hitSoundInputRef.current) hitSoundInputRef.current.value = "";
    }
  }, [importHitSoundsFromFile]);

  const handleClearHitSounds = useCallback(async () => {
    await clearCustomHitSounds();
    setHitSoundImportMsg("已清除自定义音效采样");
  }, [clearCustomHitSounds]);

  const resetSettings = useCallback(() => {
    (Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>).forEach((key) => {
      updateSetting(key, DEFAULT_SETTINGS[key]);
    });
  }, [updateSetting]);

  const updateKeyBinding = useCallback((mode: keyof KeyBindings, index: number, key: string) => {
    if (mode === "mania") return;
    const current = settings.keyBindings[mode] as string[];
    const next = [...current] as string[];
    const conflictIdx = next.findIndex((k, i) => i !== index && k === key);
    if (conflictIdx >= 0) next[conflictIdx] = next[index];
    next[index] = key;
    updateSetting("keyBindings", { ...settings.keyBindings, [mode]: next });
  }, [settings.keyBindings, updateSetting]);

  const updateManiaKeyBinding = useCallback((cols: number, index: number, key: string) => {
    const current = settings.keyBindings.mania[cols] || defaultManiaKeys(cols);
    const next = [...current];
    const conflictIdx = next.findIndex((k, i) => i !== index && k === key);
    if (conflictIdx >= 0) next[conflictIdx] = next[index];
    next[index] = key;
    updateSetting("keyBindings", {
      ...settings.keyBindings,
      mania: { ...settings.keyBindings.mania, [cols]: next },
    });
  }, [settings.keyBindings, updateSetting]);

  const resetManiaKeyBinding = useCallback((cols: number) => {
    updateSetting("keyBindings", {
      ...settings.keyBindings,
      mania: { ...settings.keyBindings.mania, [cols]: defaultManiaKeys(cols) },
    });
  }, [settings.keyBindings, updateSetting]);

  const resetKeyBinding = useCallback((mode: keyof KeyBindings) => {
    if (mode === "mania") return;
    updateSetting("keyBindings", { ...settings.keyBindings, [mode]: [...(DEFAULT_KEY_BINDINGS[mode] as string[])] });
  }, [settings.keyBindings, updateSetting]);

  const clearReplays = useCallback(() => {
    loadReplays().forEach((r) => deleteReplay(r.id));
  }, []);

  const runCheck = async () => {
    setChecking(true);
    setHealth(null);
    try {
      setHealth(await checkApiHealth());
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="page-shell">
      <div
        style={{
          display: "flex",
          gap: 20,
          minHeight: "calc(100vh - var(--nav-height) - var(--nowplaying-height) - 60px)",
        }}
      >
        {/* 左侧分类栏 */}
        <aside
          style={{
            width: 200,
            flexShrink: 0,
            position: "sticky",
            top: "calc(var(--nav-height) + 12px)",
            alignSelf: "flex-start",
            maxHeight: "calc(100vh - var(--nav-height) - var(--nowplaying-height) - 60px)",
            overflowY: "auto",
          }}
          className="hidden md:block"
        >
          <div
            style={{
              padding: 6,
              borderRadius: "var(--radius-lg)",
              background: "var(--glass-bg)",
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
            }}
          >
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    marginBottom: 2,
                  }}
                  className="font-torus"
                >
                  <Icon size={17} color={active ? "var(--accent)" : "currentColor"} />
                  {s.title}
                </button>
              );
            })}
          </div>
        </aside>

        {/* 右侧内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 移动端：icon-only 横向滚动标签栏 */}
          <div
            className="md:hidden no-scrollbar"
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 6,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              paddingBottom: 2,
            }}
          >
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  aria-label={s.title}
                  title={s.title}
                  style={{
                    flexShrink: 0,
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid",
                    borderColor: active ? "var(--accent)" : "var(--glass-border)",
                    background: active ? "var(--accent-soft)" : "var(--glass-bg)",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    scrollSnapAlign: "start",
                  }}
                >
                  <Icon size={18} color={active ? "var(--accent)" : "currentColor"} />
                </button>
              );
            })}
          </div>

          {/* 移动端：当前分类标题 */}
          <div className="md:hidden" style={{ marginBottom: 10 }}>
            <h2
              className="font-torus"
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {SECTIONS.find((s) => s.id === activeSection)?.title}
            </h2>
          </div>

          <SectionPanel>
            {/* 外观 */}
            {activeSection === "appearance" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title="深色主题" desc="切换浅色 / 深色界面" />
                  <GlassSwitch
                    checked={settings.theme === "dark"}
                    onCheckedChange={(c) => updateSetting("theme", c ? "dark" : "light")}
                    scheme={scheme}
                    ariaLabel="深色主题"
                  />
                </SettingRow>

                <div>
                  <SubHeader>
                    <span className="inline-flex items-center gap-2">
                      <Palette size={14} style={{ color: "var(--text-secondary)" }} />
                      主题色
                    </span>
                  </SubHeader>
                  <div className="flex flex-wrap gap-3">
                    {ACCENTS.map((a) => {
                      const selected = settings.accent === a.key;
                      return (
                        <button
                          key={a.key}
                          onClick={() => updateSetting("accent", a.key)}
                          aria-label={a.label}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: a.key,
                            border: selected ? "3px solid var(--text-primary)" : "3px solid transparent",
                            boxShadow: selected ? `0 0 0 2px ${a.key}44, 0 4px 12px ${a.key}33` : "none",
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
            )}

            {/* 音频 */}
            {activeSection === "audio" && (
              <div className="flex flex-col gap-5">
                <SliderSetting
                  label="音乐音量"
                  value={settings.volume}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSetting("volume", v)}
                  scheme={scheme}
                  ariaLabel="音量"
                />
                <SliderSetting
                  label="播放速度"
                  value={settings.playbackRate}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  format={(v) => `×${v.toFixed(2)}`}
                  onChange={(v) => updateSetting("playbackRate", v)}
                  scheme={scheme}
                  ariaLabel="播放速度"
                />
                <SettingRow>
                  <SettingLabel
                    title="使用采样音效"
                    desc="优先使用谱面 / 皮肤 / 自定义采样，关闭后使用合成音效"
                  />
                  <GlassSwitch
                    checked={settings.useHitSamples}
                    onCheckedChange={(c) => updateSetting("useHitSamples", c)}
                    scheme={scheme}
                    ariaLabel="使用采样音效"
                  />
                </SettingRow>
                <div>
                  <SubHeader>默认采样集</SubHeader>
                  <ChipGroup
                    options={["normal", "soft", "drum"] as const}
                    value={settings.defaultSampleSet}
                    onChange={(v) => updateSetting("defaultSampleSet", v)}
                    renderLabel={(v) => (v === "normal" ? "Normal" : v === "soft" ? "Soft" : "Drum")}
                  />
                  <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    谱面未指定采样集时使用的默认音色
                  </p>
                </div>
                <div>
                  <SubHeader>导入音效采样包</SubHeader>
                  <SettingRow>
                    <SettingLabel title="选择音效文件" desc="从 .osz / .osk / .zip 中提取 .wav / .mp3 / .ogg" />
                    <div className="flex items-center gap-2">
                      {settings.customHitSoundUrls && Object.keys(settings.customHitSoundUrls).length > 0 && (
                        <button
                          onClick={handleClearHitSounds}
                          className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                          style={{
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          清除
                        </button>
                      )}
                      <button
                        onClick={() => hitSoundInputRef.current?.click()}
                        disabled={hitSoundImporting}
                        className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                        style={{
                          border: "1px solid var(--accent)",
                          color: "var(--accent)",
                          background: "var(--accent-soft)",
                          cursor: hitSoundImporting ? "not-allowed" : "pointer",
                        }}
                      >
                        {hitSoundImporting ? "导入中..." : "选择文件"}
                      </button>
                      <input
                        ref={hitSoundInputRef}
                        type="file"
                        accept=".osz,.osk,.zip"
                        onChange={handleHitSoundImport}
                        style={{ display: "none" }}
                      />
                    </div>
                  </SettingRow>
                  {hitSoundImportMsg && (
                    <p className="mt-2 text-xs" style={{ color: "var(--accent)" }}>{hitSoundImportMsg}</p>
                  )}
                  {settings.customHitSoundUrls && Object.keys(settings.customHitSoundUrls).length > 0 && (
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      当前已加载 {Object.keys(settings.customHitSoundUrls).length} 个音效采样文件
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 判定偏移 */}
            {activeSection === "timing" && (
              <div className="flex flex-col gap-4">
                <SliderSetting
                  label="音频偏移"
                  value={settings.offset}
                  min={-200}
                  max={200}
                  step={5}
                  format={(v) => `${v > 0 ? "+" : ""}${v} ms`}
                  onChange={(v) => updateSetting("offset", v)}
                  scheme={scheme}
                  ariaLabel="判定偏移"
                />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  正值 = 提前判定（适合音频延迟大的设备），负值 = 推后判定
                </p>
              </div>
            )}

            {/* 游戏 */}
            {activeSection === "game" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title="自动模式" desc="自动击打音符，适合练习观赏" />
                  <GlassSwitch checked={settings.auto} onCheckedChange={(c) => updateSetting("auto", c)} scheme={scheme} ariaLabel="自动模式" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="显示光标" desc="在游戏画面中显示指针位置" />
                  <GlassSwitch checked={settings.showCursor} onCheckedChange={(c) => updateSetting("showCursor", c)} scheme={scheme} ariaLabel="显示光标" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="光标拖尾" desc="Auto / 显示光标时绘制移动轨迹" />
                  <GlassSwitch checked={settings.showCursorTrail} onCheckedChange={(c) => updateSetting("showCursorTrail", c)} scheme={scheme} ariaLabel="光标拖尾" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="光标按下反馈" desc="点击 / Auto 击打时放大光圈" />
                  <GlassSwitch checked={settings.showCursorPress} onCheckedChange={(c) => updateSetting("showCursorPress", c)} scheme={scheme} ariaLabel="光标按下反馈" />
                </SettingRow>
                <SliderSetting
                  label="光标大小"
                  value={settings.cursorSize}
                  min={0.5}
                  max={2}
                  step={0.1}
                  format={(v) => `×${v.toFixed(1)}`}
                  onChange={(v) => updateSetting("cursorSize", v)}
                  scheme={scheme}
                  ariaLabel="光标大小"
                />
                <SliderSetting
                  label="Auto 光标速度"
                  value={settings.autoCursorSpeed}
                  min={0.5}
                  max={2}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)}x`}
                  onChange={(v) => updateSetting("autoCursorSpeed", v)}
                  scheme={scheme}
                  ariaLabel="Auto 光标速度"
                />
                <SettingRow>
                  <SettingLabel title="Auto 圆周模式" desc="光标沿圆弧匀速移动，流畅衔接每个音符" />
                  <GlassSwitch checked={settings.autoCircleMode} onCheckedChange={(c) => updateSetting("autoCircleMode", c)} scheme={scheme} ariaLabel="Auto 圆周模式" />
                </SettingRow>
                <SliderSetting
                  label="按键音音量"
                  value={settings.hitSoundVolume}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSetting("hitSoundVolume", v)}
                  scheme={scheme}
                  ariaLabel="按键音音量"
                />
              </div>
            )}

            {/* 键位 */}
            {activeSection === "keys" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  点击按键后按下新键即可修改。空格键显示为 Space，方向键显示为 Arrow。
                </p>
                <KeyBindingGroup
                  label="osu! (Standard)"
                  keys={settings.keyBindings.standard}
                  labels={["按键 1", "按键 2"]}
                  onChange={(idx, key) => updateKeyBinding("standard", idx, key)}
                  onReset={() => resetKeyBinding("standard")}
                />
                <KeyBindingGroup
                  label="osu!taiko"
                  keys={settings.keyBindings.taiko}
                  labels={["KAT 左", "KAT 右", "DON 左", "DON 右"]}
                  onChange={(idx, key) => updateKeyBinding("taiko", idx, key)}
                  onReset={() => resetKeyBinding("taiko")}
                />
                <KeyBindingGroup
                  label="osu!catch"
                  keys={settings.keyBindings.catch}
                  labels={["左移", "右移"]}
                  onChange={(idx, key) => updateKeyBinding("catch", idx, key)}
                  onReset={() => resetKeyBinding("catch")}
                />
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cols) => {
                  const keys = settings.keyBindings.mania[cols] || defaultManiaKeys(cols);
                  return (
                    <KeyBindingGroup
                      key={cols}
                      label={`osu!mania ${cols}K`}
                      keys={keys}
                      labels={Array.from({ length: keys.length }, (_, i) => `列 ${i + 1}`)}
                      onChange={(idx, key) => updateManiaKeyBinding(cols, idx, key)}
                      onReset={() => resetManiaKeyBinding(cols)}
                    />
                  );
                })}
                <button
                  onClick={() => updateSetting("keyBindings", { ...DEFAULT_KEY_BINDINGS })}
                  className="rounded-full px-4 py-2 text-xs font-semibold transition-transform active:scale-95"
                  style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "transparent", cursor: "pointer" }}
                >
                  恢复全部默认键位
                </button>
              </div>
            )}

            {/* Mod */}
            {activeSection === "mod" && (
              <div className="flex flex-col gap-5">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  点击切换 Mod，可多选。难度调整类（DT/HT/HR/Easy）会实际影响游戏速度与判定。也可以在谱面详情页或游戏准备页用浮动按钮快速切换。
                </p>
                <div className="flex flex-wrap gap-3">
                  {ALL_MODS.map((mod) => {
                    const active = settings.mods.includes(mod);
                    const color = MOD_COLOR[mod];
                    return (
                      <button
                        key={mod}
                        onClick={() => toggleMod(mod)}
                        className="rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95"
                        style={{
                          border: "1px solid",
                          borderColor: active ? color : "var(--border)",
                          color: active ? "#fff" : "var(--text-primary)",
                          background: active ? color : "rgba(255,255,255,0.04)",
                          boxShadow: active ? `0 0 14px ${color}55` : "none",
                          cursor: "pointer",
                        }}
                      >
                        {MOD_LABEL[mod]}
                      </button>
                    );
                  })}
                </div>
                {settings.mods.length > 0 && (
                  <SettingRow>
                    <SettingLabel title={`已启用 ${settings.mods.length} 个 Mod`} />
                    <button
                      onClick={() => updateSetting("mods", [])}
                      className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                      style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "transparent", cursor: "pointer" }}
                    >
                      清除全部
                    </button>
                  </SettingRow>
                )}
              </div>
            )}

            {/* 皮肤 */}
            {activeSection === "skin" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title="使用谱面自带皮肤" desc="加载谱面包内的 hitcircle / cursor / slider 等纹理" />
                  <GlassSwitch checked={settings.useBeatmapSkin} onCheckedChange={(c) => updateSetting("useBeatmapSkin", c)} scheme={scheme} ariaLabel="使用谱面自带皮肤" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="使用自定义皮肤" desc="应用导入的 .osk 皮肤，优先级高于谱面皮肤" />
                  <GlassSwitch checked={settings.useCustomSkin} onCheckedChange={(c) => updateSetting("useCustomSkin", c)} scheme={scheme} ariaLabel="使用自定义皮肤" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="导入 .osk 皮肤" desc="从本地选择 osu! 皮肤压缩包" />
                  <button
                    onClick={() => skinInputRef.current?.click()}
                    disabled={skinImporting}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                    style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: skinImporting ? "not-allowed" : "pointer" }}
                  >
                    {skinImporting ? "导入中..." : "选择文件"}
                  </button>
                  <input ref={skinInputRef} type="file" accept=".osk,.zip" onChange={handleSkinImport} style={{ display: "none" }} />
                </SettingRow>
                {skinImportMsg && <p className="text-xs" style={{ color: "var(--accent)" }}>{skinImportMsg}</p>}
                {settings.useCustomSkin && settings.customSkinAssetUrls && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    当前皮肤已加载 {Object.keys(settings.customSkinAssetUrls).length} 个资源文件
                  </p>
                )}

                <div className="mt-2 border-t pt-5" style={{ borderColor: "var(--glass-border)" }}>
                  <SubHeader>默认皮肤自定义</SubHeader>
                  <SettingRow>
                    <SettingLabel title="自定义 Combo 颜色" desc="覆盖默认 8 色 combo 配色" />
                    <GlassSwitch checked={settings.useCustomComboColors} onCheckedChange={(c) => updateSetting("useCustomComboColors", c)} scheme={scheme} ariaLabel="自定义 Combo 颜色" />
                  </SettingRow>
                  {settings.useCustomComboColors && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {settings.customComboColors.map((color, i) => (
                        <input
                          key={i}
                          type="color"
                          value={color}
                          onChange={(e) => { const next = [...settings.customComboColors]; next[i] = e.target.value; updateSetting("customComboColors", next); }}
                          style={{ width: 32, height: 32, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", background: "transparent" }}
                        />
                      ))}
                      <button
                        onClick={() => { if (settings.customComboColors.length < 8) { updateSetting("customComboColors", [...settings.customComboColors, "#ffffff"]); } }}
                        disabled={settings.customComboColors.length >= 8}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-40"
                        style={{ border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer" }}
                      >
                        + 添加
                      </button>
                      <button
                        onClick={() => updateSetting("customComboColors", ["#f472b6", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15"])}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                        style={{ border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer" }}
                      >
                        重置
                      </button>
                    </div>
                  )}
                  <div className="mt-4">
                    <SliderSetting
                      label="圆圈缩放"
                      value={settings.hitCircleScale}
                      min={0.5}
                      max={2}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("hitCircleScale", v)}
                      scheme={scheme}
                      ariaLabel="圆圈缩放"
                    />
                  </div>
                  <div className="mt-4">
                    <SliderSetting
                      label="圆圈边框宽度"
                      value={settings.circleBorderWidth}
                      min={0.5}
                      max={3}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("circleBorderWidth", v)}
                      scheme={scheme}
                      ariaLabel="圆圈边框宽度"
                    />
                  </div>
                  <div className="mt-4">
                    <SliderSetting
                      label="滑条边框宽度"
                      value={settings.sliderBorderWidth}
                      min={0.5}
                      max={3}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("sliderBorderWidth", v)}
                      scheme={scheme}
                      ariaLabel="滑条边框宽度"
                    />
                  </div>
                  <div className="mt-4">
                    <SliderSetting
                      label="滑条球缩放"
                      value={settings.sliderBallScale}
                      min={0.5}
                      max={2}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("sliderBallScale", v)}
                      scheme={scheme}
                      ariaLabel="滑条球缩放"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 搜索 */}
            {activeSection === "search" && (
              <div className="flex flex-col gap-5">
                <div>
                  <SubHeader>搜索源</SubHeader>
                  <ChipGroup
                    options={["all", "osu", "sayobot", "kitsu", "chimu"] as const}
                    value={settings.searchSource}
                    onChange={(v) => updateSetting("searchSource", v)}
                    renderLabel={(v) =>
                      v === "all" ? "全部竞速" : v === "osu" ? "osu.direct" : v === "sayobot" ? "Sayobot" : v === "kitsu" ? "Kitsu" : "Chimu"
                    }
                  />
                  <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    "全部竞速" 同时请求所有源，取最快返回的结果
                  </p>
                </div>
                <SettingRow>
                  <SettingLabel title="仅显示有 Storyboard" desc="过滤搜索结果" />
                  <GlassSwitch checked={settings.storyboardOnly} onCheckedChange={(c) => updateSetting("storyboardOnly", c)} scheme={scheme} ariaLabel="仅显示有 Storyboard" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="仅显示有视频" desc="过滤搜索结果" />
                  <GlassSwitch checked={settings.videoOnly} onCheckedChange={(c) => updateSetting("videoOnly", c)} scheme={scheme} ariaLabel="仅显示有视频" />
                </SettingRow>
              </div>
            )}

            {/* 连接检测 */}
            {activeSection === "network" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title="检测 API 连接" desc="osu.direct / Sayobot / LRCLIB" />
                  <button
                    onClick={runCheck}
                    disabled={checking}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                    style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: checking ? "not-allowed" : "pointer" }}
                  >
                    {checking ? "检测中..." : "开始检测"}
                  </button>
                </SettingRow>
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
                        <div key={key} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--accent-soft)", border: "1px solid var(--glass-border)" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ok ? "var(--success)" : "var(--error)" }} />
                          <span style={{ color: "var(--text-primary)" }}>{label}</span>
                          <span style={{ color: ok ? "var(--success)" : "var(--error)", marginLeft: "auto", fontWeight: 700 }}>{ok ? "正常" : "不可用"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 下载 */}
            {activeSection === "download" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title="下载完整谱面包" desc="含 Storyboard / 视频资源，体积更大" />
                  <GlassSwitch checked={settings.downloadFullPackage} onCheckedChange={(c) => updateSetting("downloadFullPackage", c)} scheme={scheme} ariaLabel="下载完整谱面包" />
                </SettingRow>
              </div>
            )}

            {/* 画面 */}
            {activeSection === "display" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title="全屏模式" desc="切换浏览器全屏，等同 F11" />
                  <GlassSwitch checked={settings.fullscreen} onCheckedChange={(c) => updateSetting("fullscreen", c)} scheme={scheme} ariaLabel="全屏模式" />
                </SettingRow>
                <SliderSetting
                  label="页面缩放"
                  value={settings.pageScale}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  format={(v) => `×${v.toFixed(2)}`}
                  onChange={(v) => updateSetting("pageScale", v)}
                  scheme={scheme}
                  ariaLabel="页面缩放"
                />
                <SettingRow>
                  <SettingLabel title="显示 Storyboard" desc="游戏内渲染完整 Storyboard" />
                  <GlassSwitch checked={settings.showStoryboard} onCheckedChange={(c) => updateSetting("showStoryboard", c)} scheme={scheme} ariaLabel="显示 Storyboard" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="视频背景" desc="播放谱面自带的视频背景（若有）" />
                  <GlassSwitch checked={settings.showVideo} onCheckedChange={(c) => updateSetting("showVideo", c)} scheme={scheme} ariaLabel="视频背景" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="观赏模式" desc="只播放 Storyboard、背景与音频，隐藏音符与判定" />
                  <GlassSwitch checked={settings.spectatorMode} onCheckedChange={(c) => updateSetting("spectatorMode", c)} scheme={scheme} ariaLabel="观赏模式" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="强制横屏" desc="游戏内强制使用横屏布局" />
                  <GlassSwitch checked={settings.forceLandscape} onCheckedChange={(c) => updateSetting("forceLandscape", c)} scheme={scheme} ariaLabel="强制横屏" />
                </SettingRow>
                <SliderSetting
                  label="背景变暗"
                  value={settings.backgroundDim}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSetting("backgroundDim", v)}
                  scheme={scheme}
                  ariaLabel="背景变暗"
                />
                <SliderSetting
                  label="引导线提前"
                  value={settings.approachMultiplier}
                  min={1}
                  max={2.5}
                  step={0.1}
                  format={(v) => `×${v.toFixed(1)}`}
                  onChange={(v) => updateSetting("approachMultiplier", v)}
                  scheme={scheme}
                  ariaLabel="引导线提前"
                />
                <SliderSetting
                  label="背景模糊"
                  value={settings.backgroundBlur}
                  min={0}
                  max={20}
                  step={1}
                  format={(v) => `${Math.round(v)}px`}
                  onChange={(v) => updateSetting("backgroundBlur", v)}
                  scheme={scheme}
                  ariaLabel="背景模糊"
                />
                <SettingRow>
                  <SettingLabel title="显示引导线" />
                  <GlassSwitch checked={settings.showFollowPoints} onCheckedChange={(c) => updateSetting("showFollowPoints", c)} scheme={scheme} ariaLabel="显示引导线" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="显示引导圈" />
                  <GlassSwitch checked={settings.showApproachCircles} onCheckedChange={(c) => updateSetting("showApproachCircles", c)} scheme={scheme} ariaLabel="显示引导圈" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="显示连击数字" />
                  <GlassSwitch checked={settings.showComboNumbers} onCheckedChange={(c) => updateSetting("showComboNumbers", c)} scheme={scheme} ariaLabel="显示连击数字" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="显示击中特效" />
                  <GlassSwitch checked={settings.showHitEffects} onCheckedChange={(c) => updateSetting("showHitEffects", c)} scheme={scheme} ariaLabel="显示击中特效" />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="显示 FPS" />
                  <GlassSwitch checked={settings.showFPS} onCheckedChange={(c) => updateSetting("showFPS", c)} scheme={scheme} ariaLabel="显示 FPS" />
                </SettingRow>
                <SliderSetting
                  label="HUD 缩放"
                  value={settings.hudScale}
                  min={0.8}
                  max={1.5}
                  step={0.1}
                  format={(v) => `×${v.toFixed(1)}`}
                  onChange={(v) => updateSetting("hudScale", v)}
                  scheme={scheme}
                  ariaLabel="HUD 缩放"
                />
              </div>
            )}

            {/* 歌词 */}
            {activeSection === "lyrics" && (
              <div className="flex flex-col gap-5">
                <SettingRow>
                  <SettingLabel title="显示歌词" desc="游戏内底部显示匹配歌词" />
                  <GlassSwitch checked={settings.showLyrics} onCheckedChange={(c) => updateSetting("showLyrics", c)} scheme={scheme} ariaLabel="显示歌词" />
                </SettingRow>
                <div>
                  <SubHeader>歌词效果</SubHeader>
                  <ChipGroup
                    options={["none", "fade", "slide"] as const}
                    value={settings.lyricsEffect}
                    onChange={(v) => updateSetting("lyricsEffect", v)}
                    renderLabel={(v) => (v === "none" ? "无" : v === "fade" ? "淡入" : "滑动")}
                  />
                </div>
                <SliderSetting
                  label="歌词大小"
                  value={settings.lyricsSize}
                  min={12}
                  max={24}
                  step={1}
                  format={(v) => `${Math.round(v)}px`}
                  onChange={(v) => updateSetting("lyricsSize", v)}
                  scheme={scheme}
                  ariaLabel="歌词大小"
                />
              </div>
            )}

            {/* 高级 */}
            {activeSection === "advanced" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title="恢复默认设置" desc="将所有选项重置为初始值" />
                  <button
                    onClick={resetSettings}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                    style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: "pointer" }}
                  >
                    重置
                  </button>
                </SettingRow>
                <SettingRow>
                  <SettingLabel title="清除本地回放" desc="删除所有已保存的游戏回放" />
                  <button
                    onClick={clearReplays}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                    style={{ border: "1px solid var(--error)", color: "var(--error)", background: "var(--error-soft)", cursor: "pointer" }}
                  >
                    <Trash2 size={12} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} />
                    清除
                  </button>
                </SettingRow>
              </div>
            )}

            {/* 关于 */}
            {activeSection === "about" && (
              <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div>
                  <strong style={{ color: "var(--text-primary)", fontSize: 18 }}>osu!web</strong>
                  <p className="mt-1">纯前端 osu! 客户端，在浏览器里畅玩谱面。</p>
                </div>
                <p>在线体验：<a href="https://osu.yuiro.top" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>osu.yuiro.top</a></p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>功能</div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
                      <li>osu!standard / Taiko / Catch / Mania 四种模式</li>
                      <li>Storyboard 渲染与歌词同步</li>
                      <li>回放系统、Auto 演示、全屏模式</li>
                      <li>内置默认打击音效，零延迟反馈</li>
                      <li>Mod 系统（DT/HT/HR/Easy/Hidden 等）</li>
                      <li>谱面自带皮肤与 .osk 自定义皮肤导入</li>
                    </ul>
                  </div>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>数据来源</div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
                      <li>谱面搜索：osu.direct / Sayobot</li>
                      <li>谱面下载：Sayobot 镜像</li>
                      <li>歌词：LRCLIB 开源歌词库</li>
                    </ul>
                  </div>
                </div>
                <p className="pt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>仅供学习交流，请勿用于商业用途</p>
              </div>
            )}
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}
