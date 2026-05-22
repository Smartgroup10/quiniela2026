import { Table, Typography, Tag } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { MatchInfo, MatchPrediction } from '../api/predictions';
import TeamFlag from './TeamFlag';

interface PredictedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
}

interface ThirdTeamInfo {
  groupKey: string;
  team: Team | null;
  points: number;
  goalDifference: number;
  goalsFor: number;
  qualifies: boolean;
  hasData: boolean;
}

interface Props {
  teams: Team[];
  matches: MatchInfo[];
  matchPredictions: Map<string, { homeGoals: number; awayGoals: number }>;
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function computeGroupThird(
  groupTeams: Team[],
  groupMatches: MatchInfo[],
  predictions: Map<string, { homeGoals: number; awayGoals: number }>,
): { team: Team | null; points: number; goalDifference: number; goalsFor: number; complete: boolean } {
  const teamIds = groupTeams.map((t) => t.id);

  // Collect predicted matches for this group
  const preds: PredictedMatch[] = [];
  for (const m of groupMatches) {
    const p = predictions.get(m.id);
    if (p) {
      preds.push({ homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, homeGoals: p.homeGoals, awayGoals: p.awayGoals });
    }
  }

  if (preds.length === 0) return { team: null, points: 0, goalDifference: 0, goalsFor: 0, complete: false };

  // Compute standings with H2H tiebreaker
  const map = new Map<string, { points: number; goalDifference: number; goalsFor: number }>();
  for (const id of teamIds) map.set(id, { points: 0, goalDifference: 0, goalsFor: 0 });

  for (const m of preds) {
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.goalsFor += m.homeGoals;
    away.goalsFor += m.awayGoals;
    home.goalDifference += m.homeGoals - m.awayGoals;
    away.goalDifference += m.awayGoals - m.homeGoals;

    if (m.homeGoals > m.awayGoals) home.points += 3;
    else if (m.homeGoals < m.awayGoals) away.points += 3;
    else { home.points += 1; away.points += 1; }
  }

  const all = [...map.entries()].map(([teamId, stats]) => ({ teamId, ...stats }));
  // Sort by points first
  all.sort((a, b) => b.points - a.points);
  // Apply H2H for tied groups
  const sorted: typeof all = [];
  let si = 0;
  while (si < all.length) {
    let sj = si + 1;
    while (sj < all.length && all[sj].points === all[si].points) sj++;
    const tied = all.slice(si, sj);
    if (tied.length > 1) {
      const tiedIds = new Set(tied.map((t) => t.teamId));
      const h2h = new Map<string, { pts: number; gd: number; gf: number }>();
      for (const id of tiedIds) h2h.set(id, { pts: 0, gd: 0, gf: 0 });
      for (const m of preds) {
        if (!tiedIds.has(m.homeTeamId) || !tiedIds.has(m.awayTeamId)) continue;
        const hm = h2h.get(m.homeTeamId)!, aw = h2h.get(m.awayTeamId)!;
        hm.gf += m.homeGoals; hm.gd += m.homeGoals - m.awayGoals;
        aw.gf += m.awayGoals; aw.gd += m.awayGoals - m.homeGoals;
        if (m.homeGoals > m.awayGoals) hm.pts += 3;
        else if (m.homeGoals < m.awayGoals) aw.pts += 3;
        else { hm.pts += 1; aw.pts += 1; }
      }
      tied.sort((a, b) => {
        const ha = h2h.get(a.teamId)!, hb = h2h.get(b.teamId)!;
        if (hb.pts !== ha.pts) return hb.pts - ha.pts;
        if (hb.gd !== ha.gd) return hb.gd - ha.gd;
        if (hb.gf !== ha.gf) return hb.gf - ha.gf;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
    }
    sorted.push(...tied);
    si = sj;
  }

  const thirdPlace = sorted[2]; // position index 2 = 3rd place
  const team = groupTeams.find((t) => t.id === thirdPlace?.teamId) || null;

  return {
    team,
    points: thirdPlace?.points ?? 0,
    goalDifference: thirdPlace?.goalDifference ?? 0,
    goalsFor: thirdPlace?.goalsFor ?? 0,
    complete: preds.length === 6,
  };
}

export default function BestThirdsTable({ teams, matches, matchPredictions }: Props) {
  const teamsByGroup = new Map<string, Team[]>();
  const matchesByGroup = new Map<string, MatchInfo[]>();

  for (const t of teams) {
    if (!t.groupKey) continue;
    const arr = teamsByGroup.get(t.groupKey) || [];
    arr.push(t);
    teamsByGroup.set(t.groupKey, arr);
  }

  for (const m of matches) {
    const homeTeam = teams.find((t) => t.id === m.homeTeamId);
    if (!homeTeam?.groupKey) continue;
    const arr = matchesByGroup.get(homeTeam.groupKey) || [];
    arr.push(m);
    matchesByGroup.set(homeTeam.groupKey, arr);
  }

  // Compute thirds for all groups
  const thirds: ThirdTeamInfo[] = GROUPS.map((gk) => {
    const gTeams = teamsByGroup.get(gk) || [];
    const gMatches = matchesByGroup.get(gk) || [];
    const result = computeGroupThird(gTeams, gMatches, matchPredictions);

    return {
      groupKey: gk,
      team: result.team,
      points: result.points,
      goalDifference: result.goalDifference,
      goalsFor: result.goalsFor,
      qualifies: false,
      hasData: result.complete,
    };
  });

  // Determine best 8
  const withData = thirds.filter((t) => t.hasData);
  if (withData.length > 0) {
    const sorted = [...withData].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    const qualifyingGroups = new Set(sorted.slice(0, 8).map((t) => t.groupKey));
    for (const t of thirds) {
      t.qualifies = qualifyingGroups.has(t.groupKey) && t.hasData;
    }
  }

  const qualifiedCount = thirds.filter((t) => t.qualifies).length;
  const completeCount = thirds.filter((t) => t.hasData).length;

  const columns = [
    {
      title: 'Grupo',
      dataIndex: 'groupKey',
      width: 70,
      render: (gk: string) => <strong>Grupo {gk}</strong>,
    },
    {
      title: 'Equipo 3o',
      key: 'third',
      render: (record: ThirdTeamInfo) => {
        if (!record.team) {
          return <Typography.Text type="secondary">Completa el grupo</Typography.Text>;
        }
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TeamFlag code={record.team.code} size={20} /> {record.team.name}
          </span>
        );
      },
    },
    {
      title: 'PTS',
      key: 'points',
      width: 50,
      render: (record: ThirdTeamInfo) => record.hasData ? <strong>{record.points}</strong> : '—',
    },
    {
      title: 'DG',
      key: 'gd',
      width: 50,
      render: (record: ThirdTeamInfo) => {
        if (!record.hasData) return '—';
        const color = record.goalDifference > 0 ? '#2DC653' : record.goalDifference < 0 ? '#E63946' : '#A8A8A8';
        return <span style={{ color }}>{record.goalDifference > 0 ? '+' : ''}{record.goalDifference}</span>;
      },
    },
    {
      title: 'Clasifica',
      key: 'qualifies',
      width: 90,
      render: (record: ThirdTeamInfo) => {
        if (!record.hasData) return <Tag color="default">—</Tag>;
        return record.qualifies
          ? <Tag icon={<CheckCircleOutlined />} color="success">Si</Tag>
          : <Tag color="error">No</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Mejores Terceros (derivado)
        </Typography.Title>
        <span style={{ display: 'flex', gap: 6 }}>
          <Tag color={completeCount === 12 ? 'success' : 'processing'} icon={completeCount === 12 ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>
            {completeCount}/12 grupos
          </Tag>
          {completeCount >= 8 && (
            <Tag color={qualifiedCount === 8 ? 'success' : 'processing'}>
              {qualifiedCount}/8 clasifican
            </Tag>
          )}
        </span>
      </div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Se calcula automaticamente segun tus predicciones de partidos. Los 8 mejores terceros clasifican a 32avos.
      </Typography.Text>
      <Table
        dataSource={thirds.map((t) => ({ ...t, key: t.groupKey }))}
        columns={columns}
        pagination={false}
        size="small"
        bordered
      />
    </div>
  );
}
