import { useState } from 'react';
import { Table, Typography, Tag, Switch, Alert } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { MatchInfo } from '../api/predictions';
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
  isTied: boolean; // part of an unresolvable tie at the cutoff
  manuallySelected: boolean | null; // null = no override, true/false = user choice
}

interface Props {
  teams: Team[];
  matches: MatchInfo[];
  matchPredictions: Map<string, { homeGoals: number; awayGoals: number }>;
  manualOverrides?: Map<string, boolean>; // groupKey -> willPass
  onManualOverride?: (groupKey: string, willPass: boolean) => void;
  disabled?: boolean;
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

/**
 * Detects if there's an unresolvable tie at the qualification boundary.
 * Returns the set of groupKeys that are tied at positions spanning the 8th cutoff.
 * Also returns how many "slots" remain for the tied teams.
 */
function detectTieAtBoundary(
  sorted: ThirdTeamInfo[],
): { tiedGroupKeys: Set<string>; availableSlots: number } {
  // Only consider teams with data
  const withData = sorted.filter((t) => t.hasData);
  if (withData.length < 8) return { tiedGroupKeys: new Set(), availableSlots: 0 };

  // Find the tie cluster that spans position 8 (index 7)
  const atCutoff = withData[7]; // 8th position (0-indexed: 7)

  // Find all teams with same PTS, GD, GF as the team at the cutoff
  const tiedAll = withData.filter(
    (t) => t.points === atCutoff.points &&
           t.goalDifference === atCutoff.goalDifference &&
           t.goalsFor === atCutoff.goalsFor,
  );

  // If only 1 team at those exact stats, no tie to resolve
  if (tiedAll.length <= 1) return { tiedGroupKeys: new Set(), availableSlots: 0 };

  // Count how many teams ABOVE the tied cluster already qualify for sure
  const clearlyAbove = withData.filter(
    (t) =>
      t.points > atCutoff.points ||
      (t.points === atCutoff.points && t.goalDifference > atCutoff.goalDifference) ||
      (t.points === atCutoff.points && t.goalDifference === atCutoff.goalDifference && t.goalsFor > atCutoff.goalsFor),
  );

  const availableSlots = 8 - clearlyAbove.length;
  const tiedGroupKeys = new Set(tiedAll.map((t) => t.groupKey));

  // Only flag as tie if there are more tied teams than available slots
  if (tiedAll.length > availableSlots) {
    return { tiedGroupKeys, availableSlots };
  }

  return { tiedGroupKeys: new Set(), availableSlots: 0 };
}

export default function BestThirdsTable({ teams, matches, matchPredictions, manualOverrides, onManualOverride, disabled }: Props) {
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

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
      isTied: false,
      manuallySelected: null,
    };
  });

  // Sort thirds with data to determine qualification
  const withData = thirds.filter((t) => t.hasData);
  const sorted = [...withData].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // Detect ties
  const { tiedGroupKeys, availableSlots } = detectTieAtBoundary(sorted);
  const hasTie = tiedGroupKeys.size > 0;

  // Determine qualification
  if (withData.length > 0) {
    if (!hasTie) {
      // No tie: top 8 qualify automatically
      const qualifyingGroups = new Set(sorted.slice(0, 8).map((t) => t.groupKey));
      for (const t of thirds) {
        t.qualifies = qualifyingGroups.has(t.groupKey) && t.hasData;
      }
    } else {
      // Tie exists: teams clearly above qualify, tied teams use manual overrides
      for (const t of thirds) {
        if (!t.hasData) continue;
        if (tiedGroupKeys.has(t.groupKey)) {
          // This team is in the tied cluster
          t.isTied = true;
          const override = manualOverrides?.get(t.groupKey);
          t.manuallySelected = override ?? null;
          t.qualifies = override === true;
        } else {
          // Check if clearly above the tie
          const atCutoff = sorted.find((s) => tiedGroupKeys.has(s.groupKey))!;
          const isAbove =
            t.points > atCutoff.points ||
            (t.points === atCutoff.points && t.goalDifference > atCutoff.goalDifference) ||
            (t.points === atCutoff.points && t.goalDifference === atCutoff.goalDifference && t.goalsFor > atCutoff.goalsFor);
          t.qualifies = isAbove;
        }
      }
    }
  }

  const qualifiedCount = thirds.filter((t) => t.qualifies).length;
  const completeCount = thirds.filter((t) => t.hasData).length;
  const manuallySelectedCount = thirds.filter((t) => t.isTied && t.manuallySelected === true).length;

  const handleToggle = async (groupKey: string, checked: boolean) => {
    if (!onManualOverride) return;

    // Check if we'd exceed available slots
    if (checked) {
      const currentSelected = thirds.filter((t) => t.isTied && t.manuallySelected === true && t.groupKey !== groupKey).length;
      if (currentSelected >= availableSlots) return; // can't select more
    }

    setSavingGroup(groupKey);
    try {
      await onManualOverride(groupKey, checked);
    } finally {
      setSavingGroup(null);
    }
  };

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
      title: 'GF',
      key: 'gf',
      width: 50,
      render: (record: ThirdTeamInfo) => record.hasData ? record.goalsFor : '—',
    },
    {
      title: 'Clasifica',
      key: 'qualifies',
      width: 110,
      render: (record: ThirdTeamInfo) => {
        if (!record.hasData) return <Tag color="default">—</Tag>;

        // If tied and manual selection is active
        if (record.isTied) {
          const isMaxReached = manuallySelectedCount >= availableSlots && record.manuallySelected !== true;
          return (
            <Switch
              size="small"
              checked={record.manuallySelected === true}
              disabled={disabled || isMaxReached || savingGroup !== null}
              loading={savingGroup === record.groupKey}
              onChange={(checked) => handleToggle(record.groupKey, checked)}
              checkedChildren="Si"
              unCheckedChildren="No"
            />
          );
        }

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

      {hasTie && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 12 }}
          message="Empate entre mejores terceros"
          description={
            <>
              Hay <strong>{tiedGroupKeys.size} equipos</strong> empatados en puntos, diferencia de goles y goles a favor
              para <strong>{availableSlots} {availableSlots === 1 ? 'plaza' : 'plazas'}</strong> disponible{availableSlots === 1 ? '' : 's'}.
              {' '}Selecciona manualmente cual{availableSlots === 1 ? '' : 'es'} clasifica{availableSlots === 1 ? '' : 'n'} usando
              los interruptores de la columna "Clasifica".
              {manuallySelectedCount < availableSlots && (
                <span style={{ display: 'block', marginTop: 4, color: '#d46b08' }}>
                  Faltan {availableSlots - manuallySelectedCount} por seleccionar.
                </span>
              )}
            </>
          }
        />
      )}

      <Table
        dataSource={thirds.map((t) => ({ ...t, key: t.groupKey }))}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        onRow={(record) => ({
          style: record.isTied ? { backgroundColor: '#fffbe6' } : undefined,
        })}
      />
    </div>
  );
}
