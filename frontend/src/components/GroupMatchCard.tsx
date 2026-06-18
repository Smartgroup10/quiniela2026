import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, InputNumber, Tag, message } from 'antd';
import { CheckCircleOutlined, EditOutlined, LoadingOutlined, LockOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { MatchInfo, MatchPrediction } from '../api/predictions';
import { predictionsApi } from '../api/predictions';
import TeamFlag from './TeamFlag';
import DerivedStandingsTable from './DerivedStandingsTable';
import { useTournamentStore } from '../stores/tournamentStore';

interface Props {
  groupKey: string;
  teams: Team[];
  matches: MatchInfo[];
  predictions: Map<string, { homeGoals: number; awayGoals: number }>;
  disabled: boolean;
  onSaved: (predictions: { matchId: string; homeGoals: number; awayGoals: number }[]) => void;
}

export default function GroupMatchCard({ groupKey, teams, matches, predictions, disabled, onSaved }: Props) {
  const [local, setLocal] = useState<Map<string, { homeGoals: number | null; awayGoals: number | null }>>(new Map());
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reactive timer: recalculate locked matches every 30s
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const ONE_HOUR = 60 * 60 * 1000;
  const bypassUntilStr = useTournamentStore((s) => s.predictionLockBypassUntil);
  const bypassUntil = bypassUntilStr ? new Date(bypassUntilStr).getTime() : 0;
  const kickoffLockActive = now >= bypassUntil;
  const lockedMatchIds = new Set(
    matches.filter((m) =>
      m.status === 'FINISHED' || m.status === 'LIVE' ||
      m.manuallyLocked ||
      (kickoffLockActive && new Date(m.kickoffAt).getTime() - now < ONE_HOUR)
    ).map((m) => m.id),
  );

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Initialize local state from predictions (only on mount / matches change)
  useEffect(() => {
    const m = new Map<string, { homeGoals: number | null; awayGoals: number | null }>();
    for (const match of matches) {
      const pred = predictions.get(match.id);
      m.set(match.id, pred ? { homeGoals: pred.homeGoals, awayGoals: pred.awayGoals } : { homeGoals: null, awayGoals: null });
    }
    setLocal(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const completedCount = [...local.values()].filter((v) => v.homeGoals !== null && v.awayGoals !== null).length;
  const allComplete = completedCount === matches.length;
  const hasPredictions = completedCount > 0;

  const saveGroup = useCallback(async (currentLocal: Map<string, { homeGoals: number | null; awayGoals: number | null }>) => {
    // Collect only complete predictions (excluding locked matches)
    const preds: { matchId: string; homeGoals: number; awayGoals: number }[] = [];
    const currentTime = Date.now();
    for (const [matchId, v] of currentLocal) {
      if (v.homeGoals !== null && v.awayGoals !== null) {
        const match = matches.find((m) => m.id === matchId);
        if (!match) continue;
        if (match.status === 'FINISHED' || match.status === 'LIVE') continue;
        if (match.manuallyLocked) continue;
        if (new Date(match.kickoffAt).getTime() - currentTime < ONE_HOUR) continue;
        preds.push({ matchId, homeGoals: v.homeGoals, awayGoals: v.awayGoals });
      }
    }
    if (preds.length === 0) return;

    setSaving(true);
    try {
      await predictionsApi.saveGroupMatchPredictions(groupKey, { predictions: preds });
      onSaved(preds);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [groupKey, onSaved, matches]);

  const handleChange = (matchId: string, field: 'homeGoals' | 'awayGoals', value: number | null) => {
    if (disabled || lockedMatchIds.has(matchId)) return;
    setLocal((prev) => {
      const next = new Map(prev);
      const current = next.get(matchId) || { homeGoals: null, awayGoals: null };
      next.set(matchId, { ...current, [field]: value });

      // Debounce save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveGroup(next), 600);

      return next;
    });
  };

  // Build predictions array for standings calculation
  const standingsPreds = matches
    .filter((m) => {
      const v = local.get(m.id);
      return v && v.homeGoals !== null && v.awayGoals !== null;
    })
    .map((m) => {
      const v = local.get(m.id)!;
      return {
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeGoals: v.homeGoals!,
        awayGoals: v.awayGoals!,
      };
    });

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Grupo {groupKey}</span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Tag color={allComplete ? 'success' : hasPredictions ? 'processing' : 'default'} style={{ margin: 0 }}>
              {completedCount}/{matches.length}
            </Tag>
            {saving ? (
              <Tag icon={<LoadingOutlined />} color="blue" style={{ margin: 0 }}>Guardando</Tag>
            ) : allComplete ? (
              <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0 }}>Completo</Tag>
            ) : hasPredictions ? (
              <Tag icon={<EditOutlined />} color="warning" style={{ margin: 0 }}>Parcial</Tag>
            ) : (
              <Tag icon={<EditOutlined />} color="default" style={{ margin: 0 }}>Pendiente</Tag>
            )}
          </span>
        </div>
      }
      size="small"
      style={{ borderTop: `3px solid ${allComplete ? '#2DC653' : hasPredictions ? '#F4A261' : '#3A3A3A'}` }}
    >
      {disabled && (
        <div style={{ fontSize: 12, color: '#A8A8A8', marginBottom: 8 }}>Fase cerrada</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((match) => {
          const home = teamMap.get(match.homeTeamId);
          const away = teamMap.get(match.awayTeamId);
          const v = local.get(match.id) || { homeGoals: null, awayGoals: null };
          const isLocked = lockedMatchIds.has(match.id);
          const matchDisabled = disabled || isLocked;

          return (
            <div key={match.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: isLocked ? '#1A1A1A' : '#1A1A1A',
                  border: `1px solid ${isLocked ? '#4A3A1A' : '#2D2D2D'}`,
                  opacity: isLocked ? 0.6 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
                {/* Home team */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: '#F1FAEE', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {home?.name || '?'}
                  </span>
                  {home && <TeamFlag code={home.code} size={20} />}
                </div>

                {/* Score inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <InputNumber
                    size="small"
                    min={0}
                    max={20}
                    value={v.homeGoals}
                    onChange={(val) => handleChange(match.id, 'homeGoals', val)}
                    disabled={matchDisabled}
                    controls={false}
                    style={{ width: 38, textAlign: 'center' }}
                  />
                  <span style={{ color: '#A8A8A8', fontWeight: 600 }}>-</span>
                  <InputNumber
                    size="small"
                    min={0}
                    max={20}
                    value={v.awayGoals}
                    onChange={(val) => handleChange(match.id, 'awayGoals', val)}
                    disabled={matchDisabled}
                    controls={false}
                    style={{ width: 38, textAlign: 'center' }}
                  />
                </div>

                {/* Away team */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  {away && <TeamFlag code={away.code} size={20} />}
                  <span style={{ fontSize: 13, color: '#F1FAEE', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {away?.name || '?'}
                  </span>
                </div>
              </div>
              {isLocked && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: '#D4A93C', marginTop: 2, paddingLeft: 8,
                }}>
                  <LockOutlined style={{ fontSize: 10 }} />
                  {match.status === 'FINISHED' ? 'Partido finalizado' :
                   match.status === 'LIVE' ? 'Partido en curso' :
                   match.manuallyLocked ? 'Bloqueado por admin' :
                   'Bloqueado — partido en menos de 1h'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Derived standings */}
      {standingsPreds.length > 0 && (
        <DerivedStandingsTable
          teams={teams}
          predictions={standingsPreds}
          allComplete={allComplete}
        />
      )}
    </Card>
  );
}
