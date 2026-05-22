import { useEffect, useState, useMemo } from 'react';
import { Spin } from 'antd';
import { Link } from 'react-router-dom';
import { leaderboardApi, type LeaderboardEntry } from '../api/leaderboard';
import { useAuthStore } from '../stores/authStore';

/* ────────────── Palette shortcuts ────────────── */
const V = {
  bg0: 'var(--bg-0)', bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)', line2: 'var(--line-2)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  goldSoft: 'var(--gold-soft)', goldLine: 'var(--gold-line)',
  green: 'var(--green)', greenSoft: 'var(--green-soft)', greenLine: 'var(--green-line)',
  amber: 'var(--amber)',
  blue: 'var(--blue)',
  red: 'var(--red)',
};

/* ────────────── Avatar gradient helpers ────────────── */
const AV_COLORS = [
  ['#D4A93C', '#8A7230'],  // gold
  ['#7BA7E8', '#4A6B9D'],  // blue
  ['#5DBF8A', '#3A7A5A'],  // green
  ['#B07ADB', '#6A4A8A'],  // purple
  ['#E26A5E', '#9A4A42'],  // red
  ['#6BB8D6', '#4A8AA0'],  // teal
  ['#C4A86A', '#8A7A4A'],  // olive
  ['#D47AAA', '#9A4A7A'],  // pink
  ['#7AB8A0', '#4A8A6A'],  // seafoam
  ['#B09ADA', '#7A6AAA'],  // lavender
];
function avatarGrad(name: string) {
  const idx = name.charCodeAt(0) % AV_COLORS.length;
  return `linear-gradient(135deg, ${AV_COLORS[idx][0]}, ${AV_COLORS[idx][1]})`;
}
function avatarTextColor(name: string) {
  // Gold avatar (#0) gets dark text, rest get white
  return name.charCodeAt(0) % AV_COLORS.length === 0 ? '#0a0d14' : 'white';
}

/* ────────────── Medal colors ────────────── */
const MEDAL_STYLES = {
  1: {
    posColor: '#E5BC4F',
    medalBg: 'radial-gradient(circle at 30% 30%, #E5BC4F, #D4A93C 70%, #8A7230)',
    medalShadow: '0 0 24px rgba(212,169,60,0.5), 0 4px 12px rgba(0,0,0,0.5), 0 0 0 3px var(--bg-1)',
  },
  2: {
    posColor: '#C8C5BC',
    medalBg: 'radial-gradient(circle at 30% 30%, #E0DDD6, #C8C5BC 70%, #8A8880)',
    medalShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 0 3px var(--bg-1)',
  },
  3: {
    posColor: '#C98A5B',
    medalBg: 'radial-gradient(circle at 30% 30%, #D4A070, #C98A5B 70%, #8A6040)',
    medalShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 0 3px var(--bg-1)',
  },
};

