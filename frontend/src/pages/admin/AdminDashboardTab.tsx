import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Button, Modal, message, Space, Typography, Divider } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CloudDownloadOutlined,
  LockOutlined,
  UnlockOutlined,
  TrophyOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { adminApi, type AdminStats, type SyncResult } from '../../api/admin';
import { tournamentApi, type Tournament, type ScoringConfig } from '../../api/tournament';
import { useTournamentStore } from '../../stores/tournamentStore';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SETUP:          { label: 'Configuracion',   color: 'default' },
  PHASE1_OPEN:    { label: 'Fase 1 Abierta',  color: 'green' },
  PHASE1_CLOSED:  { label: 'Fase 1 Cerrada',  color: 'orange' },
  PHASE2_OPEN:    { label: 'Fase 2 Abierta',  color: 'blue' },
  PHASE2_CLOSED:  { label: 'Fase 2 Cerrada',  color: 'orange' },
  FINISHED:       { label: 'Finalizado',       color: 'red' },
};

const TRANSITIONS: Record<string, { label: string; warning: string; action: () => Promise<any> }> = {
  SETUP: {
    label: 'Abrir Fase 1',
    warning: 'Se abriran las predicciones de Fase 1 para todos los usuarios. Las fechas de apertura/cierre se estableceran.',
    action: () => tournamentApi.update({ status: 'PHASE1_OPEN' } as any),
  },
  PHASE1_OPEN: {
    label: 'Cerrar Fase 1',
    warning: 'Se cerraran las predicciones de Fase 1 y se congelara la configuracion de puntuacion. Esta accion es IRREVERSIBLE.',
    action: () => adminApi.closePhase1(),
  },
  PHASE1_CLOSED: {
    label: 'Abrir Fase 2',
    warning: 'Se abriran las predicciones de eliminatorias (Fase 2).',
    action: () => adminApi.openPhase2(),
  },
  PHASE2_OPEN: {
    label: 'Cerrar Fase 2',
    warning: 'Se cerraran las predicciones de eliminatorias. Esta accion es IRREVERSIBLE.',
    action: () => adminApi.closePhase2(),
  },
  PHASE2_CLOSED: {
    label: 'Finalizar Torneo',
    warning: 'El torneo se marcara como FINALIZADO. Asegurate de haber cargado todos los resultados y recalculado los puntos.',
    action: () => tournamentApi.update({ status: 'FINISHED' } as any),
  },
};

