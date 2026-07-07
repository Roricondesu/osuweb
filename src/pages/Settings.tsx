import React from "react";
import { useGameStore } from "@/store/useGameStore";
import { GlassSwitch, GlassSlider } from "@/components/glass";
import { Moon, Volume2, Clock, Palette, Info, Gamepad2 } from "lucide-react";
import type { Settings } from "@/types";

const ACCENTS = [
  { key: "#0a84ff", label: "蓝" },
  { key: "#ff375f", label: "红" },
  { key: "#ff9100", label: "橙" },
  { key: "#66cc44", label: "绿" },
  { key: "#9966ff", label: "紫" },
  { key: "#ff66aa", label: "粉" },
];

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; delay?: number }> = ({
  icon,
  title,
  children,
  delay = 1,
}) => (
  <section className={`animate-enter animate-enter-${delay}`}>
    <div className="solid-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span style={{ color: "var(--text-secondary)" }}>{icon}</span>
        <h2 className="text-base font-semibold md:text-lg" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  </section>
);

export default function Settings() {
  const settings = useGameStore((s) => s.settings);
  const updateSetting = useGameStore((s) => s.updateSetting);
  const scheme = settings.theme === "dark" ? "dark" : "light";

  return (
    <div className="page-shell space-y-4">
      <Section icon={<Moon size={18} />} title="外观" delay={1}>
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

      <Section icon={<Volume2 size={18} />} title="音量" delay={2}>
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
      </Section>

      <Section icon={<Clock size={18} />} title="判定偏移" delay={3}>
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

      <Section icon={<Gamepad2 size={18} />} title="游戏" delay={4}>
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
        </div>
      </Section>

      <Section icon={<Info size={18} />} title="关于" delay={5}>
        <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>osu! game</strong> · 移动端节奏游戏
          </p>
          <p>支持 4 种模式：osu! / 太鼓 / 接水果 / 下落式</p>
          <p>谱面来源：osu.direct 公共镜像（无 API key）</p>
          <p>下载镜像：sayobot mini（无视频，体积最小）</p>
          <p className="pt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            仅供学习交流，请勿用于商业用途
          </p>
        </div>
      </Section>
    </div>
  );
}
