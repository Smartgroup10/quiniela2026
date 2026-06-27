import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin, message } from 'antd';
import { teamsApi, type Team } from '../api/teams';
import { predictionsApi, type BracketMatchWithPrediction, type BracketPrediction } from '../api/predictions';
import { tournamentApi } from '../api/tournament';
import { useAuthStore } from '../stores/authStore';
import BracketMatchCard from '../components/BracketMatchCard';
import { deriveTeamsForMatch, type BracketMatchInfo, type Round } from '../lib/bracketTopology';

const V = {
  bg0: 'var(--bg-0)', bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  goldSoft: 'var(--gold-soft)', goldLine: 'var(--gold-line)',
};

const ROUND_LABELS: Record<string, string> = {
  R32: '32avos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinales',
  THIRD_PLACE: '3er puesto',
  FINAL: 'Final',
};

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

export default function Phase2() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [bracket, setBracket] = useState<BracketMatchWithPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentStatus, setTournamentStatus] = useState<string>('');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'LEAGUE_ADMIN';

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsRes, bracketRes, tournamentRes] = await Promise.all([
          teamsApi.getAll(),
          predictionsApi.getMyBracket(),
          tournamentApi.get(),
        ]);
        setTeams(teamsRes.data);
        setBracket(bracketRes.data);
        setTournamentStatus(tournamentRes.data.tournament?.status || '');
      } catch (err) {
        console.error(err);
        message.error('Error cargando Fase 2');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  const byRound = useMemo(() => {
    const map: Record<string, BracketMatchWithPrediction[]> = {};
    for (const r of ROUND_ORDER) map[r] = [];
    for (const item of bracket) {
      const r = item.match.round || 'R32';
      (map[r] = map[r] || []).push(item);
    }
    for (const r of Object.keys(map)) map[r].sort((a, b) => a.match.matchNumber - b.match.matchNumber);
    return map;
  }, [bracket]);

  // Para topologia: vista compacta de cada partido (real + mi prediccion)
  const matchesByRoundIndex = useMemo(() => {
    const adapter = (round: Round): BracketMatchInfo[] => {
      const list = byRound[round] || [];
      return list.map((item, idx) => ({
        id: item.match.id,
        round: round,
        index: idx,
        homeTeamId: item.match.homeTeamId ?? null,
        awayTeamId: item.match.awayTeamId ?? null,
        winnerTeamId: item.match.winnerTeamId ?? null,
        myPrediction: item.myPrediction
          ? {
              predictedHomeTeamId: item.myPrediction.predictedHomeTeamId,
              predictedAwayTeamId: item.myPrediction.predictedAwayTeamId,
              winnerTeamId: item.myPrediction.winnerTeamId,
              homeGoals: item.myPrediction.homeGoals,
              awayGoals: item.myPrediction.awayGoals,
              wentToPenalties: item.myPrediction.wentToPenalties,
            }
          : null,
      }));
    };
    return adapter;
  }, [byRound]);

  const totalPoints = useMemo(
    () => bracket.reduce((acc, b) => acc + (b.myPrediction?.pointsEarned ?? 0), 0),
    [bracket],
  );

  const handleSaved = (matchId: string, pred: BracketPrediction) => {
    setBracket((prev) => prev.map((b) => b.match.id === matchId ? { ...b, myPrediction: pred } : b));
  };

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  const isPhase2Open = tournamentStatus === 'PHASE2_OPEN';
  const canEdit = isPhase2Open || isAdmin;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
        color: V.fg2, textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 12,
      }}>
        <Link to="/" style={{ color: V.fg2, textDecoration: 'none' }}>Inicio</Link>
        <span style={{ color: V.fg3 }}>›</span>
        <span style={{ color: V.fg0 }}>Fase 2 - Eliminatorias</span>
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20, marginBottom: 24,
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
            }}>🏆</span>
            Fase 2 — Eliminatorias
          </h1>
          <p style={{ color: V.fg2, margin: '6px 0 0', fontSize: 14 }}>
            32 partidos desde 32avos hasta la final. Predice ganador + marcador + penaltis.
          </p>
          <p style={{ color: V.fg2, margin: '4px 0 0', fontSize: 12, fontStyle: 'italic' }}>
            El marcador exacto se evalúa al final del partido: 90 min si hubo ganador en tiempo regular, o 120 min si fue a prórroga.
          </p>
          <p style={{ color: V.fg2, margin: '4px 0 0', fontSize: 12 }}>
            ← Arrastra o usa la rueda del ratón para ver octavos, cuartos, semifinales y final →
          </p>
        </div>
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`,
          borderRadius: 10, padding: '12px 18px',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
        }}>
          <span style={{ fontSize: 11, color: V.fg2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tus puntos KO
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700, fontSize: 24, color: V.gold2,
          }}>{totalPoints}</span>
        </div>
      </div>

      {!canEdit && (
        <div style={{
          background: 'rgba(212,169,60,0.10)',
          border: `1px solid ${V.goldLine}`,
          borderLeft: `4px solid ${V.gold}`,
          borderRadius: 10, padding: '12px 18px', marginBottom: 24,
          color: V.fg1, fontSize: 13,
        }}>
          La Fase 2 se abrira cuando termine la fase de grupos. Solo el admin puede ver/editar mientras tanto.
        </div>
      )}

      {bracket.length === 0 ? (
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`, borderRadius: 12,
          padding: 40, textAlign: 'center', color: V.fg2,
        }}>
          Aun no se ha generado el bracket de eliminatorias.
          {isAdmin && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              Genera el bracket desde el panel admin (Dashboard → "Generar Bracket Fase 2").
            </div>
          )}
        </div>
      ) : (
        // Layout en columnas: cada ronda una columna
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'visible',
            paddingBottom: 16,
            scrollbarWidth: 'auto',
            cursor: 'grab',
          }}
          onWheel={(e) => {
            // Convierte scroll vertical de rueda en scroll horizontal si
            // hay overflow horizontal. Permite navegar el bracket sin
            // pulsar Shift.
            const el = e.currentTarget;
            if (el.scrollWidth > el.clientWidth && e.deltaY !== 0 && e.deltaX === 0) {
              el.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
        >
          <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
            {ROUND_ORDER.filter(r => (byRound[r] || []).length > 0).map((round) => (
              <div key={round} style={{
                width: 240, flex: '0 0 240px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '8px 12px',
                  background: V.bg1, border: `1px solid ${V.line}`,
                  borderRadius: 8,
                  fontSize: 12, fontWeight: 700, color: V.gold2,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  fontFamily: "'JetBrains Mono', monospace",
                  position: 'sticky', top: 0, zIndex: 1,
                }}>
                  {ROUND_LABELS[round]} ({byRound[round].length})
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 12,
                  // Espaciado proporcional: rondas mas avanzadas tienen mas espacio entre cards
                  justifyContent: 'space-around',
                }}>
                  {byRound[round].map((item, idx) => {
                    // En R32 los equipos vienen del partido real (BD).
                    // En R16+ los derivamos de mis predicciones de la ronda anterior.
                    const derived = round === 'R32'
                      ? { homeTeamId: item.match.homeTeamId ?? null, awayTeamId: item.match.awayTeamId ?? null }
                      : deriveTeamsForMatch(round as Round, idx, matchesByRoundIndex);
                    return (
                      <BracketMatchCard
                        key={item.match.id}
                        data={item}
                        teamMap={teamMap}
                        canEdit={canEdit}
                        derivedHomeTeamId={derived.homeTeamId}
                        derivedAwayTeamId={derived.awayTeamId}
                        onSaved={(p) => handleSaved(item.match.id, p)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