export default function AdminDashboardTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tournament, setTournamentLocal] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [togglingBonus, setTogglingBonus] = useState(false);
  const setTournament = useTournamentStore((s) => s.setTournament);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, tournamentRes] = await Promise.all([
        adminApi.getStats(),
        tournamentApi.get(),
      ]);
      setStats(statsRes.data);
      setTournamentLocal(tournamentRes.data.tournament);
      setTournament(tournamentRes.data.tournament, tournamentRes.data.scoringConfig, tournamentRes.data.predictionLockBypassUntil);
    } catch {
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleTransition = () => {
    if (!tournament) return;
    const transition = TRANSITIONS[tournament.status];
    if (!transition) return;

    Modal.confirm({
      title: transition.label,
      icon: <ExclamationCircleOutlined />,
      content: transition.warning,
      okText: 'Confirmar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        setTransitioning(true);
        try {
          await transition.action();
          message.success(`${transition.label}: completado`);
          await fetchData();
        } catch (err: any) {
          message.error(err.response?.data?.error || 'Error en la transicion');
        } finally {
          setTransitioning(false);
        }
      },
    });
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data } = await adminApi.recalculate();
      message.success(`Puntos recalculados para ${data.usersRecalculated} usuarios`);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al recalcular');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await adminApi.syncResults();
      setLastSync(data);
      if (data.matchesUpdated > 0) {
        message.success(`${data.matchesUpdated} partidos actualizados y puntos recalculados`);
      } else {
        message.info('No hay resultados nuevos para sincronizar');
      }
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al sincronizar con API de futbol');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleBonusLock = async () => {
    setTogglingBonus(true);
    try {
      const { data } = await adminApi.toggleBonusLock();
      setTournamentLocal((prev) => prev ? { ...prev, bonusPhase1Locked: data.bonusPhase1Locked } : prev);
      message.success(data.bonusPhase1Locked ? 'Bonus Fase 1 bloqueados' : 'Bonus Fase 1 desbloqueados');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al cambiar bloqueo de bonus');
    } finally {
      setTogglingBonus(false);
    }
  };

  const [generatingBracket, setGeneratingBracket] = useState(false);
  const handleGenerateBracket = (withTestData: boolean) => {
    Modal.confirm({
      title: withTestData ? 'Generar bracket de pruebas' : 'Generar bracket de eliminatorias',
      content: withTestData
        ? 'Crea 32 partidos KO con equipos asignados a partir del orden alfabetico dentro de cada grupo. Borra los partidos KO existentes y sus predicciones. Solo para QA.'
        : 'Crea 32 partidos KO. Si los equipos clasificados ya estan marcados en BD, se asignan al R32. Borra los partidos KO existentes y sus predicciones.',
      okText: withTestData ? 'Generar (test)' : 'Generar',
      okType: 'danger',
      onOk: async () => {
        setGeneratingBracket(true);
        try {
          const { data } = await adminApi.generateKnockoutBracket({ withTestData });
          message.success(`${data.created} partidos creados (${data.teamsAssigned} equipos asignados a R32). ${data.deleted ? `${data.deleted} partidos KO previos borrados.` : ''}`);
        } catch (err: any) {
          message.error(err.response?.data?.error || 'Error al generar bracket');
        } finally {
          setGeneratingBracket(false);
        }
      },
    });
  };

  const statusCfg = tournament ? STATUS_CONFIG[tournament.status] : null;
  const transition = tournament ? TRANSITIONS[tournament.status] : null;

  return (
    <div>
      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Usuarios" value={stats?.totalUsers ?? 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Pred. Partidos" value={stats?.totalMatchPredictions ?? 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Pred. Grupos" value={stats?.totalPredictions ?? 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}>
            <Statistic title="Pred. Especiales" value={stats?.totalSpecials ?? 0} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Estado del torneo + acciones */}
      <Card loading={loading}>
        <Typography.Title level={4} style={{ margin: 0, marginBottom: 16 }}>Estado del Torneo</Typography.Title>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Typography.Text strong>Estado actual:</Typography.Text>
          {statusCfg && <Tag color={statusCfg.color} style={{ fontSize: 14, padding: '4px 12px' }}>{statusCfg.label}</Tag>}
        </div>

        <Divider />

        <Space size="middle" wrap>
          {transition && (
            <Button
              type="primary"
              danger
              size="large"
              onClick={handleTransition}
              loading={transitioning}
              icon={<ThunderboltOutlined />}
            >
              {transition.label}
            </Button>
          )}

          {tournament?.status === 'FINISHED' && (
            <Typography.Text type="success" strong>Torneo finalizado</Typography.Text>
          )}

          <Button
            size="large"
            onClick={handleRecalculate}
            loading={recalculating}
            icon={<ReloadOutlined />}
          >
            Recalcular Puntos
          </Button>

          <Button
            size="large"
            type={tournament?.bonusPhase1Locked ? 'primary' : 'default'}
            danger={!!tournament?.bonusPhase1Locked}
            onClick={handleToggleBonusLock}
            loading={togglingBonus}
            icon={tournament?.bonusPhase1Locked ? <LockOutlined /> : <UnlockOutlined />}
          >
            {tournament?.bonusPhase1Locked ? 'Bonus Bloqueados' : 'Bloquear Bonus F1'}
          </Button>

          <Button
            size="large"
            type="default"
            onClick={handleSync}
            loading={syncing}
            icon={<CloudDownloadOutlined />}
          >
            Sincronizar Resultados
          </Button>

          <Button
            size="large"
            type="default"
            onClick={() => handleGenerateBracket(false)}
            loading={generatingBracket}
            icon={<TrophyOutlined />}
          >
            Generar Bracket Fase 2
          </Button>

          <Button
            size="large"
            type="dashed"
            onClick={() => handleGenerateBracket(true)}
            loading={generatingBracket}
            icon={<ExperimentOutlined />}
          >
            Generar Bracket (test)
          </Button>
        </Space>

        {lastSync && (
          <div style={{ marginTop: 12 }}>
            <Tag color="blue">Revisados: {lastSync.matchesChecked}</Tag>
            <Tag color="green">Actualizados: {lastSync.matchesUpdated}</Tag>
            <Tag color="default">Sin cambios: {lastSync.matchesSkipped}</Tag>
          </div>
        )}
      </Card>
    </div>
  );
}
