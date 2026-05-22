import { useState, useEffect } from 'react';
import { Card, Form, Select, Input, Button, Row, Col, Typography, message, Modal } from 'antd';
import { SaveOutlined, TrophyOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/admin';
import { tournamentApi } from '../../api/tournament';
import { teamsApi, type Team } from '../../api/teams';

export default function AdminBonusTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    Promise.all([
      teamsApi.getAll(),
      tournamentApi.get(),
    ]).then(([teamsRes, tournamentRes]) => {
      setTeams(teamsRes.data);
      const t = tournamentRes.data.tournament;
      form.setFieldsValue({
        realChampionTeamId: t.realChampionTeamId,
        realRunnerUpTeamId: t.realRunnerUpTeamId,
        realThirdTeamId: t.realThirdTeamId,
        realTopScorerName: t.realTopScorerName,
        realMvpName: t.realMvpName,
        realRevelationTeamId: t.realRevelationTeamId,
      });
    }).catch(() => {
      message.error('Error al cargar datos');
    }).finally(() => setLoading(false));
  }, []);

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: `${t.flagUrl || ''} ${t.name}`,
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      await adminApi.setRealBonus(values);
      message.success('Resultados reales guardados');
      Modal.confirm({
        title: 'Recalcular puntos?',
        content: 'Se actualizaran los puntos de todos los usuarios en base a estos resultados.',
        okText: 'Recalcular',
        cancelText: 'Ahora no',
        onOk: async () => {
          const { data } = await adminApi.recalculate();
          message.success(`Puntos recalculados para ${data.usersRecalculated} usuarios`);
        },
      });
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      loading={loading}
      title={
        <span>
          <TrophyOutlined style={{ marginRight: 8 }} />
          Resultados Reales del Torneo
        </span>
      }
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Ingresa los resultados reales para calcular los puntos bonus de los participantes.
      </Typography.Text>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="realChampionTeamId" label="Campeon">
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
            <Form.Item name="realRunnerUpTeamId" label="Subcampeon">
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
            <Form.Item name="realThirdTeamId" label="Tercer puesto">
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
            <Form.Item name="realTopScorerName" label="Maximo goleador">
              <Input placeholder="Nombre del jugador" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="realMvpName" label="MVP">
              <Input placeholder="Nombre del jugador" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="realRevelationTeamId" label="Equipo revelacion">
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

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          size="large"
        >
          Guardar resultados reales
        </Button>
      </Form>
    </Card>
  );
}
