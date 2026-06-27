import { useEffect, useState } from 'react';
import { InputNumber, Switch, Tag, message } from 'antd';
import { CheckCircleOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { BracketMatchWithPrediction, BracketPrediction } from '../api/predictions';
import { predictionsApi } from '../api/predictions';
import TeamFlag from './TeamFlag';

const V = {
  bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  green: 'var(--green)',
};

interface Props {
  data: BracketMatchWithPrediction;
  teamMap: Map<string, Team>;
  canEdit: boolean;
  // En R16+: equipos derivados de mis predicciones de la ronda anterior.
  // En R32: misma cosa que match.homeTeamId/awayTeamId.
  derivedHomeTeamId?: string | null;
  derivedAwayTeamId?: string | null;
  onSaved: (p: BracketPrediction) => void;
}

export default function BracketMatchCard({ data, teamMap, canEdit, derivedHomeTeamId, derivedAwayTeamId, onSaved }: Props) {
  const { match, myPrediction } = data;
  // Equipos para predecir: si vienen derivados (R16+) se usan; si no, los del partido real.
  const effectiveHomeId = derivedHomeTeamId !== undefined ? derivedHomeTeamId : match.homeTeamId;
  const effectiveAwayId = derivedAwayTeamId !== undefined ? derivedAwayTeamId : match.awayTeamId;
  const home = effectiveHomeId ? teamMap.get(effectiveHomeId) : null;
  const away = effectiveAwayId ? teamMap.get(effectiveAwayId) : null;

  const [homeGoals, setHomeGoals] = useState<number | null>(myPrediction?.homeGoals ?? null);
  const [awayGoals, setAwayGoals] = useState<number | null>(myPrediction?.awayGoals ?? null);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(myPrediction?.winnerTeamId ?? null);
  const [wentToPenalties, setWentToPenalties] = useState<boolean>(myPrediction?.wentToPenalties ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHomeGoals(myPrediction?.homeGoals ?? null);
    setAwayGoals(myPrediction?.awayGoals ?? null);
    setWinnerTeamId(myPrediction?.winnerTeamId ?? null);
    setWentToPenalties(myPrediction?.wentToPenalties ?? false);
  }, [myPrediction]);

  const teamsTBD = !home || !away;
  const matchDone = match.status === 'FINISHED' || match.status === 'LIVE';
  const locked = match.manuallyLocked || matchDone || !canEdit;

  // Auto-derivar winnerTeamId desde el marcador si los goles son distintos
  useEffect(() => {
    if (homeGoals == null || awayGoals == null || !home || !away) return;
    if (homeGoals > awayGoals && winnerTeamId !== home.id) setWinnerTeamId(home.id);
    else if (awayGoals > homeGoals && winnerTeamId !== away.id) setWinnerTeamId(away.id);
    // si empate, dejamos winnerTeamId tal como esta (eleccion manual en penaltis)
  }, [homeGoals, awayGoals, home, away]);

  // Si la prediccion deja de ser empate, desactivar penaltis automaticamente
  useEffect(() => {
    if (homeGoals != null && awayGoals != null && homeGoals !== awayGoals && wentToPenalties) {
      setWentToPenalties(false);
    }
  }, [homeGoals, awayGoals, wentToPenalties]);

  const handleSave = async () => {
    if (homeGoals == null || awayGoals == null || !winnerTeamId) {
      message.warning('Completa marcador y ganador');
      return;
    }
    if (homeGoals === awayGoals && !wentToPenalties) {
      message.warning('En eliminatorias no hay empate. Activa "Penaltis" y elige ganador.');
      return;
    }
    setSaving(true);
    try {
      const { data: pred } = await predictionsApi.saveBracketPrediction(match.id, {
        predictedHomeTeamId: effectiveHomeId ?? null,
        predictedAwayTeamId: effectiveAwayId ?? null,
        homeGoals,
        awayGoals,
        winnerTeamId,
        wentToPenalties,
      });
      onSaved(pred);
      message.success('Prediccion guardada');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: V.bg1, border: `1px solid ${V.line}`,
      borderRadius: 12, padding: 12, fontSize: 13,
      display: 'flex', flexDirection: 'column', gap: 10,
      opacity: teamsTBD ? 0.55 : 1,
    }}>
      {/* Header: round + matchNumber + status */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 10, color: V.fg2,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span>#{match.matchNumber}</span>
        <span>{new Date(match.kickoffAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
        {locked && <LockOutlined style={{ fontSize: 10 }} />}
        {myPrediction && myPrediction.pointsEarned > 0 && (
          <Tag color="gold" style={{ margin: 0, fontSize: 9, padding: '0 6px' }}>+{myPrediction.pointsEarned}</Tag>
        )}
      </div>

      {/* Teams + score inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          disabled={teamsTBD || locked || homeGoals == null || awayGoals == null || homeGoals !== awayGoals}
          onClick={() => home && setWinnerTeamId(home.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: winnerTeamId === home?.id ? 'rgba(212,169,60,0.18)' : 'transparent',
            border: `1px solid ${winnerTeamId === home?.id ? V.gold : V.line}`,
            borderRadius: 8, padding: '5px 6px',
            color: V.fg0, fontSize: 12, fontWeight: 600,
            cursor: !teamsTBD && !locked && homeGoals === awayGoals ? 'pointer' : 'default',
            textAlign: 'left',
            minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap',
          }}
        >
          {home ? <><TeamFlag code={home.code} size={16} /> {home.code}</> : <span style={{ color: V.fg3 }}>TBD</span>}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InputNumber
            min={0} max={20}
            value={homeGoals}
            onChange={(v) => setHomeGoals(v == null ? null : Number(v))}
            disabled={locked || teamsTBD}
            size="small"
            style={{ width: 42 }}
            controls={false}
          />
          <span style={{ color: V.fg3, fontWeight: 600 }}>-</span>
          <InputNumber
            min={0} max={20}
            value={awayGoals}
            onChange={(v) => setAwayGoals(v == null ? null : Number(v))}
            disabled={locked || teamsTBD}
            size="small"
            style={{ width: 42 }}
            controls={false}
          />
        </div>

        <button
          type="button"
          disabled={teamsTBD || locked || homeGoals == null || awayGoals == null || homeGoals !== awayGoals}
          onClick={() => away && setWinnerTeamId(away.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end',
            background: winnerTeamId === away?.id ? 'rgba(212,169,60,0.18)' : 'transparent',
            border: `1px solid ${winnerTeamId === away?.id ? V.gold : V.line}`,
            borderRadius: 8, padding: '5px 6px',
            color: V.fg0, fontSize: 12, fontWeight: 600,
            cursor: !teamsTBD && !locked && homeGoals === awayGoals ? 'pointer' : 'default',
            textAlign: 'right',
            minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap',
          }}
        >
          {away ? <>{away.code} <TeamFlag code={away.code} size={16} /></> : <span style={{ color: V.fg3 }}>TBD</span>}
        </button>
      </div>

      {/* Penaltis toggle — solo permitido si la prediccion es empate */}
      {(() => {
        const isDraw = homeGoals != null && awayGoals != null && homeGoals === awayGoals;
        const penaltiesDisabled = locked || teamsTBD || !isDraw;
        return (
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: penaltiesDisabled ? V.fg3 : V.fg1,
            fontSize: 12,
          }}>
            <Switch
              size="small"
              checked={wentToPenalties}
              onChange={setWentToPenalties}
              disabled={penaltiesDisabled}
            />
            Penaltis
            {!isDraw && homeGoals != null && awayGoals != null && (
              <span style={{ color: V.fg3, fontSize: 10, fontStyle: 'italic' }}>
                (solo si empatas)
              </span>
            )}
          </label>
        );
      })()}

      {/* Si fue a penaltis Y es empate -> dos checks para marcar ganador en la tanda */}
      {wentToPenalties && homeGoals != null && awayGoals != null && homeGoals === awayGoals && (
        <div style={{
          background: 'rgba(212,169,60,0.10)',
          border: `1px solid ${V.gold}`,
          borderRadius: 8,
          padding: '8px 10px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 10, color: V.fg2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Gana en penaltis:
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              disabled={!home || locked}
              onClick={() => home && setWinnerTeamId(home.id)}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                background: winnerTeamId === home?.id ? 'rgba(212,169,60,0.30)' : 'transparent',
                border: `1px solid ${winnerTeamId === home?.id ? V.gold : V.line}`,
                borderRadius: 6, padding: '5px 8px',
                color: V.fg0, fontSize: 12, fontWeight: 600,
                cursor: !locked && home ? 'pointer' : 'default',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: `1.5px solid ${winnerTeamId === home?.id ? V.gold : V.fg3}`,
                background: winnerTeamId === home?.id ? V.gold : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#0a0d14', fontSize: 10, fontWeight: 700,
              }}>{winnerTeamId === home?.id ? '✓' : ''}</span>
              {home ? <><TeamFlag code={home.code} size={14} /> {home.code}</> : 'TBD'}
            </button>
            <button
              type="button"
              disabled={!away || locked}
              onClick={() => away && setWinnerTeamId(away.id)}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                background: winnerTeamId === away?.id ? 'rgba(212,169,60,0.30)' : 'transparent',
                border: `1px solid ${winnerTeamId === away?.id ? V.gold : V.line}`,
                borderRadius: 6, padding: '5px 8px',
                color: V.fg0, fontSize: 12, fontWeight: 600,
                cursor: !locked && away ? 'pointer' : 'default',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: `1.5px solid ${winnerTeamId === away?.id ? V.gold : V.fg3}`,
                background: winnerTeamId === away?.id ? V.gold : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#0a0d14', fontSize: 10, fontWeight: 700,
              }}>{winnerTeamId === away?.id ? '✓' : ''}</span>
              {away ? <><TeamFlag code={away.code} size={14} /> {away.code}</> : 'TBD'}
            </button>
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {myPrediction && !saving && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: V.green, fontSize: 11 }}>
            <CheckCircleOutlined /> Guardada
          </span>
        )}
        <div style={{ flex: 1 }} />
        {!locked && !teamsTBD && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: V.gold, color: '#0a0d14', border: 'none',
              borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <SaveOutlined /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        )}
      </div>
    </div>
  );
}
