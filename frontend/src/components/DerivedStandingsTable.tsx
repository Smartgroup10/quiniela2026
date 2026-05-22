import { Tag } from 'antd';
import type { Team } from '../api/teams';
import TeamFlag from './TeamFlag';

interface PredictedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
}

interface TeamRow {
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

interface Props {
  teams: Team[];
  predictions: PredictedMatch[];
  allComplete: boolean;
}

function computeH2H(tiedIds: Set<string>, matches: PredictedMatch[]) {
  const h2h = new Map<string, { pts: number; gd: number; gf: number }>();
  for (const id of tiedIds) h2h.set(id, { pts: 0, gd: 0, gf: 0 });
  for (const m of matches) {
    if (!tiedIds.has(m.homeTeamId) || !tiedIds.has(m.awayTeamId)) continue;
    const home = h2h.get(m.homeTeamId)!;
    const away = h2h.get(m.awayTeamId)!;
    home.gf += m.homeGoals; home.gd += m.homeGoals - m.awayGoals;
    away.gf += m.awayGoals; away.gd += m.awayGoals - m.homeGoals;
    if (m.homeGoals > m.awayGoals) home.pts += 3;
    else if (m.homeGoals < m.awayGoals) away.pts += 3;
    else { home.pts += 1; away.pts += 1; }
  }
  return h2h;
}

function computeStandings(teamIds: string[], predictions: PredictedMatch[]): TeamRow[] {
  const map = new Map<string, TeamRow>();
  for (const id of teamIds) {
    map.set(id, { teamId: id, points: 0, goalDifference: 0, goalsFor: 0 });
  }

  for (const m of predictions) {
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.goalsFor += m.homeGoals;
    away.goalsFor += m.awayGoals;
    home.goalDifference += m.homeGoals - m.awayGoals;
    away.goalDifference += m.awayGoals - m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.points += 3;
    } else if (m.homeGoals < m.awayGoals) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  // Sort by points, then apply H2H tiebreaker for tied teams
  const byPoints = [...map.values()].sort((a, b) => b.points - a.points);
  const result: TeamRow[] = [];
  let i = 0;
  while (i < byPoints.length) {
    let j = i + 1;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;
    const tied = byPoints.slice(i, j);
    if (tied.length === 1) { result.push(tied[0]); }
    else {
      const tiedIds = new Set(tied.map((t) => t.teamId));
      const h2h = computeH2H(tiedIds, predictions);
      tied.sort((a, b) => {
        const ha = h2h.get(a.teamId)!, hb = h2h.get(b.teamId)!;
        if (hb.pts !== ha.pts) return hb.pts - ha.pts;
        if (hb.gd !== ha.gd) return hb.gd - ha.gd;
        if (hb.gf !== ha.gf) return hb.gf - ha.gf;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
      result.push(...tied);
    }
    i = j;
  }
  return result;
}

export default function DerivedStandingsTable({ teams, predictions, allComplete }: Props) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const standings = computeStandings(teams.map((t) => t.id), predictions);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: '#A8A8A8', marginBottom: 4 }}>
        {allComplete ? 'Tabla derivada' : 'Tabla parcial'}
      </div>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#A8A8A8', borderBottom: '1px solid #2D2D2D' }}>
            <th style={{ textAlign: 'left', padding: '2px 4px', width: 24 }}>#</th>
            <th style={{ textAlign: 'left', padding: '2px 4px' }}>Equipo</th>
            <th style={{ textAlign: 'center', padding: '2px 4px', width: 30 }}>PTS</th>
            <th style={{ textAlign: 'center', padding: '2px 4px', width: 30 }}>DG</th>
            <th style={{ textAlign: 'center', padding: '2px 4px', width: 30 }}>GF</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, idx) => {
            const team = teamMap.get(row.teamId);
            const pos = idx + 1;
            const bgColor = pos <= 2 ? 'rgba(45,198,83,0.10)' : pos === 3 ? 'rgba(244,162,97,0.10)' : 'transparent';

            return (
              <tr key={row.teamId} style={{ background: bgColor, borderBottom: '1px solid #1A1A1A' }}>
                <td style={{ padding: '3px 4px', fontWeight: 600, color: '#F1FAEE' }}>{pos}</td>
                <td style={{ padding: '3px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {team && <TeamFlag code={team.code} size={14} />}
                  <span style={{ color: '#F1FAEE' }}>{team?.name || '?'}</span>
                  {pos <= 2 && <Tag color="green" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>C</Tag>}
                  {pos === 3 && <Tag color="orange" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>3o</Tag>}
                </td>
                <td style={{ textAlign: 'center', padding: '3px 4px', fontWeight: 600, color: '#F1FAEE' }}>{row.points}</td>
                <td style={{ textAlign: 'center', padding: '3px 4px', color: row.goalDifference > 0 ? '#2DC653' : row.goalDifference < 0 ? '#E63946' : '#A8A8A8' }}>
                  {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                </td>
                <td style={{ textAlign: 'center', padding: '3px 4px', color: '#A8A8A8' }}>{row.goalsFor}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
