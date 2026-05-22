import { Card, Typography, Descriptions, Tag } from 'antd';
import { useAuthStore } from '../stores/authStore';

export default function Profile() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div>
      <Typography.Title level={3}>Mi Perfil</Typography.Title>
      <Card>
        <Descriptions column={{ xs: 1, md: 2 }} bordered>
          <Descriptions.Item label="Nombre">{user.name}</Descriptions.Item>
          <Descriptions.Item label="Alias">{user.alias || '--'}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Rol">
            <Tag color={user.role === 'ADMIN' ? 'red' : 'blue'}>{user.role}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Fase 1">
            {user.phase1Available ? <Tag color="green">Disponible</Tag> : <Tag color="orange">Cerrada</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Fase 2">
            {user.phase2Available ? <Tag color="green">Disponible</Tag> : <Tag color="orange">Cerrada</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Puntos totales" span={2}>
            <strong style={{ fontSize: 18, color: '#E63946' }}>{user.totalPoints} pts</strong>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
