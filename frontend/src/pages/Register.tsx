import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space, Select } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { teamsApi, type Team } from '../api/teams';
import { useAuthStore } from '../stores/authStore';
import AvatarPicker from '../components/AvatarPicker';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    teamsApi.getAll().then(({ data }) => setTeams(data));
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const { data } = await authApi.register({ ...values, avatarUrl });
      login(data.token, data.user);
      message.success('Cuenta creada. Bienvenido!');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
    }}>
      <Card style={{ width: 540, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Typography.Title level={2} style={{ margin: 0, color: '#F1FAEE' }}>
              Quiniela Mundial 2026
            </Typography.Title>
            <Typography.Text type="secondary">Crea tu cuenta</Typography.Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} autoComplete="off" style={{ textAlign: 'left' }}>
            <Form.Item name="name" rules={[{ required: true, message: 'Nombre requerido' }]}>
              <Input prefix={<UserOutlined />} placeholder="Nombre completo" size="large" />
            </Form.Item>
            <Form.Item name="alias">
              <Input placeholder="Alias (opcional)" size="large" />
            </Form.Item>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email valido requerido' }]}>
              <Input prefix={<MailOutlined />} placeholder="Correo electronico" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Minimo 6 caracteres' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Contrasena" size="large" />
            </Form.Item>
            <Form.Item name="favoriteTeamId" label="Equipo favorito (opcional)">
              <Select
                placeholder="Selecciona tu equipo"
                allowClear
                showSearch
                optionFilterProp="label"
                options={teams.map((t) => ({
                  value: t.id,
                  label: `${t.flagUrl || ''} ${t.name}`,
                }))}
              />
            </Form.Item>
            <div style={{ marginBottom: 20 }}>
              <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Registrarme
              </Button>
            </Form.Item>
          </Form>
          <Typography.Text>
            Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
