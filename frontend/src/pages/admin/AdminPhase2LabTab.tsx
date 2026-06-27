import { useEffect, useMemo, useState } from 'react';
import { Card, Select, InputNumber, Switch, Button, Tag, Checkbox, message, Spin, Collapse } from 'antd';
import { SaveOutlined, CheckCircleOutlined, FlagOutlined } from '@ant-design/icons';
import { adminApi, type KoMatchWithPrediction } from '../../api/admin';
import { teamsApi, type Team } from '../../api/teams';
import TeamFlag from '../../components/TeamFlag';

const ROUND_LABELS: Record<string, string> = {
  R32: '32avos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinales',
  THIRD_PLACE: '3er puesto',
  FINAL: 'Final',
};
const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

export default function AdminPhase2LabTab() {
  const [matches, setMatches] = useState<KoMatchWithPrediction[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const teamOptions = useMemo(
    () => teams.map(t => ({ value: t.id, label: `${t.code} — ${t.name}` })),
    [teams],
  );
  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, tRes] = await Promise.all([adminApi.listKoMatches(), teamsApi.getAll()]);
      setMatches(mRes.data);
      setTeams(tRes.data);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al cargar Lab Fase 2');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const byRound = useMemo(() => {
    const map: Record<string, KoMatchWithPrediction[]> = {};
    for (const r of ROUND_ORDER) map[r] = [];
    for (const m of matches) {
      const r = m.round || 'R32';
      (map[r] = map[r] || []).push(m);
    }
    return map;
  }, [matches]);

  const handleUpdated = (updated: KoMatchWithPrediction) => {
    setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
  };

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 60 }} />;

  if (matches.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 32 }}>
          No hay partidos KO. Genera el bracket o impórtalo desde el Dashboard primero.
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <strong>Lab Fase 2</strong> — Edita equipos, marcador, penaltis. Al guardar, se ejecuta
        <code> recalculateAll() </code> y verás los puntos de tu predicción si tienes una.
        <br />
        <em style={{ color: '#888' }}>
          En empates, marca con el check qué equipo gana en penaltis. Si no es empate, el
          ganador se decide solo por marcador.
        </em>
      </Card>

      <Collapse
        defaultActiveKey={['R32']}
        items={ROUND_ORDER.filter(r => byRound[r].length > 0).map(round => ({
          key: round,
          label: `${ROUND_LABELS[round]} (${byRound[round].length})`,
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byRound[round].map(m => (
                <KoMatchEditor
                  key={m.id}
                  match={m}
                  teams={teams}
                  teamOptions={teamOptions}
                  teamMap={teamMap}
                  onUpdated={handleUpdated}
                />
              ))}
            </div>
          ),
        }))}
      />
    </div>
  );
}

