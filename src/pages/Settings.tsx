import React, { useState, useCallback, useRef, useEffect } from "react";
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
  RotateCcw,
  Trash2,
  Zap,
  Brush,
  Keyboard,
} from "lucide-react";
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
  { key: "#9966ff", label: "紫" },
  { key: "#ff66aa", label: "粉" },
];

/** 右侧内容面板：根据当前激活的分类渲染，标题随分类切换 */
const SectionPanel: React.FC<{
  active: string;
  children: React.ReactNode;
}> = ({ active, children }) => {
  const meta = SECTIONS_META[active];
  return (
    <section
      key={active}
      style={{
        borderRadius: "var(--radius-lg)",
        background: "var(--glass-bg)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
        padding: 20,
        animation: "stagger-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      {meta && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--accent-soft)",
            color: "var(--accent)",
          }}>
            {meta.icon}
          </span>
          <h2 className="font-torus" style={{
            fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em",
            color: "var(--text-primary)", margin: 0,
          }}>
            {meta.title}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
};

/** 分类元数据：图标 + 标题（与下方 SECTIONS 保持一致） */
const SECTIONS_META: Record<string, { icon: React.ReactNode; title: string }> = {
  appearance: { icon: <Moon size={16} />, title: "外观" },
  audio: { icon: <Volume2 size={16} />, title: "音频" },
  timing: { icon: <Clock size={16} />, title: "判定偏移" },
  game: { icon: <Gamepad2 size={16} />, title: "游戏" },
  keys: { icon: <Keyboard size={16} />, title: "键位" },
  mod: { icon: <Zap size={16} />, title: "Mod" },
  skin: { icon: <Brush size={16} />, title: "皮肤" },
  search: { icon: <Search size={16} />, title: "搜索" },
  network: { icon: <Activity size={16} />, title: "连接检测" },
  download: { icon: <Download size={16} />, title: "下载" },
  display: { icon: <Image size={16} />, title: "画面" },
  lyrics: { icon: <Music size={16} />, title: "歌词" },
  advanced: { icon: <RotateCcw size={16} />, title: "高级" },
  about: { icon: <Info size={16} />, title: "关于" },
};

/** 将键盘 key 值转为可读标签 */
const keyToLabel = (key: string): string => {
  if (key === " ") return "Space";
  if (key === "arrowleft") return "←";
  if (key === "arrowright") return "→";
  if (key === "arrowup") return "↑";
  if (key === "arrowdown") return "↓";
  if (key === "shift") return "Shift";
  if (key === "control") return "Ctrl";
  if (key === "alt") return "Alt";
  if (key === "meta") return "Meta";
  if (key === "enter") return "Enter";
  if (key === "escape") return "Esc";
  if (key === "tab") return "Tab";
  if (key === "backspace") return "⌫";
  if (key.length === 1) return key.toUpperCase();
  return key;
};

/** 单个键位绑定按钮：点击后进入监听状态，按下任意键完成绑定 */
const KeyBindingButton: React.FC<{
  label: string;
  keyVal: string;
  onChange: (key: string) => void;
  scheme: "dark" | "light";
}> = ({ label, keyVal, onChange, scheme: _scheme }) => {
  const [listening, setListening] = useState(false);

  const handleClick = () => {
    setListening(true);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Escape 取消
    if (e.key === "Escape") {
      setListening(false);
      return;
    }
    const k = e.key.toLowerCase();
    onChange(k);
    setListening(false);
  }, [onChange]);

  useEffect(() => {
    if (!listening) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [listening, handleKeyDown]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
      <button
        onClick={handleClick}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
        style={{
          minWidth: 60,
          border: `1px solid ${listening ? "var(--accent)" : "var(--border)"}`,
          color: listening ? "#fff" : "var(--text-primary)",
          background: listening ? "var(--accent)" : "transparent",
          cursor: "pointer",
        }}
      >
        {listening ? "按下…" : keyToLabel(keyVal)}
      </button>
    </div>
  );
};

/** 一组键位绑定（带标题和重置按钮） */
const KeyBindingGroup: React.FC<{
  label: string;
  keys: string[];
  labels: string[];
  onChange: (index: number, key: string) => void;
  onReset: () => void;
  scheme: "dark" | "light";
}> = ({ label, keys, labels, onChange, onReset, scheme }) => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
      <button
        onClick={onReset}
        className="text-xs transition-transform active:scale-95"
        style={{ color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}
      >
        重置
      </button>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {keys.map((k, i) => (
        <KeyBindingButton
          key={i}
          label={labels[i] || `按键 ${i + 1}`}
          keyVal={k}
          onChange={(key) => onChange(i, key)}
          scheme={scheme}
        />
      ))}
    </div>
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
    if (mode === "mania") {
      // mania 是 Record<number, string[]>，需特殊处理：用当前显示的键数方案
      return; // mania 用专用 updateManiaKeyBinding
    }
    const current = settings.keyBindings[mode] as string[];
    const next = [...current] as string[];
    // 冲突检测：同模式内若新键已绑定到其他槽位，则交换两个槽位的键
    const conflictIdx = next.findIndex((k, i) => i !== index && k === key);
    if (conflictIdx >= 0) {
      next[conflictIdx] = next[index];
    }
    next[index] = key;
    updateSetting("keyBindings", { ...settings.keyBindings, [mode]: next });
  }, [settings.keyBindings, updateSetting]);

  /** 更新 mania 指定键数的第 index 个键 */
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
      const res = await checkApiHealth();
      setHealth(res);
    } finally {
      setChecking(false);
    }
  };

  // 设置分类
  const SECTIONS = [
    { id: "appearance", icon: <Moon size={16} />, title: "外观" },
    { id: "audio", icon: <Volume2 size={16} />, title: "音频" },
    { id: "timing", icon: <Clock size={16} />, title: "判定偏移" },
    { id: "game", icon: <Gamepad2 size={16} />, title: "游戏" },
    { id: "keys", icon: <Keyboard size={16} />, title: "键位" },
    { id: "mod", icon: <Zap size={16} />, title: "Mod" },
    { id: "skin", icon: <Brush size={16} />, title: "皮肤" },
    { id: "search", icon: <Search size={16} />, title: "搜索" },
    { id: "network", icon: <Activity size={16} />, title: "连接检测" },
    { id: "download", icon: <Download size={16} />, title: "下载" },
    { id: "display", icon: <Image size={16} />, title: "画面" },
    { id: "lyrics", icon: <Music size={16} />, title: "歌词" },
    { id: "advanced", icon: <RotateCcw size={16} />, title: "高级" },
    { id: "about", icon: <Info size={16} />, title: "关于" },
  ];

  const [activeSection, setActiveSection] = useState<string>("appearance");

  return (
    <div className="page-shell">
      <div style={{
        display: "flex",
        gap: 20,
        minHeight: "calc(100vh - var(--nav-height) - var(--nowplaying-height) - 60px)",
      }}>
        {/* 左侧分类栏 */}
        <aside style={{
          width: 200,
          flexShrink: 0,
          position: "sticky",
          top: "calc(var(--nav-height) + 16px)",
          alignSelf: "flex-start",
          maxHeight: "calc(100vh - var(--nav-height) - var(--nowplaying-height) - 60px)",
          overflowY: "auto",
        }} className="hidden md:block">
          <div style={{
            padding: 8,
            borderRadius: 16,
            background: "var(--glass-bg)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid var(--glass-border)",
          }}>
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--lazer-accent)" : "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: 2,
                  }}
                  className="font-torus"
                >
                  {s.icon}
                  {s.title}
                </button>
              );
            })}
          </div>
        </aside>

        {/* 右侧内容 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 移动端分类选择器 */}
          <div className="md:hidden" style={{ marginBottom: 12, overflowX: "auto", display: "flex", gap: 6, paddingBottom: 4 }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="hud-btn"
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: activeSection === s.id ? "var(--lazer-accent)" : "var(--text-secondary)",
                }}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* 内容面板（按 activeSection 渲染对应区块，无折叠） */}
          <SectionPanel active={activeSection}>
            {activeSection === "appearance" && (
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
            )}

            {activeSection === "audio" && (
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

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>使用采样音效</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>优先使用谱面 / 皮肤 / 自定义采样，关闭后使用合成音效</div>
                  </div>
                  <GlassSwitch
                    checked={settings.useHitSamples}
                    onCheckedChange={(c) => updateSetting("useHitSamples", c)}
                    scheme={scheme}
                    ariaLabel="使用采样音效"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>默认采样集</div>
                  <div className="flex flex-wrap gap-2">
                    {(["normal", "soft", "drum"] as const).map((set) => {
                      const selected = settings.defaultSampleSet === set;
                      return (
                        <button
                          key={set}
                          onClick={() => updateSetting("defaultSampleSet", set)}
                          disabled={!settings.useHitSamples}
                          className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-40"
                          style={{
                            border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                            color: selected ? "#fff" : "var(--text-primary)",
                            background: selected ? "var(--accent)" : "transparent",
                            cursor: settings.useHitSamples ? "pointer" : "not-allowed",
                          }}
                        >
                          {set === "normal" ? "Normal" : set === "soft" ? "Soft" : "Drum"}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    谱面未指定采样集时使用的默认音色
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>导入音效采样包</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>从 .osz / .osk / .zip 中提取 .wav / .mp3 / .ogg</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings.customHitSoundUrls && Object.keys(settings.customHitSoundUrls).length > 0 && (
                        <button
                          onClick={handleClearHitSounds}
                          className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
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
                        className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-50"
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
                  </div>
                  {hitSoundImportMsg && (
                    <p className="text-xs" style={{ color: "var(--accent)" }}>{hitSoundImportMsg}</p>
                  )}
                  {settings.customHitSoundUrls && Object.keys(settings.customHitSoundUrls).length > 0 && (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      当前已加载 {Object.keys(settings.customHitSoundUrls).length} 个音效采样文件
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeSection === "timing" && (
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
            )}

            {activeSection === "game" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>自动模式</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>自动击打音符，适合练习观赏</div>
                  </div>
                  <GlassSwitch checked={settings.auto} onCheckedChange={(c) => updateSetting("auto", c)} scheme={scheme} ariaLabel="自动模式" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示光标</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>在游戏画面中显示指针位置</div>
                  </div>
                  <GlassSwitch checked={settings.showCursor} onCheckedChange={(c) => updateSetting("showCursor", c)} scheme={scheme} ariaLabel="显示光标" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>光标拖尾</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Auto / 显示光标时绘制移动轨迹</div>
                  </div>
                  <GlassSwitch checked={settings.showCursorTrail} onCheckedChange={(c) => updateSetting("showCursorTrail", c)} scheme={scheme} ariaLabel="光标拖尾" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>光标按下反馈</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>点击 / Auto 击打时放大光圈</div>
                  </div>
                  <GlassSwitch checked={settings.showCursorPress} onCheckedChange={(c) => updateSetting("showCursorPress", c)} scheme={scheme} ariaLabel="光标按下反馈" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>光标大小</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>×{settings.cursorSize.toFixed(1)}</span>
                  </div>
                  <GlassSlider value={settings.cursorSize} min={0.5} max={2} step={0.1} onChange={(v) => updateSetting("cursorSize", v)} scheme={scheme} ariaLabel="光标大小" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>Auto 光标速度</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{settings.autoCursorSpeed.toFixed(1)}x</span>
                  </div>
                  <GlassSlider value={settings.autoCursorSpeed} min={0.5} max={2.0} step={0.1} onChange={(v) => updateSetting("autoCursorSpeed", v)} scheme={scheme} ariaLabel="Auto 光标速度" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Auto 圆周模式</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>光标沿圆弧匀速移动，流畅衔接每个音符</div>
                  </div>
                  <GlassSwitch checked={settings.autoCircleMode} onCheckedChange={(c) => updateSetting("autoCircleMode", c)} scheme={scheme} ariaLabel="Auto 圆周模式" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>按键音音量</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{Math.round(settings.hitSoundVolume * 100)}%</span>
                  </div>
                  <GlassSlider value={settings.hitSoundVolume} min={0} max={1} step={0.01} onChange={(v) => updateSetting("hitSoundVolume", v)} scheme={scheme} ariaLabel="按键音音量" />
                </div>
              </div>
            )}

            {activeSection === "keys" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  点击按键后按下新键即可修改。空格键显示为 Space，方向键显示为 Arrow。
                </p>
                <KeyBindingGroup label="osu! (Standard)" keys={settings.keyBindings.standard} labels={["按键 1", "按键 2"]} onChange={(idx, key) => updateKeyBinding("standard", idx, key)} onReset={() => resetKeyBinding("standard")} scheme={scheme} />
                <KeyBindingGroup label="osu!taiko" keys={settings.keyBindings.taiko} labels={["KAT 左", "KAT 右", "DON 左", "DON 右"]} onChange={(idx, key) => updateKeyBinding("taiko", idx, key)} onReset={() => resetKeyBinding("taiko")} scheme={scheme} />
                <KeyBindingGroup label="osu!catch" keys={settings.keyBindings.catch} labels={["左移", "右移"]} onChange={(idx, key) => updateKeyBinding("catch", idx, key)} onReset={() => resetKeyBinding("catch")} scheme={scheme} />
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
                      scheme={scheme}
                    />
                  );
                })}
                <button onClick={() => updateSetting("keyBindings", { ...DEFAULT_KEY_BINDINGS })} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-transform active:scale-95" style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "transparent", cursor: "pointer" }}>
                  恢复全部默认键位
                </button>
              </div>
            )}

            {activeSection === "mod" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  点击切换 Mod，可多选。难度调整类（DT/HT/HR/Easy）会实际影响游戏速度与判定。也可以在谱面详情页或游戏准备页用浮动按钮快速切换。
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
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>已启用 {settings.mods.length} 个 Mod</span>
                    <button onClick={() => updateSetting("mods", [])} className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95" style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "transparent", cursor: "pointer" }}>
                      清除全部
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeSection === "skin" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>使用谱面自带皮肤</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>加载谱面包内的 hitcircle / cursor / slider 等纹理</div>
                  </div>
                  <GlassSwitch checked={settings.useBeatmapSkin} onCheckedChange={(c) => updateSetting("useBeatmapSkin", c)} scheme={scheme} ariaLabel="使用谱面自带皮肤" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>使用自定义皮肤</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>应用导入的 .osk 皮肤，优先级高于谱面皮肤</div>
                  </div>
                  <GlassSwitch checked={settings.useCustomSkin} onCheckedChange={(c) => updateSetting("useCustomSkin", c)} scheme={scheme} ariaLabel="使用自定义皮肤" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>导入 .osk 皮肤</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>从本地选择 osu! 皮肤压缩包</div>
                    </div>
                    <button onClick={() => skinInputRef.current?.click()} disabled={skinImporting} className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-50" style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: skinImporting ? "not-allowed" : "pointer" }}>
                      {skinImporting ? "导入中..." : "选择文件"}
                    </button>
                    <input ref={skinInputRef} type="file" accept=".osk,.zip" onChange={handleSkinImport} style={{ display: "none" }} />
                  </div>
                  {skinImportMsg && <p className="text-xs" style={{ color: "var(--accent)" }}>{skinImportMsg}</p>}
                  {settings.useCustomSkin && settings.customSkinAssetUrls && (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      当前皮肤已加载 {Object.keys(settings.customSkinAssetUrls).length} 个资源文件
                    </p>
                  )}
                </div>
                <div className="mt-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <div className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>默认皮肤自定义</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>自定义 Combo 颜色</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>覆盖默认 8 色 combo 配色</div>
                    </div>
                    <GlassSwitch checked={settings.useCustomComboColors} onCheckedChange={(c) => updateSetting("useCustomComboColors", c)} scheme={scheme} ariaLabel="自定义 Combo 颜色" />
                  </div>
                  {settings.useCustomComboColors && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {settings.customComboColors.map((color, i) => (
                        <input key={i} type="color" value={color} onChange={(e) => { const next = [...settings.customComboColors]; next[i] = e.target.value; updateSetting("customComboColors", next); }} style={{ width: 32, height: 32, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", background: "transparent" }} />
                      ))}
                      <button onClick={() => { if (settings.customComboColors.length < 8) { updateSetting("customComboColors", [...settings.customComboColors, "#ffffff"]); } }} disabled={settings.customComboColors.length >= 8} className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-40" style={{ border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer" }}>+ 添加</button>
                      <button onClick={() => updateSetting("customComboColors", ["#f472b6", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15"])} className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-transform active:scale-95" style={{ border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer" }}>重置</button>
                    </div>
                  )}
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>圆圈缩放</span><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.hitCircleScale.toFixed(2)}x</span></div>
                    <GlassSlider min={0.5} max={2} step={0.05} value={settings.hitCircleScale} onChange={(v) => updateSetting("hitCircleScale", v)} scheme={scheme} />
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>圆圈边框宽度</span><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.circleBorderWidth.toFixed(2)}x</span></div>
                    <GlassSlider min={0.5} max={3} step={0.05} value={settings.circleBorderWidth} onChange={(v) => updateSetting("circleBorderWidth", v)} scheme={scheme} />
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>滑条边框宽度</span><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.sliderBorderWidth.toFixed(2)}x</span></div>
                    <GlassSlider min={0.5} max={3} step={0.05} value={settings.sliderBorderWidth} onChange={(v) => updateSetting("sliderBorderWidth", v)} scheme={scheme} />
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between"><span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>滑条球缩放</span><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{settings.sliderBallScale.toFixed(2)}x</span></div>
                    <GlassSlider min={0.5} max={2} step={0.05} value={settings.sliderBallScale} onChange={(v) => updateSetting("sliderBallScale", v)} scheme={scheme} />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "search" && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>搜索源</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["all", "osu", "sayobot", "kitsu", "chimu"] as const).map((src) => (
                      <button key={src} onClick={() => updateSetting("searchSource", src)} className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95" style={{ border: "1px solid", borderColor: settings.searchSource === src ? "var(--accent)" : "var(--border)", color: settings.searchSource === src ? "var(--accent)" : "var(--text-primary)", background: settings.searchSource === src ? "var(--accent-soft)" : "transparent", cursor: "pointer" }}>
                        {src === "all" ? "全部竞速" : src === "osu" ? "osu.direct" : src === "sayobot" ? "Sayobot" : src === "kitsu" ? "Kitsu" : "Chimu"}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>"全部竞速" 同时请求所有源，取最快返回的结果</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>仅显示有 Storyboard</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>过滤搜索结果</div>
                  </div>
                  <GlassSwitch checked={settings.storyboardOnly} onCheckedChange={(c) => updateSetting("storyboardOnly", c)} scheme={scheme} ariaLabel="仅显示有 Storyboard" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>仅显示有视频</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>过滤搜索结果</div>
                  </div>
                  <GlassSwitch checked={settings.videoOnly} onCheckedChange={(c) => updateSetting("videoOnly", c)} scheme={scheme} ariaLabel="仅显示有视频" />
                </div>
              </div>
            )}

            {activeSection === "network" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>检测 API 连接</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>osu.direct / Sayobot / LRCLIB</div>
                  </div>
                  <button onClick={runCheck} disabled={checking} className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95 disabled:opacity-50" style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: checking ? "not-allowed" : "pointer" }}>
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
            )}

            {activeSection === "download" && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>下载完整谱面包</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>含 Storyboard / 视频资源，体积更大</div>
                </div>
                <GlassSwitch checked={settings.downloadFullPackage} onCheckedChange={(c) => updateSetting("downloadFullPackage", c)} scheme={scheme} ariaLabel="下载完整谱面包" />
              </div>
            )}

            {activeSection === "display" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>全屏模式</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>切换浏览器全屏，等同 F11</div>
                  </div>
                  <GlassSwitch checked={settings.fullscreen} onCheckedChange={(c) => updateSetting("fullscreen", c)} scheme={scheme} ariaLabel="全屏模式" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>页面缩放</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>×{settings.pageScale.toFixed(2)}</span>
                  </div>
                  <GlassSlider value={settings.pageScale} min={0.5} max={1.5} step={0.05} onChange={(v) => updateSetting("pageScale", v)} scheme={scheme} ariaLabel="页面缩放" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示 Storyboard</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>游戏内渲染完整 Storyboard</div>
                  </div>
                  <GlassSwitch checked={settings.showStoryboard} onCheckedChange={(c) => updateSetting("showStoryboard", c)} scheme={scheme} ariaLabel="显示 Storyboard" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>视频背景</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>播放谱面自带的视频背景（若有）</div>
                  </div>
                  <GlassSwitch checked={settings.showVideo} onCheckedChange={(c) => updateSetting("showVideo", c)} scheme={scheme} ariaLabel="视频背景" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>观赏模式</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>只播放 Storyboard、背景与音频，隐藏音符与判定</div>
                  </div>
                  <GlassSwitch checked={settings.spectatorMode} onCheckedChange={(c) => updateSetting("spectatorMode", c)} scheme={scheme} ariaLabel="观赏模式" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>强制横屏</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>游戏内强制使用横屏布局</div>
                  </div>
                  <GlassSwitch checked={settings.forceLandscape} onCheckedChange={(c) => updateSetting("forceLandscape", c)} scheme={scheme} ariaLabel="强制横屏" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>背景变暗</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{Math.round(settings.backgroundDim * 100)}%</span>
                  </div>
                  <GlassSlider value={settings.backgroundDim} min={0} max={1} step={0.01} onChange={(v) => updateSetting("backgroundDim", v)} scheme={scheme} ariaLabel="背景变暗" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>引导线提前</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>×{settings.approachMultiplier.toFixed(1)}</span>
                  </div>
                  <GlassSlider value={settings.approachMultiplier} min={1.0} max={2.5} step={0.1} onChange={(v) => updateSetting("approachMultiplier", v)} scheme={scheme} ariaLabel="引导线提前" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>背景模糊</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{Math.round(settings.backgroundBlur)}px</span>
                  </div>
                  <GlassSlider value={settings.backgroundBlur} min={0} max={20} step={1} onChange={(v) => updateSetting("backgroundBlur", v)} scheme={scheme} ariaLabel="背景模糊" />
                </div>
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示引导线</div></div>
                  <GlassSwitch checked={settings.showFollowPoints} onCheckedChange={(c) => updateSetting("showFollowPoints", c)} scheme={scheme} ariaLabel="显示引导线" />
                </div>
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示引导圈</div></div>
                  <GlassSwitch checked={settings.showApproachCircles} onCheckedChange={(c) => updateSetting("showApproachCircles", c)} scheme={scheme} ariaLabel="显示引导圈" />
                </div>
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示连击数字</div></div>
                  <GlassSwitch checked={settings.showComboNumbers} onCheckedChange={(c) => updateSetting("showComboNumbers", c)} scheme={scheme} ariaLabel="显示连击数字" />
                </div>
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示击中特效</div></div>
                  <GlassSwitch checked={settings.showHitEffects} onCheckedChange={(c) => updateSetting("showHitEffects", c)} scheme={scheme} ariaLabel="显示击中特效" />
                </div>
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示 FPS</div></div>
                  <GlassSwitch checked={settings.showFPS} onCheckedChange={(c) => updateSetting("showFPS", c)} scheme={scheme} ariaLabel="显示 FPS" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-primary)" }}>HUD 缩放</span>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>×{settings.hudScale.toFixed(1)}</span>
                  </div>
                  <GlassSlider value={settings.hudScale} min={0.8} max={1.5} step={0.1} onChange={(v) => updateSetting("hudScale", v)} scheme={scheme} ariaLabel="HUD 缩放" />
                </div>
              </div>
            )}

            {activeSection === "lyrics" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>显示歌词</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>游戏内底部显示匹配歌词</div>
                  </div>
                  <GlassSwitch checked={settings.showLyrics} onCheckedChange={(c) => updateSetting("showLyrics", c)} scheme={scheme} ariaLabel="显示歌词" />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>歌词效果</div>
                  <div className="flex flex-wrap gap-2">
                    {(["none", "fade", "slide"] as const).map((effect) => {
                      const selected = settings.lyricsEffect === effect;
                      return (
                        <button key={effect} onClick={() => updateSetting("lyricsEffect", effect)} className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95" style={{ border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`, color: selected ? "#fff" : "var(--text-primary)", background: selected ? "var(--accent)" : "transparent", cursor: "pointer" }}>
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
                  <GlassSlider value={settings.lyricsSize} min={12} max={24} step={1} onChange={(v) => updateSetting("lyricsSize", v)} scheme={scheme} ariaLabel="歌词大小" />
                </div>
              </div>
            )}

            {activeSection === "advanced" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>恢复默认设置</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>将所有选项重置为初始值</div>
                  </div>
                  <button onClick={resetSettings} className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95" style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: "pointer" }}>
                    重置
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>清除本地回放</div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>删除所有已保存的游戏回放</div>
                  </div>
                  <button onClick={clearReplays} className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95" style={{ border: "1px solid #ff375f", color: "#ff375f", background: "rgba(255, 55, 95, 0.12)", cursor: "pointer" }}>
                    <Trash2 size={12} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} />
                    清除
                  </button>
                </div>
              </div>
            )}

            {activeSection === "about" && (
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div><strong style={{ color: "var(--text-primary)", fontSize: 16 }}>osu!web</strong></div>
                <p>纯前端 osu! 客户端，在浏览器里畅玩谱面。</p>
                <p>在线体验：<a href="https://osu.yuiro.top" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>osu.yuiro.top</a></p>
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
                <p className="pt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>仅供学习交流，请勿用于商业用途</p>
              </div>
            )}
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}
