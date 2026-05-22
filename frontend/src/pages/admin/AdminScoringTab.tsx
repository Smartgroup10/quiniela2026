import { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Alert, Row, Col, Typography, Divider } from 'antd';
import { SaveOutlined, LockOutlined } from '@ant-design/icons';
import { tournamentApi, type ScoringConfig } from '../../api/tournament';

const SECTIONS = [
  {
    title: 'Partidos (marcador)',
    fields: [
      { name: 'matchExactScore', label: 'Resultado exacto' },
      { name: 'matchCorrectResult', label: 'Resultado correcto (1X2)' },
    ],
  },
  {
    title: 'Posiciones de grupo',
    fields: [
      { name: 'groupExactPosition', label: 'Posicion exacta' },
      { name: 'groupClassifiedOtherPos', label: 'Clasificado en otra posicion' },
    ],
  },
  {
    title: 'Mejores terceros',
    fields: [
      { name: 'bestThirdCorrect', label: 'Acierto mejor tercero' },
    ],
  },
  {
    title: 'Eliminatorias',
    fields: [
      { name: 'knockoutWinner', label: 'Ganador correcto' },
      { name: 'knockoutExactScore', label: 'Marcador exacto' },
      { name: 'knockoutPenalties', label: 'Bonus penales' },
    ],
  },
  {
    title: 'Bonus Fase 1',
    fields: [
      { name: 'champion', label: 'Campeon' },
      { name: 'runnerUp', label: 'Subcampeon' },
      { name: 'third', label: 'Tercer puesto' },
      { name: 'topScorer', label: 'Maximo goleador' },
      { name: 'mvp', label: 'MVP' },
      { name: 'revelation', label: 'Equipo revelacion' },
    ],
  },
  {
    title: 'Bonus Fase 2',
    fields: [
      { name: 'championPhase2', label: 'Campeon (prediccion Fase 2)' },
    ],
  },
];

export default function AdminScoringTab() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    tournamentApi.get().then(({ data }) => {
      setConfig(data.scoringConfig);
      form.setFieldsValue(data.scoringConfig);
    }).catch(() => {
      message.error('Error al cargar configuracion');
    }).finally(() => setLoading(false));
  }, []);

  const isLocked = !!config?.lockedAt;

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      await tournamentApi.updateScoring(values);
      message.success('Configuracion guardada');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {isLocked && (
        <Alert
          type="warning"
          icon={<LockOutlined />}
          message="Configuracion congelada"
          description={`La configuracion se congelo el ${new Date(config!.lockedAt!).toLocaleDateString('es-ES')} al cerrar la Fase 1. No se puede modificar.`}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card loading={loading}>
        <Form form={form} layout="vertical" disabled={isLocked}>
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <Typography.Title level={5}>{section.title}</Typography.Title>
              <Row gutter={16}>
                {section.fields.map((field) => (
                  <Col xs={12} md={8} lg={6} key={field.name}>
                    <Form.Item name={field.name} label={field.label}>
                      <InputNumber min={0} max={50} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
              <Divider />
            </div>
          ))}

          {!isLocked && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              size="large"
            >
              Guardar configuracion
            </Button>
          )}
        </Form>
      </Card>
    </div>
  );
}
