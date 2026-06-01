import { useEffect, useState } from 'react';
import { Spin, Divider } from 'antd';
import { Link } from 'react-router-dom';
import { TrophyOutlined } from '@ant-design/icons';
import { resultsApi, type ResultMatch } from '../api/results';
import { teamsApi, type Team } from '../api/teams';
import TeamFlag from '../components/TeamFlag';
import GroupComparison from '../components/GroupComparison';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

/* ────────────────── Palette (CSS vars shorthand) ────────────────── */
const V = {
  bg0: 'var(--bg-0)', bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)', line2: 'var(--line-2)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  goldSoft: 'var(--gold-soft)', goldLine: 'var(--gold-line)',
  green: 'var(--green)', greenSoft: 'var(--green-soft)',
  amber: 'var(--amber)',
};

export default function Results() {
  const [matches, setMatches] = useState<ResultMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      resultsApi.getAll(),
      teamsApi.getAll(),
    ])
      .then(([matchesRes, teamsRes]) => {
        setMatches(matchesRes.data);
        setTeams(teamsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPoints = matches.reduce((sum, m) => sum + (m.myPrediction?.pointsEarned ?? 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: V.fg3, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
        <Link to="/" style={{ color: V.fg2, textDecoration: 'none' }}>Inicio</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span style={{ color: V.fg1 }}>Resultados</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 24, fontWeight: 700, color: V.fg0, margin: 0,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>⚽</span> Resultados
        </h1>
        <div style={{
          background: V.goldSoft, border: `1px solid ${V.goldLine}`,
          borderRadius: 10, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <TrophyOutlined style={{ color: V.gold, fontSize: 16 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: V.gold }}>
            {totalPoints}
          </span>
          <span style={{ fontSize: 12, color: V.fg2 }}>pts totales</span>
        </div>
      </div>

      {/* Match list */}
      {matches.length === 0 ? (
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`, borderRadius: 12,
          padding: 40, textAlign: 'center', color: V.fg2, fontSize: 14,
        }}>
          No hay partidos finalizados aún.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}

      {/* Group predictions comparison */}
      {teams.length > 0 && (
        <>
          <Divider />
          <GroupComparison teams={teams} />
        </>
      )}
    </div>
  );
}

/* ────────────────── MatchCard ────────────────── */

function MatchCard({ match }: { match: ResultMatch }) {
  const pred = match.myPrediction;

  return (
    <div style={{
      background: V.bg1, border: `1px solid ${V.line}`,
      borderRadius: 12, padding: '16px 20px',
    }}>
      {/* Top row: stage + date */}
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
        }}>{match.stage}{match.round ? ` · ${match.round}` : ''}</span>
        <span>{formatInTimeZone(new Date(match.kickoffAt), 'Europe/Madrid', "dd MMM yyyy · HH:mm", { locale: es })}</span>
      </div>

      {/* Teams + Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, flex: 1 }}>
          {match.homeTeam && <TeamFlag code={match.homeTeam.code} size={28} />}
          <span style={{ color: V.fg0 }}>{match.homeTeam?.name || '?'}</span>
        </div>
        <span className="mono" style={{
          fontWeight: 700, fontSize: 16, color: V.fg0,
          background: V.goldSoft, padding: '4px 12px', borderRadius: 6,
          minWidth: 56, textAlign: 'center',
        }}>
          {match.homeGoals} - {match.awayGoals}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, flex: 1, justifyContent: 'flex-end' }}>
          <span style={{ color: V.fg0 }}>{match.awayTeam?.name || '?'}</span>
          {match.awayTeam && <TeamFlag code={match.awayTeam.code} size={28} />}
        </div>
      </div>

      {/* Prediction row */}
      <div style={{
        marginTop: 12, paddingTop: 10,
        borderTop: `1px dashed ${V.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12,
      }}>
        {pred ? (
          <>
            <span className="mono" style={{ color: V.green }}>
              Tu pronóstico: {pred.homeGoals}–{pred.awayGoals}
            </span>
            <span className="mono" style={{
              fontWeight: 700,
              color: pred.pointsEarned > 0 ? V.gold : V.fg3,
            }}>
              +{pred.pointsEarned} pts
            </span>
          </>
        ) : (
          <span className="mono" style={{ color: V.amber }}>● Sin pronóstico</span>
        )}
      </div>
    </div>
  );
}