function KoMatchEditor({
  match, teams: _teams, teamOptions, teamMap, onUpdated,
}: {
  match: KoMatchWithPrediction;
  teams: Team[];
  teamOptions: { value: string; label: string }[];
  teamMap: Map<string, Team>;
  onUpdated: (m: KoMatchWithPrediction) => void;
}) {
  const [homeTeamId, setHomeTeamId] = useState<string | null>(match.homeTeamId);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(match.awayTeamId);
  const [homeGoals, setHomeGoals] = useState<number | null>(match.homeGoals);
  const [awayGoals, setAwayGoals] = useState<number | null>(match.awayGoals);
  const [wentToPenalties, setWentToPenalties] = useState<boolean>(match.wentToPenalties);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(match.winnerTeamId);
  const [status, setStatus] = useState<string>(match.status);
  const [saving, setSaving] = useState(false);

  const isDraw = homeGoals != null && awayGoals != null && homeGoals === awayGoals;
  const homeTeam = homeTeamId ? teamMap.get(homeTeamId) : null;
  const awayTeam = awayTeamId ? teamMap.get(awayTeamId) : null;

  // Si NO es empate, el winner se decide por marcador
  const autoWinner = !isDraw && homeGoals != null && awayGoals != null
    ? (homeGoals > awayGoals ? homeTeamId : awayTeamId)
    : null;
  const effectiveWinner = isDraw ? winnerTeamId : autoWinner;

  const handleSave = async () => {
    if (isDraw && wentToPenalties && !winnerTeamId) {
      message.warning('Marca con el check qué equipo gana en penaltis.');
      return;
    }
    if (isDraw && !wentToPenalties) {
      message.warning('En eliminatorias no hay empate. Activa "Penaltis" y marca el ganador.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await adminApi.updateKoMatch(match.id, {
        homeTeamId,
        awayTeamId,
        homeGoals,
        awayGoals,
        wentToPenalties: isDraw ? wentToPenalties : false,
        winnerTeamId: effectiveWinner,
        status: status as any,
      });
      onUpdated(data);
      message.success('Partido actualizado. Recalculate ejecutado.');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const pred = match.myPrediction;

  return (
    <Card
      size="small"
      style={{ background: '#fafafa' }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
            #{match.matchNumber} · {match.round} ·{' '}
            {new Date(match.kickoffAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Tag color={status === 'FINISHED' ? 'green' : 'default'}>{status}</Tag>
            {pred && (
              <Tag color={pred.pointsEarned > 0 ? 'gold' : 'default'}>
                Tu pred: {pred.homeGoals}-{pred.awayGoals} · {pred.pointsEarned > 0 ? `+${pred.pointsEarned} pts` : '0 pts'}
              </Tag>
            )}
          </div>
        </div>
      }
    >
      {/* Equipos + marcador */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <Select
          showSearch
          allowClear
          placeholder="Local"
          options={teamOptions}
          value={homeTeamId}
          onChange={v => setHomeTeamId(v ?? null)}
          optionFilterProp="label"
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <InputNumber min={0} max={20} value={homeGoals} onChange={v => setHomeGoals(v == null ? null : Number(v))} style={{ width: 56 }} controls={false} />
          <span>-</span>
          <InputNumber min={0} max={20} value={awayGoals} onChange={v => setAwayGoals(v == null ? null : Number(v))} style={{ width: 56 }} controls={false} />
        </div>
        <Select
          showSearch
          allowClear
          placeholder="Visitante"
          options={teamOptions}
          value={awayTeamId}
          onChange={v => setAwayTeamId(v ?? null)}
          optionFilterProp="label"
          style={{ width: '100%' }}
        />
      </div>

      {/* Equipo visible */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 8 }}>
        <span>{homeTeam ? <><TeamFlag code={homeTeam.code} size={14} /> {homeTeam.name}</> : '—'}</span>
        <span>{awayTeam ? <>{awayTeam.name} <TeamFlag code={awayTeam.code} size={14} /></> : '—'}</span>
      </div>

      {/* Penaltis (solo si empate) */}
      {isDraw && (
        <div style={{
          background: '#fffbe6', border: '1px solid #ffe58f', padding: '8px 12px',
          borderRadius: 6, marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Switch size="small" checked={wentToPenalties} onChange={setWentToPenalties} />
            <strong>Fue a penaltis</strong>
          </div>
          {wentToPenalties && (
            <div style={{ display: 'flex', gap: 16, marginLeft: 4 }}>
              <Checkbox
                checked={winnerTeamId === homeTeamId}
                onChange={(e) => e.target.checked && setWinnerTeamId(homeTeamId)}
                disabled={!homeTeam}
              >
                <FlagOutlined /> Gana en penaltis: <strong>{homeTeam?.code || '?'}</strong>
              </Checkbox>
              <Checkbox
                checked={winnerTeamId === awayTeamId}
                onChange={(e) => e.target.checked && setWinnerTeamId(awayTeamId)}
                disabled={!awayTeam}
              >
                <FlagOutlined /> Gana en penaltis: <strong>{awayTeam?.code || '?'}</strong>
              </Checkbox>
            </div>
          )}
        </div>
      )}

      {/* Ganador final + status + guardar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#555' }}>
          Ganador:{' '}
          {effectiveWinner ? (
            <strong>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> {teamMap.get(effectiveWinner)?.code || '?'}
              {isDraw && wentToPenalties ? ' (penaltis)' : ''}
            </strong>
          ) : (
            <em style={{ color: '#999' }}>sin definir</em>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: 'SCHEDULED', label: 'Programado' },
              { value: 'LIVE', label: 'En curso' },
              { value: 'FINISHED', label: 'Finalizado' },
            ]}
            style={{ width: 130 }}
          />
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}
