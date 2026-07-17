import React, { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { GlassSwitch, GlassSlider } from "@/components/glass";
import {
  Palette,
  Volume2,
  Gamepad2,
  Keyboard,
  Zap,
  Brush,
  Monitor,
  Search as SearchIcon,
  Settings2,
  Info,
  Wifi,
  Trash2,
  Languages,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Settings, ModType, KeyBindings } from "@/types";
import { DEFAULT_SETTINGS, DEFAULT_KEY_BINDINGS, MOD_LABEL, MOD_COLOR, defaultManiaKeys } from "@/types";
import { checkApiHealth, type ApiHealthResult } from "@/utils/apiHealth";
import { deleteReplay, loadReplays } from "@/utils/replayStorage";
import { useTranslation, SUPPORTED_LANGUAGES } from "@/i18n";
import type { TranslationKey, Language } from "@/i18n";

const ALL_MODS: ModType[] = [
  "easy", "notail", "halfTime", "hardRock", "suddenDeath",
  "doubleTime", "hidden", "flashlight", "relax", "autopilot",
];

const ACCENT_KEYS = ["#0a84ff", "#ff375f", "#ff9100", "#66cc44", "#8866ff", "#ff66aa"] as const;
const ACCENT_LABEL_KEYS: Record<string, TranslationKey> = {
  "#0a84ff": "appearance.color.blue",
  "#ff375f": "appearance.color.red",
  "#ff9100": "appearance.color.orange",
  "#66cc44": "appearance.color.green",
  "#8866ff": "appearance.color.purple",
  "#ff66aa": "appearance.color.pink",
};

interface SectionItem {
  id: string;
  icon: LucideIcon;
  titleKey: TranslationKey;
}

const SECTIONS: SectionItem[] = [
  { id: "language", icon: Languages, titleKey: "section.language" },
  { id: "appearance", icon: Palette, titleKey: "section.appearance" },
  { id: "audio", icon: Volume2, titleKey: "section.audio" },
  { id: "game", icon: Gamepad2, titleKey: "section.game" },
  { id: "keys", icon: Keyboard, titleKey: "section.keys" },
  { id: "mod", icon: Zap, titleKey: "section.mod" },
  { id: "skin", icon: Brush, titleKey: "section.skin" },
  { id: "display", icon: Monitor, titleKey: "section.display" },
  { id: "search", icon: SearchIcon, titleKey: "section.search" },
  { id: "advanced", icon: Settings2, titleKey: "section.advanced" },
  { id: "about", icon: Info, titleKey: "section.about" },
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
  pressingLabel: string;
  onChange: (key: string) => void;
}> = ({ label, keyVal, pressingLabel, onChange }) => {
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
        {listening ? pressingLabel : keyToLabel(keyVal)}
      </button>
    </div>
  );
};