/* ================================================================ */
/*                         LEADERBOARD                              */
/* ================================================================ */

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'total' | 'partidos' | 'grupos'>('total');
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    leaderboardApi.get().then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  }, []);

  // Sort based on filter
  const sorted = useMemo(() => {
    const copy = [...data];
    switch (filter) {
      case 'partidos':
        // Sort by matchPoints if we had it, but API doesn't expose it — keep total order
        return copy;
      case 'grupos':
        return copy.sort((a, b) => (b.groupPoints ?? 0) - (a.groupPoints ?? 0));
      default:
        return copy.sort((a, b) => b.totalPoints - a.totalPoints);
    }
  }, [data, filter]);

  const podium = sorted.slice(0, 3);
  const myRank = sorted.findIndex((e) => e.id === currentUserId) + 1;
  const above = myRank > 1 ? sorted[myRank - 2] : null;
  const below = myRank > 0 && myRank < sorted.length ? sorted[myRank] : null;

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  return (
    <div>
      {/* ============ BREADCRUMB ============ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
        color: V.fg2, textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 12,
      }}>
        <Link to="/" style={{ color: V.fg2, textDecoration: 'none' }}>Inicio</Link>
        <span style={{ color: V.fg3 }}>›</span>
        <span style={{ color: V.fg0 }}>Ranking</span>
      </div>

      {/* ============ PAGE HEADER ============ */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20, marginBottom: 28,
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', gap: 14,
            color: V.fg0, margin: 0,
          }}>
            <span style={{
              width: 44, height: 44, borderRadius: 12,
              background: V.goldSoft, border: `1px solid ${V.goldLine}`,
              display: 'grid', placeItems: 'center', color: V.gold2,
              fontSize: 22,
            }}>👑</span>
            Ranking
          </h1>
          <p style={{ color: V.fg2, margin: '6px 0 0', fontSize: 14 }}>
            Clasificación del torneo. Quien acierta más, gana.
          </p>
        </div>
        {/* Filter chips */}
        <div style={{
          display: 'flex', gap: 6,
          background: V.bg1, border: `1px solid ${V.line}`,
          borderRadius: 10, padding: 4,
        }}>
          {[
            { key: 'total' as const, label: 'Total' },
            { key: 'partidos' as const, label: 'Partidos' },
            { key: 'grupos' as const, label: 'Grupos' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? V.bg3 : 'transparent',
                border: 'none',
                color: filter === f.key ? V.gold2 : V.fg1,
                padding: '8px 14px', borderRadius: 7,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* ============ STADIUM PODIUM ============ */}
      {podium.length >= 3 && (
        <section style={{
          position: 'relative',
          background: `
            radial-gradient(ellipse 80% 100% at 50% 0%, rgba(212,169,60,0.08) 0%, transparent 60%),
            linear-gradient(180deg, ${V.bg1} 0%, ${V.bg2} 100%)
          `,
          border: `1px solid ${V.line}`, borderRadius: 24,
          padding: '40px 32px 36px', marginBottom: 28, overflow: 'hidden',
        }}>
          {/* Pitch lines pattern */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 90%)',
          }} />

          {/* Stage header */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              fontSize: 11, color: V.gold2,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.18em',
              fontWeight: 600, marginBottom: 8,
            }}>
              <span style={{ color: V.gold, fontSize: 13 }}>★</span>
              Podio del torneo
              <span style={{ color: V.gold, fontSize: 13 }}>★</span>
            </div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 24, color: V.fg0, marginBottom: 4, fontWeight: 600,
            }}>Estos son los que mandan</h2>
            <p style={{ fontSize: 13, color: V.fg2, margin: 0 }}>
              Actualizado tras cada jornada · {sorted.length} jugadores compitiendo
            </p>
          </div>

          {/* Podium: 2nd - 1st - 3rd */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr',
            gap: 18, alignItems: 'end',
            position: 'relative', zIndex: 2,
            maxWidth: 800, margin: '0 auto',
          }}>
            {[podium[1], podium[0], podium[2]].map((entry, displayIdx) => {
              const place = displayIdx === 1 ? 1 : displayIdx === 0 ? 2 : 3;
              const medal = MEDAL_STYLES[place as 1 | 2 | 3];
              const isFirst = place === 1;
              const isMe = entry.id === currentUserId;
              const initial = (entry.alias || entry.name)[0].toUpperCase();

              return (
                <div key={entry.id} style={{
                  background: isFirst
                    ? `linear-gradient(180deg, ${V.goldSoft} 0%, ${V.bg2} 70%)`
                    : place === 2
                      ? `linear-gradient(180deg, rgba(200,197,188,0.12), ${V.bg2})`
                      : `linear-gradient(180deg, rgba(201,138,91,0.14), ${V.bg2})`,
                  border: `1px solid ${isFirst ? V.goldLine : place === 2 ? 'rgba(200,197,188,0.30)' : 'rgba(201,138,91,0.32)'}`,
                  borderRadius: 18,
                  padding: isFirst ? '42px 20px 28px' : '28px 18px 22px',
                  textAlign: 'center',
                  position: 'relative',
                  transform: isFirst ? 'translateY(-20px)' : 'none',
                  boxShadow: isFirst ? `0 30px 60px -20px rgba(212,169,60,0.25), 0 0 0 1px ${V.goldLine}` : 'none',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                  {/* Floating crown for 1st */}
                  {isFirst && (
                    <div style={{
                      position: 'absolute', top: -42, left: '50%',
                      transform: 'translateX(-50%)',
                      color: V.gold,
                      filter: 'drop-shadow(0 4px 12px rgba(212,169,60,0.5))',
                      animation: 'float 4s ease-in-out infinite',
                    }}>
                      <svg width="44" height="32" viewBox="0 0 64 48" fill="currentColor">
                        <path d="M8 40h48v6H8zM4 14l14 10L32 6l14 18 14-10-6 22H10z" stroke="#8A7230" strokeWidth="1.5" strokeLinejoin="round" />
                        <circle cx="6" cy="14" r="3" fill="currentColor" />
                        <circle cx="32" cy="6" r="3.5" fill="currentColor" />
                        <circle cx="58" cy="14" r="3" fill="currentColor" />
                      </svg>
                    </div>
                  )}

                  {/* Medal */}
                  {!isFirst && (
                    <div style={{
                      position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                      width: 38, height: 38, borderRadius: '50%',
                      display: 'grid', placeItems: 'center',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700, fontSize: 17, color: '#0a0d14',
                      background: medal.medalBg,
                      boxShadow: medal.medalShadow,
                    }}>{place}</div>
                  )}

                  {/* Avatar */}
                  <div style={{
                    width: isFirst ? 92 : 70, height: isFirst ? 92 : 70,
                    borderRadius: '50%', margin: '8px auto 16px',
                    display: 'grid', placeItems: 'center',
                    fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: isFirst ? 36 : 26,
                    color: entry.avatarUrl ? undefined : avatarTextColor(initial),
                    background: entry.avatarUrl ? V.bg2 : avatarGrad(initial),
                    border: `3px solid ${V.bg1}`,
                    boxShadow: isFirst
                      ? `0 0 0 4px ${V.gold}, 0 0 30px rgba(212,169,60,0.4), 0 10px 30px rgba(0,0,0,0.5)`
                      : 'none',
                    overflow: 'hidden',
                  }}>
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" style={{
                        width: isFirst ? 68 : 52, height: isFirst ? 68 : 52,
                        objectFit: 'contain',
                      }} />
                    ) : initial}
                  </div>

                  {/* Name */}
                  <div style={{
                    fontWeight: 700, fontSize: isFirst ? 19 : 17,
                    color: V.fg0, marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                  }}>
                    {entry.alias || entry.name}
                    {isMe && (
                      <span style={{
                        background: V.gold, color: '#0a0d14',
                        fontSize: 9, padding: '2px 6px', borderRadius: 4,
                        textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
                      }}>Tú</span>
                    )}
                  </div>

                  {/* Points */}
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em',
                    fontSize: isFirst ? 56 : 40,
                    ...(isFirst ? {
                      background: `linear-gradient(180deg, ${V.gold2} 0%, ${V.gold} 100%)`,
                      WebkitBackgroundClip: 'text', backgroundClip: 'text',
                      color: 'transparent',
                    } : {
                      color: medal.posColor,
                    }),
                  }}>
                    {entry.totalPoints}
                    <span style={{
                      fontSize: 13, color: V.fg3, fontWeight: 500,
                      marginLeft: 4, letterSpacing: 0,
                      WebkitTextFillColor: V.fg3,
                    }}>pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ DUEL WIDGET ============ */}
      {myRank > 0 && (above || below) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: above && below ? '1fr 1fr' : '1fr',
          gap: 14, marginBottom: 28,
        }}>
          {/* Above me */}
          {above && (
            <DuelCard
              label={`Tu duelo · #${myRank - 1} te pisa los talones`}
              entry={above}
              rank={myRank - 1}
              gap={data.find(e => e.id === currentUserId)!.totalPoints - above.totalPoints}
              isAbove
            />
          )}
          {/* Below me */}
          {below && (
            <DuelCard
              label={`#${myRank + 1} a tus espaldas`}
              entry={below}
              rank={myRank + 1}
              gap={data.find(e => e.id === currentUserId)!.totalPoints - below.totalPoints}
              isAbove={false}
            />
          )}
        </div>
      )}

      {/* ============ FULL TABLE ============ */}
      <div style={{
        background: V.bg1, border: `1px solid ${V.line}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* Table header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: `1px solid ${V.line}`,
        }}>
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16, display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 600, color: V.fg0, margin: 0,
          }}>
            📊 Clasificación completa
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: V.fg2,
              background: V.bg2, padding: '3px 8px', borderRadius: 4,
              border: `1px solid ${V.line}`,
            }}>{sorted.length} jugadores</span>
          </h3>
        </div>

        {/* Table grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 100px 80px 80px 100px',
        }}>
          {/* Head */}
          {['#', 'Jugador', 'Partidos', 'Grupos', '3os', 'Total'].map((h, i) => (
            <div key={h} style={{
              padding: '12px 14px',
              background: V.bg2,
              fontSize: 10, color: V.fg2,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              borderBottom: `1px solid ${V.line}`,
              textAlign: i === 0 ? 'center' : i === 1 ? 'left' : 'right',
            }}>{h}</div>
          ))}

          {/* Rows */}
          {sorted.map((entry, index) => {
            const rank = index + 1;
            const isMe = entry.id === currentUserId;
            const initial = (entry.alias || entry.name)[0].toUpperCase();
            const medalColor = rank <= 3 ? MEDAL_STYLES[rank as 1 | 2 | 3].posColor : V.fg2;

            const cellBase: React.CSSProperties = {
              padding: '14px',
              borderBottom: `1px solid ${V.line}`,
              color: V.fg1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 500,
              textAlign: 'right',
              transition: 'background 0.15s',
              background: isMe ? `linear-gradient(90deg, ${V.goldSoft}, transparent 70%)` : 'transparent',
            };

            return [
              // Pos
              <div key={`${entry.id}-pos`} style={{ ...cellBase, textAlign: 'center' }}>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700, fontSize: rank <= 3 ? 18 : 16,
                  color: medalColor,
                }}>{rank}</span>
              </div>,
              // Player
              <div key={`${entry.id}-player`} style={{ ...cellBase, textAlign: 'left', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {entry.avatarUrl ? (
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      display: 'grid', placeItems: 'center',
                      background: V.bg2, flexShrink: 0, overflow: 'hidden',
                    }}>
                      <img src={entry.avatarUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      display: 'grid', placeItems: 'center',
                      fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 14, color: avatarTextColor(initial),
                      background: avatarGrad(initial), flexShrink: 0,
                    }}>{initial}</div>
                  )}
                  <div>
                    <div style={{
                      fontWeight: 600, color: V.fg0, fontSize: 14,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {entry.alias || entry.name}
                      {isMe && (
                        <span style={{
                          background: V.gold, color: '#0a0d14',
                          fontSize: 9, padding: '2px 6px', borderRadius: 4,
                          textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
                        }}>Tú</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>,
              // Match points (not in API — show totalPoints - groupPoints - others as proxy, or just show '-')
              <div key={`${entry.id}-match`} style={cellBase}>
                {/* matchPoints not available in leaderboard API — approximate */}
                {entry.totalPoints - (entry.groupPoints ?? 0) - (entry.bestThirdPoints ?? 0) - (entry.bonusPhase1Points ?? 0) - (entry.knockoutPoints ?? 0) - (entry.bonusPhase2Points ?? 0)}
              </div>,
              // Groups
              <div key={`${entry.id}-groups`} style={cellBase}>{entry.groupPoints ?? 0}</div>,
              // Best third
              <div key={`${entry.id}-third`} style={cellBase}>{entry.bestThirdPoints ?? 0}</div>,
              // Total
              <div key={`${entry.id}-total`} style={cellBase}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700, fontSize: 16, color: V.gold2,
                }}>{entry.totalPoints}</span>
              </div>,
            ];
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: `1px solid ${V.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{
            display: 'flex', gap: 14, flexWrap: 'wrap',
            fontSize: 11, color: V.fg2,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.04em',
          }}>
            <span>▲ ▼ Cambio vs última jornada</span>
          </div>
          <div style={{
            fontSize: 11, color: V.fg3,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: V.green, animation: 'pulse 2s infinite',
            }} />
            Actualizado · auto-refresh
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────── Duel Card sub-component ────────────── */

function DuelCard({ label, entry, rank, gap, isAbove }: {
  label: string; entry: LeaderboardEntry; rank: number;
  gap: number; isAbove: boolean;
}) {
  const initial = (entry.alias || entry.name)[0].toUpperCase();
  return (
    <div style={{
      background: isAbove
        ? `radial-gradient(circle at 0% 50%, ${V.goldSoft} 0%, transparent 40%), ${V.bg1}`
        : V.bg1,
      border: `1px solid ${isAbove ? V.goldLine : V.line}`,
      borderRadius: 14, padding: '20px 22px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 11, color: isAbove ? V.gold2 : V.fg2,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontWeight: 600, marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {isAbove ? '▲' : '▼'} {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {entry.avatarUrl ? (
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            background: V.bg2, flexShrink: 0, overflow: 'hidden',
          }}>
            <img src={entry.avatarUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18, color: avatarTextColor(initial),
            background: avatarGrad(initial), flexShrink: 0,
          }}>{initial}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 15, marginBottom: 4, color: V.fg0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {entry.alias || entry.name}
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, color: V.fg3, fontSize: 13,
            }}>#{rank}</span>
          </div>
          <div style={{
            display: 'flex', gap: 10, fontSize: 11, color: V.fg2,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span>{entry.totalPoints} pts</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: 24, lineHeight: 1, letterSpacing: '-0.02em',
            color: isAbove ? V.gold2 : V.fg1,
          }}>
            {gap >= 0 ? '+' : ''}{gap}
          </div>
          <div style={{
            fontSize: 10, color: V.fg3, textTransform: 'uppercase',
            letterSpacing: '0.08em', marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          }}>pts ventaja</div>
        </div>
      </div>
    </div>
  );
}
