import { useEffect, useState } from 'react';
import { Alert, Card, Row, Col, Typography, Progress, Statistic, Tag, Avatar, Spin } from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTournamentStore } from '../stores/tournamentStore';
import { dashboardApi, type DashboardData } from '../api/dashboard';
import TeamFlag from '../components/TeamFlag';
import { intervalToDuration, formatDuration, format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  SETUP: { text: 'Configurando', color: 'default' },
  PHASE1_OPEN: { text: 'Fase 1 Abierta', color: 'green' },
  PHASE1_CLOSED: { text: 'Fase 1 Cerrada', color: 'orange' },
  PHASE2_OPEN: { text: 'Fase 2 Abierta', color: 'blue' },
  PHASE2_CLOSED: { text: 'Fase 2 Cerrada', color: 'orange' },
  FINISHED: { text: 'Finalizado', color: 'red' },
};

const POINT_CATEGORIES = [
  { key: 'matchPoints', label: 'Partidos', color: '#E63946' },
  { key: 'groupPoints', label: 'Posiciones Grupo', color: '#457B9D' },
  { key: 'bestThirdPoints', label: 'Mejores Terceros', color: '#2DC653' },
  { key: 'bonusPhase1Points', label: 'Bonus Fase 1', color: '#F4A261' },
  { key: 'knockoutPoints', label: 'Eliminatorias', color: '#A8DADC' },
  { key: 'bonusPhase2Points', label: 'Bonus Fase 2', color: '#9B59B6' },
];

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { setTournament } = useTournamentStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then((res) => {
      setData(res.data);
      if (res.data.tournament && res.data.scoringConfig) {
        setTournament(res.data.tournament, res.data.scoringConfig);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data?.tournament) return;
    const t = data.tournament;
    const target = t.status === 'PHASE1_OPEN'
      ? new Date(t.phase1ClosesAt)
      : t.phase2ClosesAt
        ? new Date(t.phase2ClosesAt)
        : null;

    if (!target) return;

    const tick = () => {
      const now = new Date();
      if (now >= target) { setCountdown('Cerrado'); return; }
      const duration = intervalToDuration({ start: now, end: target });
      setCountdown(formatDuration(duration, { locale: es, delimiter: ', ' }));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data?.tournament]);

  if (loading || !data) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  const status = data.tournament
    ? STATUS_LABELS[data.tournament.status] || STATUS_LABELS.SETUP
    : STATUS_LABELS.SETUP;

  const maxPoints = data.miniLeaderboard[0]?.totalPoints || 1;
  const alerts = data.alerts;
  const isPhase1Open = data.tournament?.status === 'PHASE1_OPEN';
  const showAlerts = isPhase1Open && (alerts.missingPredictions > 0 || alerts.missingSpecials);

  return (
    <div>
      <Typography.Title level={3}>
        Bienvenido, {user?.alias || user?.name}
      </Typography.Title>

      {/* Alertas de predicciones pendientes */}
      {showAlerts && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.missingPredictions > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={
                <span>
                  Te faltan <strong>{alerts.missingPredictions}</strong> predicciones de partidos.{' '}
                  {alerts.incompleteGroups.length > 0 && (
                    <>
                      Grupos incompletos:{' '}
                      {alerts.incompleteGroups.map((g, i) => (
                        <Tag key={g.group} color="orange" style={{ margin: '0 2px' }}>
                          {g.group} ({g.missing})
                        </Tag>
                      ))}
                    </>
                  )}
                  {' '}<Link to="/phase1">Completar predicciones</Link>
                </span>
              }
            />
          )}
          {alerts.missingSpecials && (
            <Alert
              type="info"
              showIcon
              message={
                <span>
                  No has completado tus predicciones especiales (campeon, goleador, MVP...).{' '}
                  <Link to="/phase1">Ir a Fase 1</Link>
                </span>
              }
            />
          )}
        </div>
      )}

      {/* ROW 1: Stats principales */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Estado del Torneo"
              value={status.text}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#E63946' }}
            />
            <Tag color={status.color} style={{ marginTop: 8 }}>{status.text}</Tag>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Tiempo restante"
              value={countdown || 'N/A'}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#457B9D', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Mi Posicion"
              value={data.userRank > 0 ? `#${data.userRank}` : '-'}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#E63946' }}
              suffix={<span style={{ fontSize: 14, color: '#A8A8A8' }}>de {data.totalPlayers}</span>}
            />
            <div style={{ marginTop: 4, color: '#A8A8A8' }}>
              {user?.totalPoints || 0} puntos
            </div>
          </Card>
        </Col>
      </Row>

      {/* ROW 2: Leaderboard + Progreso */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={<span><CrownOutlined style={{ marginRight: 8 }} />Top 5 Ranking</span>}
            size="small"
          >
            {data.miniLeaderboard.map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px',
                  borderBottom: index < data.miniLeaderboard.length - 1 ? '1px solid #2D2D2D' : 'none',
                  background: entry.id === user?.id ? 'rgba(230,57,70,0.1)' : 'transparent',
                  borderRadius: 4,
                }}
              >
                <span style={{
                  fontWeight: 700,
                  fontSize: 16,
                  minWidth: 24,
                  color: index < 3 ? '#E63946' : '#A8A8A8',
                }}>
                  {index + 1}
                </span>
                <Avatar style={{ backgroundColor: '#E63946' }} size="small">
                  {(entry.alias || entry.name)[0].toUpperCase()}
                </Avatar>
                <span style={{ flex: 1, fontWeight: entry.id === user?.id ? 700 : 400 }}>
                  {entry.alias || entry.name}
                  {entry.id === user?.id && (
                    <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>Tu</Tag>
                  )}
                </span>
                <span style={{ fontWeight: 700, color: '#E63946', fontSize: 16 }}>
                  {entry.totalPoints}
                </span>
              </div>
            ))}

            {/* Si el usuario no esta en top 5, mostrar su posicion */}
            {!data.userInTop5 && data.currentUser && (
              <>
                <div style={{ textAlign: 'center', color: '#A8A8A8', padding: '4px 0', fontSize: 12 }}>
                  ...
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px',
                  background: 'rgba(230,57,70,0.1)',
                  borderRadius: 4,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 16, minWidth: 24, color: '#A8A8A8' }}>
                    {data.userRank}
                  </span>
                  <Avatar style={{ backgroundColor: '#E63946' }} size="small">
                    {(user?.alias || user?.name || '?')[0].toUpperCase()}
                  </Avatar>
                  <span style={{ flex: 1, fontWeight: 700 }}>
                    {user?.alias || user?.name}
                    <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>Tu</Tag>
                  </span>
                  <span style={{ fontWeight: 700, color: '#E63946', fontSize: 16 }}>
                    {data.currentUser.totalPoints}
                  </span>
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Mi Progreso" size="small">
            <Typography.Text type="secondary">Partidos predichos</Typography.Text>
            <Progress
              percent={Math.round(
                (data.predictionProgress.matchPredictions / (data.predictionProgress.totalGroupMatches || 1)) * 100,
              )}
              format={() =>
                `${data.predictionProgress.matchPredictions}/${data.predictionProgress.totalGroupMatches}`
              }
              strokeColor="#E63946"
              style={{ marginBottom: 16 }}
            />

            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Desglose de puntos
            </Typography.Text>

            {POINT_CATEGORIES.map((cat) => {
              const pts = (user as any)?.[cat.key] || 0;
              return (
                <div key={cat.key} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Typography.Text style={{ fontSize: 12 }}>{cat.label}</Typography.Text>
                    <Typography.Text strong style={{ fontSize: 12 }}>{pts} pts</Typography.Text>
                  </div>
                  <Progress
                    percent={maxPoints > 0 ? Math.round((pts / maxPoints) * 100) : 0}
                    showInfo={false}
                    strokeColor={cat.color}
                    trailColor="#2D2D2D"
                    size="small"
                  />
                </div>
              );
            })}
          </Card>
        </Col>
      </Row>

      {/* ROW 3: Proximos partidos + Resultados recientes */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card
            title={<span><CalendarOutlined style={{ marginRight: 8 }} />Proximos Partidos</span>}
            size="small"
          >
            {data.upcomingMatches.length === 0 ? (
              <Typography.Text type="secondary">No hay partidos programados</Typography.Text>
            ) : (
              data.upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid #2D2D2D',
                  }}
                >
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: 'flex-end',
                  }}>
                    <span style={{ fontSize: 13 }}>{match.homeTeam?.name || '?'}</span>
                    {match.homeTeam && <TeamFlag code={match.homeTeam.code} size={18} />}
                  </div>
                  <Tag style={{ margin: 0, fontSize: 11 }}>
                    {format(new Date(match.kickoffAt), 'dd MMM HH:mm', { locale: es })}
                  </Tag>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    {match.awayTeam && <TeamFlag code={match.awayTeam.code} size={18} />}
                    <span style={{ fontSize: 13 }}>{match.awayTeam?.name || '?'}</span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={<span><CheckCircleOutlined style={{ marginRight: 8 }} />Resultados Recientes</span>}
            size="small"
          >
            {data.recentResults.length === 0 ? (
              <Typography.Text type="secondary">No hay resultados aun</Typography.Text>
            ) : (
              data.recentResults.map((match) => {
                const pred = match.myPrediction;
                return (
                  <div
                    key={match.id}
                    style={{ padding: '8px 0', borderBottom: '1px solid #2D2D2D' }}
                  >
                    {/* Resultado real */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        justifyContent: 'flex-end',
                      }}>
                        <span style={{ fontSize: 13 }}>{match.homeTeam?.name || '?'}</span>
                        {match.homeTeam && <TeamFlag code={match.homeTeam.code} size={18} />}
                      </div>
                      <Tag
                        color="red"
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: 14,
                          minWidth: 50,
                          textAlign: 'center',
                        }}
                      >
                        {match.homeGoals} - {match.awayGoals}
                      </Tag>
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        {match.awayTeam && <TeamFlag code={match.awayTeam.code} size={18} />}
                        <span style={{ fontSize: 13 }}>{match.awayTeam?.name || '?'}</span>
                      </div>
                    </div>

                    {/* Prediccion del usuario */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 4,
                    }}>
                      {pred ? (
                        <>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            Tu: {pred.homeGoals}-{pred.awayGoals}
                          </Typography.Text>
                          <Tag
                            color={
                              pred.pointsEarned >= 3 ? 'gold'
                              : pred.pointsEarned >= 1 ? 'green'
                              : 'default'
                            }
                            style={{ fontSize: 10, margin: 0 }}
                          >
                            +{pred.pointsEarned} pts
                          </Tag>
                        </>
                      ) : (
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                          Sin prediccion
                        </Typography.Text>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
