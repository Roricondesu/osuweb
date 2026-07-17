import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { useTranslation } from "@/i18n";
import { loadScores } from "@/utils/scoreStorage";
import {
  loadOsuProfile,
  saveOsuProfile,
  clearOsuProfile,
  loadLocalUsername,
  saveLocalUsername,
  loadLocalAvatar,
  saveLocalAvatar,
  clearLocalAvatar,
} from "@/utils/profileStorage";
import {
  fetchOsuUser,
  buildBeatmapCoverUrl,
  type OsuUserProfile,
} from "@/utils/osuApi";
import {
  calculateWeightedTotalPP,
  ppContribution,
  GRADE_COLOR,
  officialAccuracy,
  type Grade,
} from "@/utils/ppCalculator";
import { BeatmapCover, OsuLogoIcon } from "@/components/common";
import {
  User,
  Trophy,
  RefreshCw,
  Unlink,
  Search as SearchIcon,
  Camera,
  Pencil,
  Check,
  X,
  Star,
  Globe,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ScoreRecord } from "@/types";

const GRADE_ORDER: Grade[] = ["SS", "SSH", "S", "SH", "A", "B", "C", "D", "F"];
const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 0.85;

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  const day = 86400000;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < day) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

const starColor = (s: number): string => {
  if (s >= 9) return "#9966ff";
  if (s >= 7) return "#ff375f";
  if (s >= 5.5) return "#ff9100";
  if (s >= 4) return "#ffb800";
  if (s >= 2.5) return "#66cc44";
  return "#0a84ff";
};

/** 读取图片文件 → 居中裁剪缩放到固定尺寸 → JPEG dataURL */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("no ctx"));
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        resolve(canvas.toDataURL("image/jpeg", AVATAR_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const StatCard: React.FC<{ label: string; value: string; sub?: string; accent?: boolean }> = ({
  label,
  value,
  sub,
  accent,
}) => (
  <div
    style={{
      padding: 16,
      borderRadius: "var(--radius-md)",
      background: accent ? "var(--accent-soft)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${accent ? "var(--accent)" : "var(--glass-border)"}`,
    }}
  >
    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
    <div
      className="hud-num"
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: accent ? "var(--accent)" : "var(--text-primary)",
        letterSpacing: "-0.01em",
      }}
    >
      {value}
    </div>
    {sub && <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{sub}</div>}
  </div>
);