/** 一组键位绑定 */
const KeyBindingGroup: React.FC<{
  label: string;
  keys: string[];
  labels: string[];
  pressingLabel: string;
  resetLabel: string;
  defaultColumnLabel: (i: number) => string;
  onChange: (index: number, key: string) => void;
  onReset: () => void;
}> = ({ label, keys, labels, pressingLabel, resetLabel, defaultColumnLabel, onChange, onReset }) => (
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
        {resetLabel}
      </button>
    </div>
    <div className="grid grid-cols-2 gap-x-4">
      {keys.map((k, i) => (
        <KeyBindingButton
          key={i}
          label={labels[i] || defaultColumnLabel(i + 1)}
          keyVal={k}
          pressingLabel={pressingLabel}
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
  const { t } = useTranslation();
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

  const [activeSection, setActiveSection] = useState<string>("language");

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
        setSkinImportMsg(t("skin.importSuccess", { name: file.name }));
      } else {
        setSkinImportMsg(t("skin.importFail"));
      }
    } catch {
      setSkinImportMsg(t("skin.importFailFormat"));
    } finally {
      setSkinImporting(false);
      if (skinInputRef.current) skinInputRef.current.value = "";
    }
  }, [importSkinFile, updateSetting, t]);

  const handleHitSoundImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHitSoundImporting(true);
    setHitSoundImportMsg("");
    try {
      const ok = await importHitSoundsFromFile(file);
      if (ok) {
        setHitSoundImportMsg(t("audio.importSuccess", { name: file.name }));
      } else {
        setHitSoundImportMsg(t("audio.importFail"));
      }
    } catch {
      setHitSoundImportMsg(t("audio.importFailFormat"));
    } finally {
      setHitSoundImporting(false);
      if (hitSoundInputRef.current) hitSoundInputRef.current.value = "";
    }
  }, [importHitSoundsFromFile, t]);

  const handleClearHitSounds = useCallback(async () => {
    await clearCustomHitSounds();
    setHitSoundImportMsg(t("audio.clearedSamples"));
  }, [clearCustomHitSounds, t]);

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
      {/* 左侧分类栏 - 桌面端悬浮固定在屏幕上 */}
      <aside
        style={{
          position: "fixed",
          left: "max(24px, calc(50vw - 576px))",
          top: 28,
          width: 200,
          maxHeight: "calc(100vh - 56px)",
          overflowY: "auto",
          zIndex: 10,
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
                  {t(s.titleKey)}
                </button>
              );
            })}
          </div>
        </aside>

        {/* 右侧内容（桌面端预留左侧悬浮栏空间） */}
        <div
          className="md:pl-[220px]"
          style={{ minHeight: "calc(100vh - var(--nav-height) - 60px)" }}
        >
          {/* 移动端：icon-only 横向滚动标签栏 */}
          <div
            className="flex md:hidden no-scrollbar"
            style={{
              marginBottom: 12,
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
                  aria-label={t(s.titleKey)}
                  title={t(s.titleKey)}
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
              {t(SECTIONS.find((s) => s.id === activeSection)?.titleKey!)}
            </h2>
          </div>

          {/* 桌面端：当前分区标题 */}
          {(() => {
            const sec = SECTIONS.find((s) => s.id === activeSection);
            if (!sec) return null;
            const Icon = sec.icon;
            return (
              <div
                className="hidden md:flex"
                style={{ alignItems: "center", gap: 10, marginBottom: 14 }}
              >
                <Icon size={20} color="var(--accent)" />
                <h2
                  className="font-torus"
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t(sec.titleKey)}
                </h2>
              </div>
            );
          })()}

          <SectionPanel key={activeSection}>
            <div className="section-enter">
            {/* 语言 */}
            {activeSection === "language" && (
              <div className="flex flex-col gap-4">
                <SettingLabel title={t("language.title")} desc={t("language.desc")} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const selected = settings.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => updateSetting("language", lang.code as Language)}
                        className="rounded-xl p-4 text-center transition-all active:scale-95"
                        style={{
                          border: `1px solid ${selected ? "var(--accent)" : "var(--glass-border)"}`,
                          background: selected ? "var(--accent-soft)" : "rgba(255,255,255,0.03)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          className="font-torus"
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: selected ? "var(--accent)" : "var(--text-primary)",
                          }}
                        >
                          {lang.native}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                          {lang.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 外观 */}
            {activeSection === "appearance" && (
              <div className="flex flex-col gap-4">
                <div>
                  <SubHeader>
                    <span className="inline-flex items-center gap-2">
                      <Palette size={14} style={{ color: "var(--text-secondary)" }} />
                      {t("appearance.themeColor")}
                    </span>
                  </SubHeader>
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_KEYS.map((c) => {
                      const selected = settings.accent === c;
                      return (
                        <button
                          key={c}
                          onClick={() => updateSetting("accent", c)}
                          aria-label={t(ACCENT_LABEL_KEYS[c])}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: c,
                            border: selected ? "3px solid var(--text-primary)" : "3px solid transparent",
                            boxShadow: selected ? `0 0 0 2px ${c}44, 0 4px 12px ${c}33` : "none",
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
                <SubHeader>{t("audio.volumeAndSpeed")}</SubHeader>
                <SliderSetting
                  label={t("audio.musicVolume")}
                  value={settings.volume}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSetting("volume", v)}
                  scheme={scheme}
                  ariaLabel={t("audio.musicVolume")}
                />
                <SliderSetting
                  label={t("audio.playbackRate")}
                  value={settings.playbackRate}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  format={(v) => `×${v.toFixed(2)}`}
                  onChange={(v) => updateSetting("playbackRate", v)}
                  scheme={scheme}
                  ariaLabel={t("audio.playbackRate")}
                />
                <SliderSetting
                  label={t("audio.hitSoundVolume")}
                  value={settings.hitSoundVolume}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSetting("hitSoundVolume", v)}
                  scheme={scheme}
                  ariaLabel={t("audio.hitSoundVolume")}
                />
                <SliderSetting
                  label={t("audio.offset")}
                  value={settings.offset}
                  min={-200}
                  max={200}
                  step={5}
                  format={(v) => `${v > 0 ? "+" : ""}${v} ms`}
                  onChange={(v) => updateSetting("offset", v)}
                  scheme={scheme}
                  ariaLabel={t("audio.offset")}
                />
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {t("audio.offsetHint")}
                </p>

                <SubHeader>{t("audio.hitSamples")}</SubHeader>
                <SettingRow>
                  <SettingLabel
                    title={t("audio.useHitSamples")}
                    desc={t("audio.useHitSamplesDesc")}
                  />
                  <GlassSwitch
                    checked={settings.useHitSamples}
                    onCheckedChange={(c) => updateSetting("useHitSamples", c)}
                    scheme={scheme}
                    ariaLabel={t("audio.useHitSamples")}
                  />
                </SettingRow>
                <div>
                  <SubHeader>{t("audio.defaultSampleSet")}</SubHeader>
                  <ChipGroup
                    options={["normal", "soft", "drum"] as const}
                    value={settings.defaultSampleSet}
                    onChange={(v) => updateSetting("defaultSampleSet", v)}
                    renderLabel={(v) => (v === "normal" ? "Normal" : v === "soft" ? "Soft" : "Drum")}
                  />
                  <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {t("audio.defaultSampleSetHint")}
                  </p>
                </div>
                <div>
                  <SubHeader>{t("audio.importSamples")}</SubHeader>
                  <SettingRow>
                    <SettingLabel title={t("audio.selectSampleFile")} desc={t("audio.selectSampleFileDesc")} />
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
                          {t("common.clear")}
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
                        {hitSoundImporting ? t("common.importing") : t("common.selectFile")}
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
                      {t("audio.loadedSamples", { count: Object.keys(settings.customHitSoundUrls).length })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 游戏 */}
            {activeSection === "game" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title={t("game.auto")} desc={t("game.autoDesc")} />
                  <GlassSwitch checked={settings.auto} onCheckedChange={(c) => updateSetting("auto", c)} scheme={scheme} ariaLabel={t("game.auto")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("game.showCursor")} desc={t("game.showCursorDesc")} />
                  <GlassSwitch checked={settings.showCursor} onCheckedChange={(c) => updateSetting("showCursor", c)} scheme={scheme} ariaLabel={t("game.showCursor")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("game.cursorTrail")} desc={t("game.cursorTrailDesc")} />
                  <GlassSwitch checked={settings.showCursorTrail} onCheckedChange={(c) => updateSetting("showCursorTrail", c)} scheme={scheme} ariaLabel={t("game.cursorTrail")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("game.cursorPress")} desc={t("game.cursorPressDesc")} />
                  <GlassSwitch checked={settings.showCursorPress} onCheckedChange={(c) => updateSetting("showCursorPress", c)} scheme={scheme} ariaLabel={t("game.cursorPress")} />
                </SettingRow>
                <SliderSetting
                  label={t("game.cursorSize")}
                  value={settings.cursorSize}
                  min={0.5}
                  max={2}
                  step={0.1}
                  format={(v) => `×${v.toFixed(1)}`}
                  onChange={(v) => updateSetting("cursorSize", v)}
                  scheme={scheme}
                  ariaLabel={t("game.cursorSize")}
                />
                <SliderSetting
                  label={t("game.autoCursorSpeed")}
                  value={settings.autoCursorSpeed}
                  min={0.5}
                  max={2}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)}x`}
                  onChange={(v) => updateSetting("autoCursorSpeed", v)}
                  scheme={scheme}
                  ariaLabel={t("game.autoCursorSpeed")}
                />
                <SettingRow>
                  <SettingLabel title={t("game.autoCircleMode")} desc={t("game.autoCircleModeDesc")} />
                  <GlassSwitch checked={settings.autoCircleMode} onCheckedChange={(c) => updateSetting("autoCircleMode", c)} scheme={scheme} ariaLabel={t("game.autoCircleMode")} />
                </SettingRow>
              </div>
            )}

            {/* 键位 */}
            {activeSection === "keys" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {t("keys.hint")}
                </p>
                <KeyBindingGroup
                  label={t("keys.standard")}
                  keys={settings.keyBindings.standard}
                  labels={[t("keys.key1"), t("keys.key2")]}
                  pressingLabel={t("keys.pressing")}
                  resetLabel={t("common.reset")}
                  defaultColumnLabel={(i) => t("keys.column", { n: i })}
                  onChange={(idx, key) => updateKeyBinding("standard", idx, key)}
                  onReset={() => resetKeyBinding("standard")}
                />
                <KeyBindingGroup
                  label={t("keys.taiko")}
                  keys={settings.keyBindings.taiko}
                  labels={[t("keys.katLeft"), t("keys.katRight"), t("keys.donLeft"), t("keys.donRight")]}
                  pressingLabel={t("keys.pressing")}
                  resetLabel={t("common.reset")}
                  defaultColumnLabel={(i) => t("keys.column", { n: i })}
                  onChange={(idx, key) => updateKeyBinding("taiko", idx, key)}
                  onReset={() => resetKeyBinding("taiko")}
                />
                <KeyBindingGroup
                  label={t("keys.catch")}
                  keys={settings.keyBindings.catch}
                  labels={[t("keys.moveLeft"), t("keys.moveRight")]}
                  pressingLabel={t("keys.pressing")}
                  resetLabel={t("common.reset")}
                  defaultColumnLabel={(i) => t("keys.column", { n: i })}
                  onChange={(idx, key) => updateKeyBinding("catch", idx, key)}
                  onReset={() => resetKeyBinding("catch")}
                />
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cols) => {
                  const keys = settings.keyBindings.mania[cols] || defaultManiaKeys(cols);
                  return (
                    <KeyBindingGroup
                      key={cols}
                      label={t("keys.mania", { cols })}
                      keys={keys}
                      labels={Array.from({ length: keys.length }, (_, i) => t("keys.column", { n: i + 1 }))}
                      pressingLabel={t("keys.pressing")}
                      resetLabel={t("common.reset")}
                      defaultColumnLabel={(i) => t("keys.column", { n: i })}
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
                  {t("keys.resetAll")}
                </button>
              </div>
            )}

            {/* Mod */}
            {activeSection === "mod" && (
              <div className="flex flex-col gap-5">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {t("mod.hint")}
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
                    <SettingLabel title={t("mod.enabledCount", { count: settings.mods.length })} />
                    <button
                      onClick={() => updateSetting("mods", [])}
                      className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                      style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "transparent", cursor: "pointer" }}
                    >
                      {t("mod.clearAll")}
                    </button>
                  </SettingRow>
                )}
              </div>
            )}

            {/* 皮肤 */}
            {activeSection === "skin" && (
              <div className="flex flex-col gap-4">
                <SettingRow>
                  <SettingLabel title={t("skin.useBeatmapSkin")} desc={t("skin.useBeatmapSkinDesc")} />
                  <GlassSwitch checked={settings.useBeatmapSkin} onCheckedChange={(c) => updateSetting("useBeatmapSkin", c)} scheme={scheme} ariaLabel={t("skin.useBeatmapSkin")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("skin.useCustomSkin")} desc={t("skin.useCustomSkinDesc")} />
                  <GlassSwitch checked={settings.useCustomSkin} onCheckedChange={(c) => updateSetting("useCustomSkin", c)} scheme={scheme} ariaLabel={t("skin.useCustomSkin")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("skin.importOsk")} desc={t("skin.importOskDesc")} />
                  <button
                    onClick={() => skinInputRef.current?.click()}
                    disabled={skinImporting}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                    style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: skinImporting ? "not-allowed" : "pointer" }}
                  >
                    {skinImporting ? t("common.importing") : t("common.selectFile")}
                  </button>
                  <input ref={skinInputRef} type="file" accept=".osk,.zip" onChange={handleSkinImport} style={{ display: "none" }} />
                </SettingRow>
                {skinImportMsg && <p className="text-xs" style={{ color: "var(--accent)" }}>{skinImportMsg}</p>}
                {settings.useCustomSkin && settings.customSkinAssetUrls && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {t("skin.loadedAssets", { count: Object.keys(settings.customSkinAssetUrls).length })}
                  </p>
                )}

                <div className="mt-2 border-t pt-5" style={{ borderColor: "var(--glass-border)" }}>
                  <SubHeader>{t("skin.defaultCustomization")}</SubHeader>
                  <SettingRow>
                    <SettingLabel title={t("skin.customComboColors")} desc={t("skin.customComboColorsDesc")} />
                    <GlassSwitch checked={settings.useCustomComboColors} onCheckedChange={(c) => updateSetting("useCustomComboColors", c)} scheme={scheme} ariaLabel={t("skin.customComboColors")} />
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
                        {t("common.add")}
                      </button>
                      <button
                        onClick={() => updateSetting("customComboColors", ["#f472b6", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15"])}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                        style={{ border: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer" }}
                      >
                        {t("common.reset")}
                      </button>
                    </div>
                  )}
                  <div className="mt-4">
                    <SliderSetting
                      label={t("skin.hitCircleScale")}
                      value={settings.hitCircleScale}
                      min={0.5}
                      max={2}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("hitCircleScale", v)}
                      scheme={scheme}
                      ariaLabel={t("skin.hitCircleScale")}
                    />
                  </div>
                  <div className="mt-4">
                    <SliderSetting
                      label={t("skin.circleBorderWidth")}
                      value={settings.circleBorderWidth}
                      min={0.5}
                      max={3}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("circleBorderWidth", v)}
                      scheme={scheme}
                      ariaLabel={t("skin.circleBorderWidth")}
                    />
                  </div>
                  <div className="mt-4">
                    <SliderSetting
                      label={t("skin.sliderBorderWidth")}
                      value={settings.sliderBorderWidth}
                      min={0.5}
                      max={3}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("sliderBorderWidth", v)}
                      scheme={scheme}
                      ariaLabel={t("skin.sliderBorderWidth")}
                    />
                  </div>
                  <div className="mt-4">
                    <SliderSetting
                      label={t("skin.sliderBallScale")}
                      value={settings.sliderBallScale}
                      min={0.5}
                      max={2}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}x`}
                      onChange={(v) => updateSetting("sliderBallScale", v)}
                      scheme={scheme}
                      ariaLabel={t("skin.sliderBallScale")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 搜索 */}
            {activeSection === "search" && (
              <div className="flex flex-col gap-5">
                <div>
                  <SubHeader>{t("search.source")}</SubHeader>
                  <ChipGroup
                    options={["all", "osu", "sayobot", "kitsu", "chimu"] as const}
                    value={settings.searchSource}
                    onChange={(v) => updateSetting("searchSource", v)}
                    renderLabel={(v) =>
                      v === "all" ? t("search.allRace") : v === "osu" ? "osu.direct" : v === "sayobot" ? "Sayobot" : v === "kitsu" ? "Kitsu" : "Chimu"
                    }
                  />
                  <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {t("search.allRaceHint")}
                  </p>
                </div>
                <SettingRow>
                  <SettingLabel title={t("search.storyboardOnly")} desc={t("search.storyboardOnlyDesc")} />
                  <GlassSwitch checked={settings.storyboardOnly} onCheckedChange={(c) => updateSetting("storyboardOnly", c)} scheme={scheme} ariaLabel={t("search.storyboardOnly")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("search.videoOnly")} desc={t("search.videoOnlyDesc")} />
                  <GlassSwitch checked={settings.videoOnly} onCheckedChange={(c) => updateSetting("videoOnly", c)} scheme={scheme} ariaLabel={t("search.videoOnly")} />
                </SettingRow>

                <SubHeader>{t("search.download")}</SubHeader>
                <SettingRow>
                  <SettingLabel title={t("search.downloadFullPackage")} desc={t("search.downloadFullPackageDesc")} />
                  <GlassSwitch checked={settings.downloadFullPackage} onCheckedChange={(c) => updateSetting("downloadFullPackage", c)} scheme={scheme} ariaLabel={t("search.downloadFullPackage")} />
                </SettingRow>
              </div>
            )}

            {/* 画面 */}
            {activeSection === "display" && (
              <div className="flex flex-col gap-4">
                <SubHeader>{t("display.layout")}</SubHeader>
                <SettingRow>
                  <SettingLabel title={t("display.fullscreen")} desc={t("display.fullscreenDesc")} />
                  <GlassSwitch checked={settings.fullscreen} onCheckedChange={(c) => updateSetting("fullscreen", c)} scheme={scheme} ariaLabel={t("display.fullscreen")} />
                </SettingRow>
                <SliderSetting
                  label={t("display.pageScale")}
                  value={settings.pageScale}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  format={(v) => `×${v.toFixed(2)}`}
                  onChange={(v) => updateSetting("pageScale", v)}
                  scheme={scheme}
                  ariaLabel={t("display.pageScale")}
                />
                <SettingRow>
                  <SettingLabel title={t("display.forceLandscape")} desc={t("display.forceLandscapeDesc")} />
                  <GlassSwitch checked={settings.forceLandscape} onCheckedChange={(c) => updateSetting("forceLandscape", c)} scheme={scheme} ariaLabel={t("display.forceLandscape")} />
                </SettingRow>
                <SliderSetting
                  label={t("display.hudScale")}
                  value={settings.hudScale}
                  min={0.8}
                  max={1.5}
                  step={0.1}
                  format={(v) => `×${v.toFixed(1)}`}
                  onChange={(v) => updateSetting("hudScale", v)}
                  scheme={scheme}
                  ariaLabel={t("display.hudScale")}
                />

                <SubHeader>{t("display.background")}</SubHeader>
                <SettingRow>
                  <SettingLabel title={t("display.showStoryboard")} desc={t("display.showStoryboardDesc")} />
                  <GlassSwitch checked={settings.showStoryboard} onCheckedChange={(c) => updateSetting("showStoryboard", c)} scheme={scheme} ariaLabel={t("display.showStoryboard")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("display.videoBackground")} desc={t("display.videoBackgroundDesc")} />
                  <GlassSwitch checked={settings.showVideo} onCheckedChange={(c) => updateSetting("showVideo", c)} scheme={scheme} ariaLabel={t("display.videoBackground")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("display.spectatorMode")} desc={t("display.spectatorModeDesc")} />
                  <GlassSwitch checked={settings.spectatorMode} onCheckedChange={(c) => updateSetting("spectatorMode", c)} scheme={scheme} ariaLabel={t("display.spectatorMode")} />
                </SettingRow>
                <SliderSetting
                  label={t("display.backgroundDim")}
                  value={settings.backgroundDim}
                  min={0}
                  max={1}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) => updateSetting("backgroundDim", v)}
                  scheme={scheme}
                  ariaLabel={t("display.backgroundDim")}
                />
                <SliderSetting
                  label={t("display.backgroundBlur")}
                  value={settings.backgroundBlur}
                  min={0}
                  max={20}
                  step={1}
                  format={(v) => `${Math.round(v)}px`}
                  onChange={(v) => updateSetting("backgroundBlur", v)}
                  scheme={scheme}
                  ariaLabel={t("display.backgroundBlur")}
                />

                <SubHeader>{t("display.gameElements")}</SubHeader>
                <SliderSetting
                  label={t("display.approachMultiplier")}
                  value={settings.approachMultiplier}
                  min={1}
                  max={2.5}
                  step={0.1}
                  format={(v) => `×${v.toFixed(1)}`}
                  onChange={(v) => updateSetting("approachMultiplier", v)}
                  scheme={scheme}
                  ariaLabel={t("display.approachMultiplier")}
                />
                <SettingRow>
                  <SettingLabel title={t("display.showFollowPoints")} />
                  <GlassSwitch checked={settings.showFollowPoints} onCheckedChange={(c) => updateSetting("showFollowPoints", c)} scheme={scheme} ariaLabel={t("display.showFollowPoints")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("display.showApproachCircles")} />
                  <GlassSwitch checked={settings.showApproachCircles} onCheckedChange={(c) => updateSetting("showApproachCircles", c)} scheme={scheme} ariaLabel={t("display.showApproachCircles")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("display.showComboNumbers")} />
                  <GlassSwitch checked={settings.showComboNumbers} onCheckedChange={(c) => updateSetting("showComboNumbers", c)} scheme={scheme} ariaLabel={t("display.showComboNumbers")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("display.showHitEffects")} />
                  <GlassSwitch checked={settings.showHitEffects} onCheckedChange={(c) => updateSetting("showHitEffects", c)} scheme={scheme} ariaLabel={t("display.showHitEffects")} />
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("display.showFPS")} />
                  <GlassSwitch checked={settings.showFPS} onCheckedChange={(c) => updateSetting("showFPS", c)} scheme={scheme} ariaLabel={t("display.showFPS")} />
                </SettingRow>

                <SubHeader>{t("display.lyrics")}</SubHeader>
                <SettingRow>
                  <SettingLabel title={t("display.showLyrics")} desc={t("display.showLyricsDesc")} />
                  <GlassSwitch checked={settings.showLyrics} onCheckedChange={(c) => updateSetting("showLyrics", c)} scheme={scheme} ariaLabel={t("display.showLyrics")} />
                </SettingRow>
                <div>
                  <SubHeader>{t("display.lyricsEffect")}</SubHeader>
                  <ChipGroup
                    options={["none", "fade", "slide"] as const}
                    value={settings.lyricsEffect}
                    onChange={(v) => updateSetting("lyricsEffect", v)}
                    renderLabel={(v) => (v === "none" ? t("display.lyricsEffectNone") : v === "fade" ? t("display.lyricsEffectFade") : t("display.lyricsEffectSlide"))}
                  />
                </div>
                <SliderSetting
                  label={t("display.lyricsSize")}
                  value={settings.lyricsSize}
                  min={12}
                  max={24}
                  step={1}
                  format={(v) => `${Math.round(v)}px`}
                  onChange={(v) => updateSetting("lyricsSize", v)}
                  scheme={scheme}
                  ariaLabel={t("display.lyricsSize")}
                />
              </div>
            )}

            {/* 高级 */}
            {activeSection === "advanced" && (
              <div className="flex flex-col gap-4">
                <SubHeader>{t("advanced.dataManagement")}</SubHeader>
                <SettingRow>
                  <SettingLabel title={t("advanced.resetSettings")} desc={t("advanced.resetSettingsDesc")} />
                  <button
                    onClick={resetSettings}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                    style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: "pointer" }}
                  >
                    {t("common.reset")}
                  </button>
                </SettingRow>
                <SettingRow>
                  <SettingLabel title={t("advanced.clearReplays")} desc={t("advanced.clearReplaysDesc")} />
                  <button
                    onClick={clearReplays}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                    style={{ border: "1px solid var(--error)", color: "var(--error)", background: "var(--error-soft)", cursor: "pointer" }}
                  >
                    <Trash2 size={12} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} />
                    {t("common.clear")}
                  </button>
                </SettingRow>

                <SubHeader>
                  <span className="inline-flex items-center gap-2">
                    <Wifi size={14} style={{ color: "var(--text-secondary)" }} />
                    {t("advanced.connectionCheck")}
                  </span>
                </SubHeader>
                <SettingRow>
                  <SettingLabel title={t("advanced.checkApi")} desc={t("advanced.checkApiDesc")} />
                  <button
                    onClick={runCheck}
                    disabled={checking}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                    style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "var(--accent-soft)", cursor: checking ? "not-allowed" : "pointer" }}
                  >
                    {checking ? t("advanced.checking") : t("advanced.checkApi")}
                  </button>
                </SettingRow>
                {health && (
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    {[
                      { key: "osuDirect", label: t("advanced.osuDirectSearch") },
                      { key: "sayobotSearch", label: t("advanced.sayobotSearch") },
                      { key: "sayobotDownload", label: t("advanced.sayobotDetail") },
                      { key: "lrclibLyrics", label: t("advanced.lrclibLyrics") },
                    ].map(({ key, label }) => {
                      const ok = health[key as keyof ApiHealthResult];
                      return (
                        <div key={key} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--accent-soft)", border: "1px solid var(--glass-border)" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ok ? "var(--success)" : "var(--error)" }} />
                          <span style={{ color: "var(--text-primary)" }}>{label}</span>
                          <span style={{ color: ok ? "var(--success)" : "var(--error)", marginLeft: "auto", fontWeight: 700 }}>{ok ? t("common.normal") : t("common.unavailable")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 关于 */}
            {activeSection === "about" && (
              <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <div>
                  <strong style={{ color: "var(--text-primary)", fontSize: 18 }}>osu!web</strong>
                  <p className="mt-1">{t("about.tagline")}</p>
                </div>
                <p>{t("about.onlineExperience")}：<a href="https://osu.yuiro.top" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>osu.yuiro.top</a></p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{t("about.features")}</div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
                      <li>{t("about.feature.modes")}</li>
                      <li>{t("about.feature.storyboard")}</li>
                      <li>{t("about.feature.replay")}</li>
                      <li>{t("about.feature.hitSounds")}</li>
                      <li>{t("about.feature.mods")}</li>
                      <li>{t("about.feature.skins")}</li>
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
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{t("about.dataSources")}</div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
                      <li>{t("about.source.search")}</li>
                      <li>{t("about.source.download")}</li>
                      <li>{t("about.source.lyrics")}</li>
                    </ul>
                  </div>
                </div>
                <p className="pt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>{t("about.disclaimer")}</p>
              </div>
            )}
            </div>
          </SectionPanel>
        </div>
    </div>
  );
}
