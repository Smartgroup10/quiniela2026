import { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Switch, Button, message, Typography, Space, Tag } from 'antd';
import { SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { teamsApi, type Team } from '../../api/teams';
import { adminApi } from '../../api/admin';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const POSITIONS = [
  { value: 1, label: '1ro' },
  { value: 2, label: '2do' },
  { value: 3, label: '3ro' },
  { value: 4, label: '4to' },
];

interface TeamState {
  realFinalPosition: number | null;
  realClassified: boolean;
  realBestThird: boolean;
  dirty: boolean;
  saving: boolean;
}

export default function AdminGroupsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStates, setTeamStates] = useState<Record<string, TeamState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamsApi.getAll().then(({ data }) => {
      setTeams(data);
      const states: Record<string, TeamState> = {};
      data.forEach((t) => {
        states[t.id] = {
          realFinalPosition: t.realFinalPosition,
          realClassified: t.realClassified,
          realBestThird: t.realBestThird,
          dirty: false,
          saving: false,
        };
      });
      setTeamStates(states);
    }).catch(() => {
      message.error('Error al cargar equipos');
    }).finally(() => setLoading(false));
  }, []);

  const updateField = (teamId: string, field: keyof TeamState, value: any) => {
    setTeamStates((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value, dirty: true },
    }));
  };

  const handleSave = async (teamId: string) => {
    const state = teamStates[teamId];
    setTeamStates((prev) => ({ ...prev, [teamId]: { ...prev[teamId], saving: true } }));
    try {
      await adminApi.setTeamGroupResult(teamId, {
        realFinalPosition: state.realFinalPosition ?? undefined,
        realClassified: state.realClassified,
        realBestThird: state.realBestThird,
      });
      setTeamStates((prev) => ({
        ...prev,
        [teamId]: { ...prev[teamId], dirty: false, saving: false },
      }));
      message.success('Guardado');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
      setTeamStates((prev) => ({ ...prev, [teamId]: { ...prev[teamId], saving: false } }));
    }
  };

  const getGroupTeams = (groupKey: string) =>
    teams.filter((t) => t.groupKey === groupKey);

  return (
    <div>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Ingresa las posiciones finales reales de cada grupo una vez terminada la fase de grupos.
      </Typography.Text>

      <Row gutter={[16, 16]}>
        {GROUPS.map((group) => (
          <Col xs={24} md={12} xl={8} key={group}>
            <Card
              title={`Grupo ${group}`}
              size="small"
              loading={loading}
            >
              {getGroupTeams(group).map((team) => {
                const state = teamStates[team.id];
                if (!state) return null;
                return (
                  <div
                    key={team.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography.Text strong style={{ minWidth: 100 }}>
                      {team.flagUrl} {team.name}
                    </Typography.Text>

                    <Select
                      value={state.realFinalPosition}
                      onChange={(v) => updateField(team.id, 'realFinalPosition', v)}
                      options={POSITIONS}
                      placeholder="Pos."
                      allowClear
                      size="small"
                      style={{ width: 80 }}
                    />

                    <Space size="small">
                      <Switch
                        checked={state.realClassified}
                        onChange={(v) => updateField(team.id, 'realClassified', v)}
                        size="small"
                      />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>Clasif.</Typography.Text>
                    </Space>

                    <Space size="small">
                      <Switch
                        checked={state.realBestThird}
                        onChange={(v) => updateField(team.id, 'realBestThird', v)}
                        size="small"
                      />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>Mejor 3ro</Typography.Text>
                    </Space>

                    {state.dirty ? (
                      <Button
                        type="primary"
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={() => handleSave(team.id)}
                        loading={state.saving}
                      >
                        Guardar
                      </Button>
                    ) : state.realFinalPosition ? (
                      <Tag color="green" icon={<CheckCircleOutlined />}>OK</Tag>
                    ) : null}
                  </div>
                );
              })}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
