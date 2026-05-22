import { useState } from 'react';
import { Modal, Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import AvatarPicker from './AvatarPicker';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function ChangePasswordModal() {
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const { isMobile } = useBreakpoint();
  const [form] = Form.useForm();
  const { user, setUser } = useAuthStore();

  const visible = user?.mustChangePassword === true;

  const onFinish = async (values: { currentPassword: string; newPassword: string }) => {
    setLoading(true);
    try {
      const { data } = await authApi.changePassword({ ...values, avatarUrl });
      message.success('Contrasena actualizada correctamente');
      if (data.user) {
        setUser(data.user);
      } else if (user) {
        setUser({ ...user, mustChangePassword: false, ...(avatarUrl ? { avatarUrl } : {}) });
      }
      form.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al cambiar contrasena');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      title="Cambiar Contrasena"
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      width={isMobile ? '95vw' : 560}
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Tu cuenta fue creada con una contrasena temporal. Debes cambiarla antes de continuar.
      </Typography.Paragraph>
      <div style={{ marginBottom: 20 }}>
        <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
      </div>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="currentPassword"
          label="Contrasena temporal"
          rules={[{ required: true, message: 'Ingresa tu contrasena temporal' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Contrasena temporal" size="large" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Nueva contrasena"
          rules={[{ required: true, min: 6, message: 'Minimo 6 caracteres' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nueva contrasena" size="large" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Confirmar contrasena"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Confirma tu contrasena' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('Las contrasenas no coinciden'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirmar contrasena" size="large" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Cambiar Contrasena
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
