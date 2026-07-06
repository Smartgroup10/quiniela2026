import { useEffect, useState, useMemo } from 'react';
import { Spin } from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTournamentStore } from '../stores/tournamentStore';
import { dashboardApi, type DashboardData, type LeaderboardEntry } from '../api/dashboard';
import TeamFlag from '../components/TeamFlag';
import PredictionsToggle from '../components/PredictionsToggle';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

/* ────────────────── Palette (CSS vars shorthand) ────────────────── */
const V = {
  bg0: 'var(--bg-0)', bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)', line2: 'var(--line-2)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  goldSoft: 'var(--gold-soft)', goldLine: 'var(--gold-line)',
  green: 'var(--green)', greenSoft: 'var(--green-soft)', greenLine: 'var(--green-line)',
  amber: 'var(--amber)', amberSoft: 'var(--amber-soft)', amberLine: 'var(--amber-line)',
  blue: 'var(--blue)', blueSoft: 'var(--blue-soft)', blueLine: 'var(--blue-line)',
  red: 'var(--red)',
};

const STATUS_LABELS: Record<string, { text: string; phase: string }> = {
  SETUP: { text: 'Configurando', phase: 'Configuración' },
  PHASE1_OPEN: { text: 'Abierta', phase: 'Fase de Grupos' },
  PHASE1_CLOSED: { text: 'Cerrada', phase: 'Fase de Grupos' },
  PHASE2_OPEN: { text: 'Abierta', phase: 'Eliminatorias' },
  PHASE2_CLOSED: { text: 'Cerrada', phase: 'Eliminatorias' },
  FINISHED: { text: 'Finalizado', phase: 'Torneo Finalizado' },
};

const PHASE_STAGES = ['GRUPOS', '16VOS', '8VOS', 'SEMIS', 'FINAL'];

const POINT_CATEGORIES = [
  { key: 'matchPoints', label: 'Partidos', color: V.gold },
  { key: 'groupPoints', label: 'Posiciones de grupo', color: V.blue },
  { key: 'bestThirdPoints', label: 'Mejores Terceros', color: V.green },
  { key: 'bonusPhase1Points', label: 'Bonus Fase 1', color: V.amber },
  { key: 'knockoutPoints', label: 'Eliminatorias', color: V.green },
  { key: 'bonusPhase2Points', label: 'Bonus Fase 2', color: V.blue },
];

/* ────────────────── Avatar gradient helpers ────────────────── */
const AV_COLORS = [
  ['#D4A93C', '#8A7230'],
  ['#7BA7E8', '#4A6B9D'],
  ['#5DBF8A', '#3A7A5A'],
  ['#B07ADB', '#6A4A8A'],
  ['#E26A5E', '#9A4A42'],
];

function avatarGradient(name: string) {
  const idx = name.charCodeAt(0) % AV_COLORS.length;
  return `linear-gradient(135deg, ${AV_COLORS[idx][0]}, ${AV_COLORS[idx][1]})`;
}

