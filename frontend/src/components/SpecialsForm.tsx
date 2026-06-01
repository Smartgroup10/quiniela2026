import { useEffect, useState } from 'react';
import { Form, Select, Input, Button, Card, Row, Col, message, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { SpecialPrediction } from '../api/predictions';
import { predictionsApi } from '../api/predictions';
import { useTournamentStore } from '../stores/tournamentStore';

function PointLabel({ text, pts }: { text: string; pts?: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {text}
      {pts != null && pts > 0 && (
        <span style={{
          background: '#2DC653', color: '#fff', fontSize: 11,
          fontWeight: 700, padding: '1px 6px', borderRadius: 4,
        }}>+{pts}</span>
      )}
    </span>
  );
}

interface Props {
  teams: Team[];
  specials: SpecialPrediction | null;
  disabled: boolean;
  onSaved: () => void;
}

export default function SpecialsForm({ teams, specials, disabled, onSaved }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const sc = useTournamentStore((s) => s.scoringConfig);

  useEffect(() => {
    if (specials) {
      form.setFieldsValue({
        championTeamId: specials.championTeamId,
        runnerUpTeamId: specials.runnerUpTeamId,
        thirdTeamId: specials.thirdTeamId,
        topScorerName: specials.topScorerName,
        mvpName: specials.mvpName,
        revelationTeamId: specials.revelationTeamId,
      });
    }
  }, [specials]);

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: `${t.flagUrl || ''} ${t.name}`,
  }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      await predictionsApi.saveSpecials(values);
      message.success('Bonus guardados');
      onSaved();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <span>
          <TrophyOutlined style={{ marginRight: 8 }} />
          Bonus iniciales — Fase 1
        </span>
      }
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Estos pronosticos se bloquean al arrancar el Mundial.
      </Typography.Text>
      <Form form={form} layout="vertical" disabled={disabled}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="championTeamId" label={<PointLabel text={`Campeon (${sc?.champion ?? 10} pts)`} pts={specials?.championPoints} />}>
              <Select
                placeholder="Selecciona campeon"
                options={teamOptions}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="runnerUpTeamId" label={<PointLabel text={`Subcampeon (${sc?.runnerUp ?? 6} pts)`} pts={specials?.runnerUpPoints} />}>
              <Select
                placeholder="Selecciona subcampeon"
                options={teamOptions}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="thirdTeamId" label={<PointLabel text={`Tercer puesto (${sc?.third ?? 4} pts)`} pts={specials?.thirdPoints} />}>
              <Select
                placeholder="Selecciona 3er puesto"
                options={teamOptions}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="topScorerName" label={<PointLabel text={`Maximo goleador (${sc?.topScorer ?? 5} pts)`} pts={specials?.topScorerPoints} />}>
              <Input placeholder="Nombre del jugador" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="mvpName" label={<PointLabel text={`MVP (${sc?.mvp ?? 3} pts)`} pts={specials?.mvpPoints} />}>
              <Input placeholder="Nombre del jugador" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="revelationTeamId" label={<PointLabel text={`Equipo revelacion (${sc?.revelation ?? 3} pts)`} pts={specials?.revelationPoints} />}>
              <Select
                placeholder="Selecciona equipo"
                options={teamOptions}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        {!disabled && (
          <Button type="primary" onClick={handleSave} loading={loading}>
            Guardar bonus
          </Button>
        )}
      </Form>
    </Card>
  );
}
