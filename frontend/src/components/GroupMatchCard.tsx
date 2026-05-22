import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, InputNumber, Tag, message } from 'antd';
import { CheckCircleOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { MatchInfo, MatchPrediction } from '../api/predictions';
import { predictionsApi } from '../api/predictions';
import TeamFlag from './TeamFlag';
import DerivedStandingsTable from './DerivedStandingsTable';

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
    // Collect only complete predictions
    const preds: { matchId: string; homeGoals: number; awayGoals: number }[] = [];
    for (const [matchId, v] of currentLocal) {
      if (v.homeGoals !== null && v.awayGoals !== null) {
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
  }, [groupKey, onSaved]);

  const handleChange = (matchId: string, field: 'homeGoals' | 'awayGoals', value: number | null) => {
    if (disabled) return;
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

          return (
            <div
              key={match.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                borderRadius: 6,
                background: '#1A1A1A',
                border: '1px solid #2D2D2D',
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
                  disabled={disabled}
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
                  disabled={disabled}
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
