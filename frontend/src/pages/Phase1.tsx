import { useEffect, useState, useCallback, useMemo } from 'react';
import { Row, Col, Typography, Spin, Alert, Divider } from 'antd';
import GroupMatchCard from '../components/GroupMatchCard';
import BestThirdsTable from '../components/BestThirdsTable';
import SpecialsForm from '../components/SpecialsForm';
import { teamsApi, type Team } from '../api/teams';
import { predictionsApi, type MatchInfo, type MatchPrediction, type SpecialPrediction } from '../api/predictions';
import { useTournamentStore } from '../stores/tournamentStore';
import { tournamentApi } from '../api/tournament';
import { useAuthStore } from '../stores/authStore';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function Phase1() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [matchPredictions, setMatchPredictions] = useState<Map<string, { homeGoals: number; awayGoals: number }>>(new Map());
  const [specials, setSpecials] = useState<SpecialPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const { tournament, setTournament } = useTournamentStore();
  const user = useAuthStore((s) => s.user);

  const loadData = async () => {
    try {
      const [teamsRes, matchesRes, predsRes, specialsRes, tournamentRes] = await Promise.all([
        teamsApi.getAll(),
        predictionsApi.getGroupMatches(),
        predictionsApi.getMyMatchPredictions(),
        predictionsApi.getMySpecials(),
        tournamentApi.get(),
      ]);
      setTeams(teamsRes.data);
      setMatches(matchesRes.data);

      // Build prediction map: matchId -> { homeGoals, awayGoals }
      const predMap = new Map<string, { homeGoals: number; awayGoals: number }>();
      for (const p of predsRes.data) {
        predMap.set(p.matchId, { homeGoals: p.homeGoals, awayGoals: p.awayGoals });
      }
      setMatchPredictions(predMap);

      setSpecials(specialsRes.data);
      setTournament(tournamentRes.data.tournament, tournamentRes.data.scoringConfig);
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleGroupSaved = useCallback((savedPreds: { matchId: string; homeGoals: number; awayGoals: number }[]) => {
    setMatchPredictions(prev => {
      const next = new Map(prev);
      for (const p of savedPreds) {
        next.set(p.matchId, { homeGoals: p.homeGoals, awayGoals: p.awayGoals });
      }
      return next;
    });
  }, []);

  const isPhase1Open = tournament?.status === 'PHASE1_OPEN';
  const disabled = !isPhase1Open || !user?.phase1Available;

  const groupedTeams = useMemo(() => {
    const map: Record<string, Team[]> = {};
    for (const gk of GROUPS) {
      map[gk] = teams.filter((t) => t.groupKey === gk);
    }
    return map;
  }, [teams]);

  const groupedMatches = useMemo(() => {
    const map: Record<string, MatchInfo[]> = {};
    for (const gk of GROUPS) {
      const teamIds = new Set((groupedTeams[gk] || []).map((t) => t.id));
      map[gk] = matches
        .filter((m) => teamIds.has(m.homeTeamId) && teamIds.has(m.awayTeamId))
        .sort((a, b) => a.matchNumber - b.matchNumber);
    }
    return map;
  }, [teams, matches, groupedTeams]);

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  return (
    <div>
      <Typography.Title level={3}>Fase 1 — Pronosticos</Typography.Title>

      {!isPhase1Open && (
        <Alert
          type="warning"
          message="La Fase 1 no esta abierta. Solo puedes ver tus pronosticos."
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {user && !user.phase1Available && (
        <Alert
          type="info"
          message="Inscripcion tardia — Fase 1 no disponible para tu cuenta."
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {/* Match predictions by group */}
      <Typography.Title level={4}>Resultados de Partidos</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Predice el resultado de los 72 partidos de la fase de grupos. Resultado exacto = 3 pts, acertar ganador/empate = 1 pt.
      </Typography.Text>

      <Row gutter={[16, 16]}>
        {GROUPS.map((gk) => (
          <Col xs={24} sm={24} md={12} xl={8} key={gk}>
            <GroupMatchCard
              groupKey={gk}
              teams={groupedTeams[gk]}
              matches={groupedMatches[gk]}
              predictions={matchPredictions}
              disabled={disabled}
              onSaved={handleGroupSaved}
            />
          </Col>
        ))}
      </Row>

      <Divider />

      {/* Best Thirds (derived, read-only) */}
      <BestThirdsTable
        teams={teams}
        matches={matches}
        matchPredictions={matchPredictions}
      />

      <Divider />

      {/* Specials */}
      <SpecialsForm
        teams={teams}
        specials={specials}
        disabled={disabled}
        onSaved={loadData}
      />
    </div>
  );
}
