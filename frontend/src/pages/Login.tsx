import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      login(data.token, data.user);
      message.success('Bienvenido!');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al iniciar sesion');
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
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
    }}>
      <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', background: '#1A1A1A', border: '1px solid #2D2D2D' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Typography.Title level={2} style={{ margin: 0, color: '#F1FAEE' }}>
              Quiniela Mundial 2026
            </Typography.Title>
            <Typography.Text type="secondary">Inicia sesion para jugar</Typography.Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} autoComplete="off" style={{ textAlign: 'left' }}>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email valido requerido' }]}>
              <Input prefix={<MailOutlined />} placeholder="Correo electronico" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Contrasena requerida' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Contrasena" size="large" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Entrar
              </Button>
            </Form.Item>
          </Form>
          <Typography.Text>
            No tienes cuenta? <Link to="/register">Registrate</Link>
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
