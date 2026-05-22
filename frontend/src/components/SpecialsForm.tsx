import { useEffect, useState } from 'react';
import { Form, Select, Input, Button, Card, Row, Col, message, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { SpecialPrediction } from '../api/predictions';
import { predictionsApi } from '../api/predictions';

interface Props {
  teams: Team[];
  specials: SpecialPrediction | null;
  disabled: boolean;
  onSaved: () => void;
}

export default function SpecialsForm({ teams, specials, disabled, onSaved }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
            <Form.Item name="championTeamId" label="Campeon (10 pts)">
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
            <Form.Item name="runnerUpTeamId" label="Subcampeon (6 pts)">
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
            <Form.Item name="thirdTeamId" label="Tercer puesto (4 pts)">
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
            <Form.Item name="topScorerName" label="Maximo goleador (5 pts)">
              <Input placeholder="Nombre del jugador" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="mvpName" label="MVP (3 pts)">
              <Input placeholder="Nombre del jugador" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="revelationTeamId" label="Equipo revelacion (3 pts)">
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
