import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Card, Button, Select, Switch, Tag, message, Segmented, Typography, Space } from 'antd';
import { SaveOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { matchesApi } from '../../api/matches';
import { teamsApi, type Team } from '../../api/teams';
import { adminApi } from '../../api/admin';
import type { MatchInfo } from '../../api/predictions';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const ROUND_LABELS: Record<string, string> = {
  R32: 'Octavos de Final',
  R16: 'Octavos de Final',
  QF: 'Cuartos de Final',
  SF: 'Semifinales',
  THIRD_PLACE: 'Tercer Puesto',
  FINAL: 'Final',
};
const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

const inputStyle: React.CSSProperties = {
  width: 50,
  height: 30,
  textAlign: 'center',
  fontSize: 16,
  fontWeight: 'bold',
  border: '1px solid #d9d9d9',
  borderRadius: 6,
  outline: 'none',
  background: '#141414',
  color: '#f0f0f0',
};

const MatchResultRow = memo(function MatchResultRow({
  match,
  teamMap,
}: {
  match: MatchInfo;
  teamMap: Record<string, Team>;
}) {
  const homeRef = useRef<HTMLInputElement>(null);
  const awayRef = useRef<HTMLInputElement>(null);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(match.winnerTeamId);
  const [wentToPenalties, setWentToPenalties] = useState(match.wentToPenalties);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(match.status === 'FINISHED');

  const homeTeam = teamMap[match.homeTeamId];
  const awayTeam = teamMap[match.awayTeamId];
  const isKnockout = match.stage === 'KNOCKOUT';
  const isFinished = saved && !dirty;

  const getValues = () => {
    const h = homeRef.current?.value;
    const a = awayRef.current?.value;
    return {
      homeGoals: h !== '' && h != null ? parseInt(h) : null,
      awayGoals: a !== '' && a != null ? parseInt(a) : null,
    };
  };

  const handleSave = async () => {
    const { homeGoals, awayGoals } = getValues();
    if (homeGoals === null || awayGoals === null) {
      message.warning('Ingresa ambos marcadores');
      return;
    }
    setSaving(true);
    try {
      await adminApi.setMatchResult(match.id, {
        homeGoals,
        awayGoals,
        winnerTeamId,
        wentToPenalties,
      });
      setDirty(false);
      setSaved(true);
      message.success('Resultado guardado');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar resultado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 0',
        borderBottom: '1px solid #f0f0f0',
        flexWrap: 'wrap',
      }}
    >
      <Tag color={isFinished ? 'green' : 'default'} style={{ minWidth: 30, textAlign: 'center' }}>
        {isFinished ? 'FIN' : `#${match.matchNumber}`}
      </Tag>

      <Typography.Text strong style={{ minWidth: 120, textAlign: 'right' }}>
        {homeTeam ? `${homeTeam.flagUrl || ''} ${homeTeam.name}` : 'Por definir'}
      </Typography.Text>

      <input
        ref={homeRef}
        type="number"
        min={0}
        max={20}
        defaultValue={match.homeGoals ?? ''}
        onChange={() => setDirty(true)}
        style={inputStyle}
        placeholder="-"
      />
      <Typography.Text strong>-</Typography.Text>
      <input
        ref={awayRef}
        type="number"
        min={0}
        max={20}
        defaultValue={match.awayGoals ?? ''}
        onChange={() => setDirty(true)}
        style={inputStyle}
        placeholder="-"
      />

      <Typography.Text strong style={{ minWidth: 120 }}>
        {awayTeam ? `${awayTeam.flagUrl || ''} ${awayTeam.name}` : 'Por definir'}
      </Typography.Text>

      {isKnockout && (
        <>
          <Space size="small">
            <Switch
              checked={wentToPenalties}
              onChange={(v) => { setWentToPenalties(v); setDirty(true); }}
              size="small"
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Penales</Typography.Text>
          </Space>
          <Select
            value={winnerTeamId}
            onChange={(v) => { setWinnerTeamId(v); setDirty(true); }}
            size="small"
            placeholder="Ganador"
            style={{ width: 140 }}
            allowClear
            options={[
              homeTeam ? { value: homeTeam.id, label: `${homeTeam.flagUrl || ''} ${homeTeam.name}` } : null,
              awayTeam ? { value: awayTeam.id, label: `${awayTeam.flagUrl || ''} ${awayTeam.name}` } : null,
            ].filter(Boolean) as any[]}
          />
        </>
      )}

      {dirty ? (
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
        >
          Guardar
        </Button>
      ) : isFinished ? (
        <Tag color="green" icon={<CheckCircleOutlined />}>Cargado</Tag>
      ) : null}
    </div>
  );
});

