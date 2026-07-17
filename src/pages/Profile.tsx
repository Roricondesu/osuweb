import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { useTranslation } from "@/i18n";
import { loadScores } from "@/utils/scoreStorage";
import { loadOsuProfile, saveOsuProfile, clearOsuProfile } from "@/utils/profileStorage";
import { fetchOsuUser, type OsuUserProfile } from "@/utils/osuApi";
import {
  calculateWeightedTotalPP,
  ppContribution,
  GRADE_COLOR,
  officialAccuracy,
  type Grade,
} from "@/utils/ppCalculator";
import { User, Trophy, RefreshCw, Unlink, Search as SearchIcon } from "lucide-react";
import type { ScoreRecord } from "@/types";

const GRADE_ORDER: Grade[] = ["SS", "SSH", "S", "SH", "A", "B", "C", "D", "F"];

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
    <div className="hud-num" style={{ fontSize: 22, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text-primary)", letterSpacing: "-0.01em" }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{sub}</div>}
  </div>
);

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = useGameStore((s) => s.settings);
  const updateSetting = useGameStore((s) => s.updateSetting);

  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [osuProfile, setOsuProfile] = useState<OsuUserProfile | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setScores(loadScores());
    const p = loadOsuProfile();
    setOsuProfile(p);
    setApiKey(settings.osuApiKey ?? "");
    setUsername(settings.osuUsername ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 按 pp 降序的通过成绩（用于计算每条的加权贡献与排名）
  const rankedScores = useMemo(() => {
    return scores
      .filter((s) => s.passed && s.pp > 0)
      .sort((a, b) => b.pp - a.pp);
  }, [scores]);

  const recentScores = useMemo(() => {
    return [...scores].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  }, [scores]);

  const handleImport = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const profile = await fetchOsuUser(apiKey, username);
      saveOsuProfile(profile);
      setOsuProfile(profile);
      updateSetting("osuApiKey", apiKey.trim());
      updateSetting("osuUsername", username.trim());
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

  return (
    <div className="page-shell">
      {/* 标题 */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="font-torus" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
          {t("profile.title")}
        </h1>
      </div>

      {/* 总 pp 大卡 + 官方账号 */}
      <section
        style={{
          marginBottom: 20,
          padding: 24,
          borderRadius: "var(--radius-lg)",
          background: "var(--glass-bg)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--accent-soft)", color: "var(--accent)",
            }}
          >
            <User size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("profile.localStats")}</div>
            <div className="font-torus" style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
              {osuProfile?.username ?? "osu!web 玩家"}
            </div>
          </div>
        </div>

        {/* 本地总 pp */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="hud-num" style={{ fontSize: 48, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {stats.totalPP.toFixed(0)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{t("profile.totalPP")}</div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={t("profile.playCount")} value={formatNumber(stats.playCount)} />
          <StatCard label={t("profile.totalScore")} value={formatNumber(stats.totalScore)} />
          <StatCard label={t("profile.maxCombo")} value={formatNumber(stats.maxCombo)} />
          <StatCard label={t("profile.avgAccuracy")} value={`${stats.avgAcc.toFixed(2)}%`} />
        </div>
      </section>

      {/* osu! 官方账号 */}
      <section
        style={{
          marginBottom: 20,
          padding: 20,
          borderRadius: "var(--radius-lg)",
          background: "var(--glass-bg)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Trophy size={18} style={{ color: "var(--accent)" }} />
          <h2 className="font-torus" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            {t("profile.osuAccount")}
          </h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 14px" }}>
          {t("profile.osuAccountDesc")}
        </p>

        {osuProfile ? (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={t("profile.officialPP")} value={osuProfile.pp.toFixed(0)} accent />
              <StatCard label={t("profile.globalRank")} value={`#${formatNumber(osuProfile.globalRank)}`} />
              <StatCard label={t("profile.countryRank")} value={`#${formatNumber(osuProfile.countryRank)}`} sub={osuProfile.country} />
              <StatCard label={t("profile.level")} value={`${Math.floor(osuProfile.level)}`} sub={`${(osuProfile.levelProgress * 100).toFixed(0)}%`} />
              <StatCard label={t("profile.accuracy")} value={`${osuProfile.accuracy.toFixed(2)}%`} />
              <StatCard label={t("profile.playCount")} value={formatNumber(osuProfile.playCount)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button
                onClick={handleImport}
                disabled={importing}
                className="hud-btn"
                style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--accent)" }}
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
                  padding: "10px 12px", borderRadius: 10, fontSize: 13,
                  background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)", outline: "none",
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("profile.username")}
                style={{
                  padding: "10px 12px", borderRadius: 10, fontSize: 13,
                  background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)", outline: "none",
                }}
              />
            </div>
            <button
              onClick={handleImport}
              disabled={importing || !apiKey.trim() || !username.trim()}
              className="hud-btn"
              style={{
                marginTop: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700,
                color: "#fff", background: "var(--accent)",
                opacity: importing || !apiKey.trim() || !username.trim() ? 0.5 : 1,
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
          <h2 className="font-torus" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
            {t("profile.gradeDistribution")}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GRADE_ORDER.filter((g) => stats.gradeDist[g] > 0).map((g) => (
              <div
                key={g}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 10,
                  background: `${GRADE_COLOR[g]}1a`, border: `1px solid ${GRADE_COLOR[g]}55`,
                }}
              >
                <span className="hud-num" style={{ fontSize: 16, fontWeight: 900, color: GRADE_COLOR[g], minWidth: 26 }}>
                  {g}
                </span>
                <span className="hud-num" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  {stats.gradeDist[g]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 最近成绩 */}
      <section
        style={{
          padding: 20,
          borderRadius: "var(--radius-lg)",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <h2 className="font-torus" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
          {t("profile.recentScores")}
        </h2>

        {recentScores.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              {t("profile.empty")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
              {t("profile.emptyHint")}
            </div>
            <button
              onClick={() => navigate("/search")}
              className="hud-btn"
              style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--accent)" }}
            >
              <SearchIcon size={14} style={{ marginRight: 6, display: "inline" }} />
              {t("nav.search")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentScores.map((s) => {
              const rankIdx = rankedScores.findIndex((r) => r.id === s.id);
              const weighted = rankIdx >= 0 ? ppContribution(s.pp, rankIdx) : 0;
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/set/${s.setId}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--glass-border)",
                    cursor: "pointer", transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                >
                  {/* 评级 */}
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${GRADE_COLOR[s.grade]}22`, border: `1px solid ${GRADE_COLOR[s.grade]}66`,
                    }}
                  >
                    <span className="hud-num" style={{ fontSize: 13, fontWeight: 900, color: GRADE_COLOR[s.grade] }}>
                      {s.grade}
                    </span>
                  </div>

                  {/* 谱面信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.artist} · {s.version}
                    </div>
                  </div>

                  {/* pp */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="hud-num" style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)" }}>
                      {s.pp > 0 ? s.pp.toFixed(0) : "—"}
                    </div>
                    {s.pp > 0 && weighted > 0 && (
                      <div className="hud-num" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                        +{weighted.toFixed(0)} {t("profile.weighted")}
                      </div>
                    )}
                  </div>

                  {/* 准确率 */}
                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 56 }}>
                    <div className="hud-num" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {officialAccuracy(s.counts).toFixed(2)}%
                    </div>
                    <div className="hud-num" style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                      {s.maxCombo}x
                    </div>
                  </div>

                  {/* 时间 */}
                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 44 }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                      {formatDate(s.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