/** 游玩记录条（osu! 官方风格：封面缩略 + 评级 + 谱面信息 + pp/加权 + 准确率/连击 + 时间） */
const ScoreRow: React.FC<{
  score: ScoreRecord;
  weighted: number;
  rankIdx: number;
  onClick: () => void;
}> = ({ score, weighted, rankIdx, onClick }) => {
  const [hover, setHover] = useState(false);
  const sc = starColor(score.stars);
  const coverUrl = buildBeatmapCoverUrl(score.setId);
  const acc = officialAccuracy(score.counts);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 12,
        padding: 8,
        borderRadius: "var(--radius-md)",
        background: hover ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hover ? "var(--glass-border-hover, rgba(255,255,255,0.14))" : "var(--glass-border)"}`,
        cursor: "pointer",
        transition: "all 0.18s cubic-bezier(0.22,1,0.36,1)",
        transform: hover ? "translateX(2px)" : "none",
      }}
    >
      {/* 封面缩略图 + 评级徽章 */}
      <div
        style={{
          position: "relative",
          width: 92,
          height: 64,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <BeatmapCover
          src={coverUrl}
          alt={score.title}
          placeholderSize={28}
          lazy
          imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* 评级徽章：左下角 */}
        <div
          style={{
            position: "absolute",
            left: 4,
            bottom: 4,
            minWidth: 22,
            height: 22,
            padding: "0 5px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${GRADE_COLOR[score.grade]}e6`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          <span
            className="hud-num"
            style={{ fontSize: 12, fontWeight: 900, color: "#fff", lineHeight: 1 }}
          >
            {score.grade}
          </span>
        </div>
      </div>

      {/* 中间：谱面信息 */}
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
        <div
          className="font-torus"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}
        >
          {score.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {score.artist} · {score.version || "Default"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Star size={11} fill={sc} color={sc} />
            <span className="hud-num" style={{ fontSize: 11, fontWeight: 700, color: sc }}>
              {score.stars.toFixed(2)}
            </span>
          </span>
          {rankIdx >= 0 && (
            <span
              className="hud-num"
              style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}
            >
              #{rankIdx + 1}
            </span>
          )}
          {score.mods.length > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--accent)",
                background: "var(--accent-soft)",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              {score.mods.join(",")}
            </span>
          )}
          {!score.passed && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#ff375f" }}>FAIL</span>
          )}
        </div>
      </div>

      {/* 右侧：pp + 加权 */}
      <div
        style={{
          textAlign: "right",
          flexShrink: 0,
          minWidth: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          className="hud-num font-torus"
          style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.01em", lineHeight: 1.1 }}
        >
          {score.pp > 0 ? score.pp.toFixed(0) : "—"}
        </div>
        {score.pp > 0 && (
          <div className="hud-num" style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
            {weighted > 0 ? `+${weighted.toFixed(0)}` : ""}
          </div>
        )}
      </div>

      {/* 准确率 + 连击 */}
      <div
        className="hidden sm:flex"
        style={{
          textAlign: "right",
          flexShrink: 0,
          minWidth: 64,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div className="hud-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {acc.toFixed(2)}%
        </div>
        <div className="hud-num" style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
          {score.maxCombo}x
        </div>
      </div>

      {/* 时间 */}
      <div
        className="hidden md:flex"
        style={{
          textAlign: "right",
          flexShrink: 0,
          minWidth: 44,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{formatDate(score.createdAt)}</span>
      </div>
    </div>
  );
};

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = useGameStore((s) => s.settings);
  const updateSetting = useGameStore((s) => s.updateSetting);

  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [osuProfile, setOsuProfile] = useState<OsuUserProfile | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [osuUsername, setOsuUsername] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 本地自定义用户名 / 头像（未绑定官方账号时使用）
  const [localUsername, setLocalUsername] = useState("");
  const [localAvatar, setLocalAvatar] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScores(loadScores());
    const p = loadOsuProfile();
    setOsuProfile(p);
    setApiKey(settings.osuApiKey ?? "");
    setOsuUsername(settings.osuUsername ?? "");
    setLocalUsername(loadLocalUsername());
    setLocalAvatar(loadLocalAvatar());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bound = !!osuProfile;
  const displayName = bound ? osuProfile!.username : (localUsername || t("profile.customPlayer"));
  const avatarSrc = bound ? osuProfile!.avatarUrl : localAvatar;
  const coverSrc = bound ? osuProfile!.coverUrl : "";

  const stats = useMemo(() => {
    const passed = scores.filter((s) => s.passed && s.pp > 0);
    const totalPP = calculateWeightedTotalPP(passed.map((s) => s.pp));
    const playCount = scores.length;
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const maxCombo = scores.reduce((m, s) => Math.max(m, s.maxCombo), 0);
    const accs = scores.map((s) => officialAccuracy(s.counts));
    const avgAcc = accs.length > 0 ? accs.reduce((a, b) => a + b, 0) / accs.length : 0;

    const gradeDist: Record<Grade, number> = {
      SS: 0, SSH: 0, S: 0, SH: 0, A: 0, B: 0, C: 0, D: 0, F: 0,
    };
    for (const s of scores) {
      gradeDist[s.grade] = (gradeDist[s.grade] || 0) + 1;
    }
    return { totalPP, playCount, totalScore, maxCombo, avgAcc, gradeDist };
  }, [scores]);

  const rankedScores = useMemo(() => {
    return scores.filter((s) => s.passed && s.pp > 0).sort((a, b) => b.pp - a.pp);
  }, [scores]);

  const rankedIndex = useMemo(() => {
    const map = new Map<string, number>();
    rankedScores.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [rankedScores]);

  const recentScores = useMemo(() => {
    return [...scores].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  }, [scores]);

  const handleImport = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const profile = await fetchOsuUser(apiKey, osuUsername);
      saveOsuProfile(profile);
      setOsuProfile(profile);
      updateSetting("osuApiKey", apiKey.trim());
      updateSetting("osuUsername", osuUsername.trim());
      setImportMsg({ ok: true, text: t("profile.importSuccess") });
    } catch (e) {
      setImportMsg({
        ok: false,
        text: e instanceof Error ? e.message : t("profile.importFail"),
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDisconnect = () => {
    clearOsuProfile();
    setOsuProfile(null);
    setImportMsg(null);
  };

  const handleAvatarPick = () => {
    if (bound) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      saveLocalAvatar(dataUrl);
      setLocalAvatar(dataUrl);
    } catch {
      // 静默失败
    } finally {
      // 清空 input 以便重复选择同一文件
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }, []);

  const handleAvatarRemove = () => {
    clearLocalAvatar();
    setLocalAvatar("");
  };

  const startEditName = () => {
    if (bound) return;
    setNameDraft(localUsername);
    setEditingName(true);
  };

  const commitName = () => {
    const trimmed = nameDraft.trim();
    saveLocalUsername(trimmed);
    setLocalUsername(trimmed);
    setEditingName(false);
  };

  const cancelEditName = () => {
    setEditingName(false);
  };

  return (
    <div className="page-shell">
      {/* 顶部 Banner：背景 cover + 头像 + 用户名 + 绑定状态 + 总 pp */}
      <section
        className="animate-enter animate-enter-1"
        style={{
          marginBottom: 20,
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          background: "var(--glass-bg)",
        }}
      >
        {/* 背景 cover */}
        <div style={{ position: "relative", height: "clamp(180px, 26vw, 260px)" }}>
          {coverSrc ? (
            <BeatmapCover
              src={coverSrc}
              alt={displayName}
              placeholderSize={64}
              imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, var(--accent) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.6) 100%)",
              }}
            />
          )}
          {/* 渐变遮罩，让下方文字可读 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.75) 100%)",
              pointerEvents: "none",
            }}
          />

          {/* 头像 + 用户名 + 状态 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "0 18px 16px",
              display: "flex",
              alignItems: "flex-end",
              gap: 14,
            }}
          >
            {/* 头像 */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={handleAvatarPick}
                disabled={bound}
                aria-label={t("profile.changeAvatar")}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.9)",
                  padding: 0,
                  overflow: "hidden",
                  cursor: bound ? "default" : "pointer",
                  background: "var(--surface-elevated)",
                  display: "block",
                  position: "relative",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      // 官方头像加载失败时隐藏，露出背景
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                    }}
                  >
                    <User size={36} />
                  </div>
                )}
              </button>
              {/* 悬浮相机提示（未绑定时） */}
              {!bound && (
                <div
                  style={{
                    position: "absolute",
                    right: -2,
                    bottom: -2,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--bg)",
                    pointerEvents: "none",
                  }}
                >
                  <Camera size={14} />
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
            </div>

            {/* 用户名 + 状态 */}
            <div style={{ flex: "1 1 auto", minWidth: 0, paddingBottom: 4 }}>
              {editingName && !bound ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="text"
                    value={nameDraft}
                    autoFocus
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitName();
                      if (e.key === "Escape") cancelEditName();
                    }}
                    placeholder={t("profile.usernamePlaceholder")}
                    maxLength={32}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 700,
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid var(--glass-border)",
                      color: "#fff",
                      outline: "none",
                      maxWidth: 220,
                    }}
                  />
                  <button
                    onClick={commitName}
                    aria-label={t("profile.save")}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: "none",
                      background: "var(--accent)", color: "#fff", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={cancelEditName}
                    aria-label={t("profile.cancel")}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: "none",
                      background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h1
                    className="font-torus"
                    style={{
                      fontSize: "clamp(18px, 4vw, 24px)",
                      fontWeight: 800,
                      color: "#fff",
                      letterSpacing: "-0.02em",
                      margin: 0,
                      textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {displayName}
                  </h1>
                  {!bound && (
                    <button
                      onClick={startEditName}
                      aria-label={t("profile.editUsername")}
                      style={{
                        width: 28, height: 28, borderRadius: 8, border: "none",
                        background: "rgba(255,255,255,0.18)", color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                        flexShrink: 0,
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* 状态徽章 + 官方排名 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    background: bound ? "var(--accent-soft)" : "rgba(255,255,255,0.18)",
                    color: bound ? "var(--accent)" : "#fff",
                    border: `1px solid ${bound ? "var(--accent)" : "rgba(255,255,255,0.3)"}`,
                  }}
                >
                  {bound ? <Trophy size={11} /> : <User size={11} />}
                  {bound ? t("profile.bound") : t("profile.customPlayer")}
                </span>
                {bound && osuProfile!.globalRank > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    <Globe size={11} />
                    <span className="hud-num">#{formatNumber(osuProfile!.globalRank)}</span>
                  </span>
                )}
                {bound && osuProfile!.country && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    <MapPin size={11} />
                    {osuProfile!.country}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 总 pp + 统计 */}
        <div style={{ padding: "18px 18px 20px" }}>
          {/* 总 pp 居中大字 */}
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div
              className="hud-num font-torus"
              style={{
                fontSize: "clamp(36px, 8vw, 52px)",
                fontWeight: 900,
                color: "var(--accent)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {stats.totalPP.toFixed(0)}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
              {t("profile.totalPP")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t("profile.playCount")} value={formatNumber(stats.playCount)} />
            <StatCard label={t("profile.totalScore")} value={formatNumber(stats.totalScore)} />
            <StatCard label={t("profile.maxCombo")} value={formatNumber(stats.maxCombo)} />
            <StatCard label={t("profile.avgAccuracy")} value={`${stats.avgAcc.toFixed(2)}%`} />
          </div>

          {/* 未绑定时：头像操作提示 */}
          {!bound && localAvatar && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
              <button
                onClick={handleAvatarRemove}
                className="hud-btn"
                style={{
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {t("profile.removeAvatar")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* osu! 官方账号（可折叠） */}
      <section
        style={{
          marginBottom: 20,
          borderRadius: "var(--radius-lg)",
          background: "var(--glass-bg)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid var(--glass-border)",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setAccountOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-primary)",
          }}
        >
          <Trophy size={18} style={{ color: "var(--accent)" }} />
          <h2
            className="font-torus"
            style={{ fontSize: 15, fontWeight: 700, margin: 0, flex: 1, textAlign: "left" }}
          >
            {t("profile.osuAccount")}
          </h2>
          {bound && (
            <span className="hud-num" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
              {osuProfile!.pp.toFixed(0)}pp
            </span>
          )}
          {accountOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {accountOpen && (
          <div style={{ padding: "0 20px 20px" }}>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 14px" }}>
              {t("profile.osuAccountDesc")}
            </p>

            {bound ? (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard label={t("profile.officialPP")} value={osuProfile!.pp.toFixed(0)} accent />
                  <StatCard
                    label={t("profile.globalRank")}
                    value={`#${formatNumber(osuProfile!.globalRank)}`}
                  />
                  <StatCard
                    label={t("profile.countryRank")}
                    value={`#${formatNumber(osuProfile!.countryRank)}`}
                    sub={osuProfile!.country}
                  />
                  <StatCard
                    label={t("profile.level")}
                    value={`${Math.floor(osuProfile!.level)}`}
                    sub={`${(osuProfile!.levelProgress * 100).toFixed(0)}%`}
                  />
                  <StatCard label={t("profile.accuracy")} value={`${osuProfile!.accuracy.toFixed(2)}%`} />
                  <StatCard label={t("profile.playCount")} value={formatNumber(osuProfile!.playCount)} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="hud-btn"
                    style={{
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
                      background: "var(--accent)",
                    }}
                  >
                    <RefreshCw size={13} style={{ marginRight: 5, display: "inline" }} />
                    {importing ? t("profile.importing") : t("profile.import")}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="hud-btn"
                    style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}
                  >
                    <Unlink size={13} style={{ marginRight: 5, display: "inline" }} />
                    {t("profile.disconnect")}
                  </button>
                </div>
                {importMsg && (
                  <p style={{ marginTop: 10, fontSize: 12, color: importMsg.ok ? "var(--accent)" : "#ff375f" }}>
                    {importMsg.text}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t("profile.apiKey")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                  <input
                    type="text"
                    value={osuUsername}
                    onChange={(e) => setOsuUsername(e.target.value)}
                    placeholder={t("profile.username")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing || !apiKey.trim() || !osuUsername.trim()}
                  className="hud-btn"
                  style={{
                    marginTop: 12,
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    background: "var(--accent)",
                    opacity: importing || !apiKey.trim() || !osuUsername.trim() ? 0.5 : 1,
                  }}
                >
                  {importing ? t("profile.importing") : t("profile.import")}
                </button>
                {importMsg && (
                  <p style={{ marginTop: 10, fontSize: 12, color: importMsg.ok ? "var(--accent)" : "#ff375f" }}>
                    {importMsg.text}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 评级分布 */}
      {scores.length > 0 && (
        <section
          style={{
            marginBottom: 20,
            padding: 20,
            borderRadius: "var(--radius-lg)",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <h2
            className="font-torus"
            style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}
          >
            {t("profile.gradeDistribution")}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GRADE_ORDER.filter((g) => stats.gradeDist[g] > 0).map((g) => (
              <div
                key={g}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: `${GRADE_COLOR[g]}1a`,
                  border: `1px solid ${GRADE_COLOR[g]}55`,
                }}
              >
                <span
                  className="hud-num"
                  style={{ fontSize: 16, fontWeight: 900, color: GRADE_COLOR[g], minWidth: 26 }}
                >
                  {g}
                </span>
                <span
                  className="hud-num"
                  style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}
                >
                  {stats.gradeDist[g]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 游玩记录 */}
      <section
        style={{
          padding: 20,
          borderRadius: "var(--radius-lg)",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <h2
          className="font-torus"
          style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}
        >
          {t("profile.recentScores")}
        </h2>

        {recentScores.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ marginBottom: 16, opacity: 0.5 }}>
              <OsuLogoIcon size={56} color="var(--text-secondary)" />
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              {t("profile.empty")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
              {t("profile.emptyHint")}
            </div>
            <button
              onClick={() => navigate("/search")}
              className="hud-btn"
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                background: "var(--accent)",
              }}
            >
              <SearchIcon size={14} style={{ marginRight: 6, display: "inline" }} />
              {t("nav.search")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentScores.map((s) => {
              const rankIdx = rankedIndex.get(s.id);
              const weighted = rankIdx !== undefined ? ppContribution(s.pp, rankIdx) : 0;
              return (
                <ScoreRow
                  key={s.id}
                  score={s}
                  weighted={weighted}
                  rankIdx={rankIdx ?? -1}
                  onClick={() => navigate(`/set/${s.setId}`)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