/* ────────────────── Countdown hook ────────────────── */
function useCountdown(targetDate: string | null | undefined) {
  const [cd, setCd] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      if (diff === 0) { setClosed(true); return; }
      setCd({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return { ...cd, closed };
}

/* ────────────────── Phase tracker ────────────────── */
function getActivePhaseIndex(status: string | undefined): number {
  if (!status) return 0;
  if (status.startsWith('PHASE1')) return 0;
  if (status === 'PHASE2_OPEN' || status === 'PHASE2_CLOSED') return 2;
  if (status === 'FINISHED') return 4;
  return 0;
}

/* ================================================================ */
/*                         DASHBOARD                                */
/* ================================================================ */

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { isMobile } = useBreakpoint();
  const { setTournament } = useTournamentStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = () => {
      dashboardApi.get().then((res) => {
        if (cancelled) return;
        setData(res.data);
        if (res.data.tournament && res.data.scoringConfig) {
          setTournament(res.data.tournament, res.data.scoringConfig);
        }
        setLoading(false);
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
    };

    fetchData();
    const interval = setInterval(fetchData, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const t = data?.tournament;
  const closeTarget = t?.status === 'PHASE1_OPEN' ? t.phase1ClosesAt
    : t?.phase2ClosesAt ?? null;
  const cd = useCountdown(closeTarget);

  const statusInfo = STATUS_LABELS[t?.status ?? 'SETUP'] ?? STATUS_LABELS.SETUP;
  const activePhase = getActivePhaseIndex(t?.status);
  const isPhase1Open = t?.status === 'PHASE1_OPEN';
  const alerts = data?.alerts;
  const showAlerts = isPhase1Open && alerts && (alerts.missingPredictions > 0 || alerts.missingSpecials);

  const predPct = useMemo(() => {
    if (!data) return 0;
    const { matchPredictions, totalGroupMatches } = data.predictionProgress;
    return totalGroupMatches > 0 ? Math.round((matchPredictions / totalGroupMatches) * 100) : 0;
  }, [data]);

  if (loading || !data) {
    return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;
  }

  return (
    <div>
      {/* ============ PAGE HEADER ============ */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 24,
      }}>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: V.fg2, fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: V.green,
              boxShadow: `0 0 0 4px ${V.greenSoft}`,
              animation: 'pulse 2s infinite',
            }} />
            Torneo en curso · Mundial 2026
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em',
            color: V.fg0, margin: 0,
          }}>
            Hola de nuevo, <strong style={{ color: V.gold2, fontWeight: 700 }}>{user?.alias || user?.name}</strong>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/phase1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', borderRadius: 10,
            fontWeight: 600, fontSize: 13,
            background: V.gold, color: '#0a0d14',
            boxShadow: '0 6px 16px -6px rgba(212,169,60,0.6)',
            textDecoration: 'none',
            transition: 'transform 0.1s, background 0.15s',
          }}>
            + Hacer predicciones
          </Link>
        </div>
      </div>

      {/* ============ ALERTS ============ */}
      {showAlerts && (
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24,
        }}>
          {alerts!.missingPredictions > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 16px', borderRadius: 12,
              background: V.amberSoft, border: `1px solid ${V.amberLine}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: V.amberSoft, color: V.amber,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <WarningOutlined style={{ fontSize: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: V.amber, marginBottom: 6 }}>
                  Predicciones pendientes
                </div>
                <div style={{ fontSize: 13, color: V.fg1, lineHeight: 1.45 }}>
                  Te faltan <b style={{ color: V.fg0 }}>{alerts!.missingPredictions} partidos</b> por predecir
                  {alerts!.incompleteGroups.length > 0 && ` en ${alerts!.incompleteGroups.length} grupos`}.
                </div>
                {alerts!.incompleteGroups.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {alerts!.incompleteGroups.map((g) => (
                      <span key={g.group} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 6,
                        background: V.bg1, border: `1px solid ${V.amberLine}`,
                        color: V.amber, fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {g.group} <span style={{ color: V.fg2, fontWeight: 500 }}>{g.missing}</span>
                      </span>
                    ))}
                  </div>
                )}
                <Link to="/phase1" style={{
                  color: V.amber, fontWeight: 600, textDecoration: 'none',
                  fontSize: 12, display: 'inline-flex', alignItems: 'center',
                  gap: 4, marginTop: 8, opacity: 0.9,
                }}>
                  Completar predicciones →
                </Link>
              </div>
            </div>
          )}
          {alerts!.missingSpecials && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 16px', borderRadius: 12,
              background: V.blueSoft, border: `1px solid ${V.blueLine}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: V.blueSoft, color: V.blue,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <InfoCircleOutlined style={{ fontSize: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: V.blue, marginBottom: 6 }}>
                  Predicciones especiales
                </div>
                <div style={{ fontSize: 13, color: V.fg1, lineHeight: 1.45 }}>
                  Falta tu pronóstico de <b style={{ color: V.fg0 }}>campeón, goleador y MVP</b> del torneo.
                </div>
                <Link to="/phase1" style={{
                  color: V.blue, fontWeight: 600, textDecoration: 'none',
                  fontSize: 12, display: 'inline-flex', alignItems: 'center',
                  gap: 4, marginTop: 8, opacity: 0.9,
                }}>
                  Ir a Fase 1 →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ KPI CARDS ============ */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr 1fr', gap: 14, marginBottom: 24,
      }}>
        {/* Card: Tournament status */}
        <div style={{
          background: `
            radial-gradient(circle at 100% 0%, ${V.goldSoft} 0%, transparent 50%),
            linear-gradient(180deg, ${V.bg1} 0%, ${V.bg2} 100%)
          `,
          border: `1px solid ${V.line}`, borderRadius: 16, padding: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <CardLabel icon={<TrophyOutlined />} text="Estado del torneo" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 52, height: 52,
              background: V.goldSoft, border: `1px solid ${V.goldLine}`,
              borderRadius: 14, display: 'grid', placeItems: 'center',
              color: V.gold2, flexShrink: 0,
            }}>
              <TrophyOutlined style={{ fontSize: 22 }} />
            </div>
            <div>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 22, lineHeight: 1.15, marginBottom: 4,
                fontWeight: 600, color: V.fg0, margin: 0,
              }}>{statusInfo.phase}</h2>
              <div style={{ fontSize: 12, color: V.fg2 }}>
                12 grupos · 72 partidos · 48 selecciones
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 999,
                  background: V.greenSoft, border: `1px solid ${V.greenLine}`,
                  color: V.green, fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.green }} />
                  {statusInfo.text}
                </span>
              </div>
            </div>
          </div>
          {/* Phase tracker */}
          <div style={{ display: 'flex', gap: 4 }}>
            {PHASE_STAGES.map((_, i) => (
              <span key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i <= activePhase ? V.gold : V.bg3,
              }} />
            ))}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 8,
            fontSize: 10, color: V.fg3,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
          }}>
            {PHASE_STAGES.map((s) => <span key={s}>{s}</span>)}
          </div>
        </div>

        {/* Card: Countdown */}
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`,
          borderRadius: 16, padding: 20,
        }}>
          <CardLabel icon={<ClockCircleOutlined />} text="Cierra en" />
          {cd.closed ? (
            <div style={{ fontSize: 28, fontWeight: 700, color: V.fg0, fontFamily: "'JetBrains Mono', monospace" }}>
              Cerrado
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { val: cd.days, lbl: 'Días' },
                { val: cd.hours, lbl: 'Horas' },
                { val: cd.minutes, lbl: 'Min' },
                { val: cd.seconds, lbl: 'Seg' },
              ].map((c) => (
                <div key={c.lbl} style={{
                  background: V.bg2, border: `1px solid ${V.line}`,
                  borderRadius: 10, padding: '10px 6px', textAlign: 'center',
                }}>
                  <span className="mono" style={{
                    display: 'block', fontWeight: 700, fontSize: 26,
                    lineHeight: 1, color: V.fg0, letterSpacing: '-0.02em',
                  }}>
                    {String(c.val).padStart(2, '0')}
                  </span>
                  <span style={{
                    display: 'block', marginTop: 6, fontSize: 9, color: V.fg2,
                    textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
                  }}>{c.lbl}</span>
                </div>
              ))}
            </div>
          )}
          {closeTarget && (
            <div style={{
              marginTop: 12, fontSize: 11, color: V.fg2,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📅 Cierre el {formatInTimeZone(new Date(closeTarget), 'Europe/Madrid', 'dd MMM · HH:mm', { locale: es })} (hora española)
            </div>
          )}
        </div>

        {/* Card: My position */}
        <div style={{
          background: `
            radial-gradient(circle at 100% 100%, ${V.goldSoft} 0%, transparent 60%),
            ${V.bg1}
          `,
          border: `1px solid ${V.line}`, borderRadius: 16, padding: 20,
          display: 'flex', flexDirection: 'column',
        }}>
          <CardLabel icon={<TrophyOutlined />} text="Mi posición" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
              fontSize: 56, lineHeight: 0.9, color: V.gold2, letterSpacing: '-0.04em',
            }}>
              #{data.userRank > 0 ? data.userRank : '-'}
            </span>
            <span className="mono" style={{ fontSize: 14, color: V.fg2 }}>
              de {data.totalPlayers} jugadores
            </span>
          </div>
          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: `1px dashed ${V.line2}`,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: V.fg2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Puntos
            </span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: V.fg0 }}>
              {data.currentUser?.totalPoints || 0}{' '}
              <span style={{ color: V.fg3, fontWeight: 500, fontSize: 12 }}>pts</span>
            </span>
          </div>
        </div>
      </div>

      {/* ============ BOTTOM GRID ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr', gap: 14 }}>
        {/* Ranking */}
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`,
          borderRadius: 16, padding: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 4,
          }}>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 16,
              display: 'flex', alignItems: 'center', gap: 8,
              fontWeight: 600, color: V.fg0, margin: 0,
            }}>
              <TrophyOutlined /> Top 5 del ranking
            </h3>
            <Link to="/leaderboard" style={{
              color: V.fg2, fontSize: 12, fontWeight: 600, textDecoration: 'none',
            }}>Ver todo →</Link>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.miniLeaderboard.map((entry, index) => (
              <RankRow
                key={entry.id}
                entry={entry}
                rank={index + 1}
                isMe={entry.id === user?.id}
              />
            ))}
            {/* If user not in top 5 */}
            {!data.userInTop5 && data.currentUser && (
              <>
                <div style={{ textAlign: 'center', color: V.fg3, padding: '4px 0', fontSize: 12 }}>···</div>
                <RankRow
                  entry={data.currentUser}
                  rank={data.userRank}
                  isMe
                />
              </>
            )}
          </div>
        </div>

        {/* My Progress */}
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`,
          borderRadius: 16, padding: 20,
        }}>
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16, marginBottom: 18, fontWeight: 600, color: V.fg0, margin: '0 0 18px',
          }}>Mi progreso</h3>

          {/* Match predictions progress */}
          <ProgressItem
            label="Partidos predichos"
            current={data.predictionProgress.matchPredictions}
            total={data.predictionProgress.totalGroupMatches}
            pct={predPct}
          />

          {/* Specials progress */}
          <ProgressItem
            label="Predicciones especiales"
            current={alerts?.missingSpecials ? 0 : 4}
            total={4}
            pct={alerts?.missingSpecials ? 0 : 100}
            style={{ marginTop: 14 }}
          />

          {/* Breakdown */}
          <div style={{
            fontSize: 11, color: V.fg2, textTransform: 'uppercase',
            letterSpacing: '0.08em', fontWeight: 600,
            margin: '18px 0 10px', paddingTop: 16,
            borderTop: `1px solid ${V.line}`,
          }}>
            Desglose de puntos
          </div>
          {POINT_CATEGORIES.map((cat) => {
            const pts = (data.currentUser as any)?.[cat.key] || 0;
            return (
              <div key={cat.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', fontSize: 13,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: V.fg1 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                  {cat.label}
                </div>
                <span className="mono" style={{
                  fontWeight: 600, fontSize: 13,
                  color: pts > 0 ? V.fg0 : V.fg3,
                }}>
                  {pts} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ UPCOMING FIXTURES ============ */}
      {data.upcomingMatches.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 16, fontWeight: 600, color: V.fg0, margin: 0,
            }}>Próximos partidos</h3>
            <Link to="/phase1" style={{
              color: V.fg2, fontSize: 12, fontWeight: 600, textDecoration: 'none',
            }}>Ver todos →</Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(data.upcomingMatches.length, 3)}, 1fr)`,
            gap: 12,
          }}>
            {data.upcomingMatches.slice(0, 3).map((match) => (
              <div key={match.id} style={{
                background: V.bg1, border: `1px solid ${V.line}`,
                borderRadius: 12, padding: '14px 16px',
                cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s',
              }}>
                {/* Top: group + date */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 10, color: V.fg2,
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginBottom: 12,
                }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4,
                    background: V.bg3, color: V.fg1, fontWeight: 600,
                  }}>
                    {match.stage}
                  </span>
                  <span>{formatInTimeZone(new Date(match.kickoffAt), 'Europe/Madrid', 'dd MMM · HH:mm', { locale: es })}</span>
                </div>
                {/* Matchup */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, flex: 1 }}>
                    {match.homeTeam && <TeamFlag code={match.homeTeam.code} size={24} />}
                    <span>{match.homeTeam?.name || '?'}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: V.fg3, padding: '0 4px' }}>VS</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, flex: 1, justifyContent: 'flex-end' }}>
                    <span>{match.awayTeam?.name || '?'}</span>
                    {match.awayTeam && <TeamFlag code={match.awayTeam.code} size={24} />}
                  </div>
                </div>

                <PredictionsToggle matchId={match.id} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ RECENT RESULTS ============ */}
      {data.recentResults.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <h3 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 16, fontWeight: 600, color: V.fg0, margin: 0,
            }}>Resultados recientes</h3>
            <Link to="/results" style={{
              color: V.fg2, fontSize: 12, fontWeight: 600, textDecoration: 'none',
            }}>Ver todos →</Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(data.recentResults.length, 3)}, 1fr)`,
            gap: 12,
          }}>
            {data.recentResults.slice(0, 3).map((match) => {
              const pred = match.myPrediction;
              return (
                <div key={match.id} style={{
                  background: V.bg1, border: `1px solid ${V.line}`,
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 10, color: V.fg2,
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: 12,
                  }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4,
                      background: V.bg3, color: V.fg1, fontWeight: 600,
                    }}>{match.stage}</span>
                    <span>{formatInTimeZone(new Date(match.kickoffAt), 'Europe/Madrid', 'dd MMM', { locale: es })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, flex: 1 }}>
                      {match.homeTeam && <TeamFlag code={match.homeTeam.code} size={24} />}
                      <span>{match.homeTeam?.name || '?'}</span>
                    </div>
                    <span className="mono" style={{
                      fontWeight: 700, fontSize: 14, color: V.fg0,
                      background: V.goldSoft, padding: '2px 8px', borderRadius: 6,
                    }}>
                      {match.homeGoals} - {match.awayGoals}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, flex: 1, justifyContent: 'flex-end' }}>
                      <span>{match.awayTeam?.name || '?'}</span>
                      {match.awayTeam && <TeamFlag code={match.awayTeam.code} size={24} />}
                    </div>
                  </div>
                  {/* Prediction */}
                  <div style={{
                    marginTop: 12, paddingTop: 10,
                    borderTop: `1px dashed ${V.line}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 11,
                  }}>
                    {pred ? (
                      <>
                        <span className="mono" style={{ color: V.green }}>
                          ✓ {pred.homeGoals}–{pred.awayGoals}
                        </span>
                        <span className="mono" style={{ fontWeight: 700, color: V.fg0 }}>
                          +{pred.pointsEarned} pts
                        </span>
                      </>
                    ) : (
                      <span className="mono" style={{ color: V.amber }}>● Sin pronóstico</span>
                    )}
                  </div>
                  <PredictionsToggle matchId={match.id} compact />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────── Sub-components ────────────────── */

function CardLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
      color: V.fg2, textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 14,
    }}>
      <span style={{ fontSize: 12, opacity: 0.6 }}>{icon}</span>
      {text}
    </div>
  );
}

function RankRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const initial = (entry.alias || entry.name)[0].toUpperCase();
  const medalColors: Record<number, string> = { 1: '#ffd166', 2: '#d6d3c7', 3: '#c98a5b' };
  const posColor = isMe ? V.gold2 : medalColors[rank] ?? V.fg2;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '36px 36px 1fr auto auto',
      alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 10,
      background: isMe ? `linear-gradient(90deg, ${V.goldSoft}, transparent 80%)` : 'transparent',
      border: isMe ? `1px solid ${V.goldLine}` : '1px solid transparent',
      transition: 'background 0.15s',
    }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
        fontSize: 18, color: posColor, textAlign: 'center',
      }}>{rank}</div>
      {entry.avatarUrl ? (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: V.bg2, display: 'grid', placeItems: 'center',
          overflow: 'hidden',
        }}>
          <img src={entry.avatarUrl} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
        </div>
      ) : (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: avatarGradient(initial),
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13, color: 'white',
        }}>{initial}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, color: V.fg0 }}>
        {entry.alias || entry.name}
        {isMe && (
          <span style={{
            background: V.gold, color: '#0a0d14',
            fontSize: 9, padding: '2px 6px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
          }}>Tú</span>
        )}
      </div>
      <div className="mono" style={{ fontSize: 11, color: V.fg2 }}>—</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: V.fg0, textAlign: 'right', minWidth: 48 }}>
        {entry.totalPoints}<span style={{ color: V.fg3, fontWeight: 500, fontSize: 11, marginLeft: 2 }}>pts</span>
      </div>
    </div>
  );
}

function ProgressItem({ label, current, total, pct, style: wrapStyle }: {
  label: string; current: number; total: number; pct: number; style?: React.CSSProperties;
}) {
  return (
    <div style={wrapStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: V.fg1, fontWeight: 500 }}>{label}</span>
        <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: V.fg0 }}>
          {current}<span style={{ color: V.fg3, fontWeight: 500 }}>/{total}</span>
        </span>
      </div>
      <div style={{
        height: 6, background: V.bg3, borderRadius: 3,
        overflow: 'hidden', position: 'relative',
      }}>
        <span style={{
          display: 'block', height: '100%', borderRadius: 3,
          width: `${pct}%`,
          background: pct > 0
            ? `linear-gradient(90deg, ${V.gold}, ${V.gold2})`
            : V.bg3,
          boxShadow: pct > 0 ? `0 0 8px -2px ${V.gold}` : 'none',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}