export default function AdminMatchesTab() {
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<string>('Fase de Grupos');
  const [selectedGroup, setSelectedGroup] = useState<string>('A');

  const teamMap = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach((t) => { map[t.id] = t; });
    return map;
  }, [teams]);

  useEffect(() => {
    Promise.all([
      matchesApi.getAll(),
      teamsApi.getAll(),
    ]).then(([matchesRes, teamsRes]) => {
      setMatches(matchesRes.data);
      setTeams(teamsRes.data);
    }).catch(() => {
      message.error('Error al cargar partidos');
    }).finally(() => setLoading(false));
  }, []);

  const handleRecalculate = async () => {
    try {
      const { data } = await adminApi.recalculate();
      message.success(`Puntos recalculados para ${data.usersRecalculated} usuarios`);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al recalcular');
    }
  };

  const groupMatches = useMemo(() => {
    const byGroup: Record<string, MatchInfo[]> = {};
    GROUPS.forEach((g) => { byGroup[g] = []; });
    matches
      .filter((m) => m.stage === 'GROUP')
      .forEach((m) => {
        const team = teamMap[m.homeTeamId];
        if (team?.groupKey) {
          byGroup[team.groupKey]?.push(m);
        }
      });
    return byGroup;
  }, [matches, teamMap]);

  const knockoutByRound = useMemo(() => {
    const byRound: Record<string, MatchInfo[]> = {};
    matches
      .filter((m) => m.stage === 'KNOCKOUT')
      .forEach((m) => {
        const round = m.round || 'OTHER';
        if (!byRound[round]) byRound[round] = [];
        byRound[round].push(m);
      });
    return byRound;
  }, [matches]);

  if (loading) return <Card loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Segmented
          options={['Fase de Grupos', 'Eliminatorias']}
          value={view}
          onChange={(v) => setView(v as string)}
          size="large"
        />
        <Button icon={<ReloadOutlined />} onClick={handleRecalculate}>
          Recalcular Puntos
        </Button>
      </div>

      <div style={{ display: view === 'Fase de Grupos' ? 'block' : 'none' }}>
        <Segmented
          options={GROUPS}
          value={selectedGroup}
          onChange={(v) => setSelectedGroup(v as string)}
          block
          style={{ marginBottom: 16 }}
        />
        {GROUPS.map((group) => (
          <div key={group} style={{ display: selectedGroup === group ? 'block' : 'none' }}>
            <Card title={`Grupo ${group}`} size="small">
              {(groupMatches[group] || []).map((match) => (
                <MatchResultRow key={match.id} match={match} teamMap={teamMap} />
              ))}
            </Card>
          </div>
        ))}
      </div>

      <div style={{ display: view === 'Eliminatorias' ? 'block' : 'none' }}>
        {ROUND_ORDER.filter((r) => knockoutByRound[r]?.length).map((round) => (
          <Card
            key={round}
            title={ROUND_LABELS[round] || round}
            size="small"
            style={{ marginBottom: 16 }}
          >
            {knockoutByRound[round].map((match) => (
              <MatchResultRow key={match.id} match={match} teamMap={teamMap} />
            ))}
          </Card>
        ))}
        {!Object.keys(knockoutByRound).length && (
          <Typography.Text type="secondary">No hay partidos de eliminatorias cargados aun.</Typography.Text>
        )}
      </div>
    </div>
  );
}
