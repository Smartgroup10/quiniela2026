import { useState } from 'react';
import { Modal, Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export default function ChangePasswordModal() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { user, setUser } = useAuthStore();

  const visible = user?.mustChangePassword === true;

  const onFinish = async (values: { currentPassword: string; newPassword: string }) => {
    setLoading(true);
    try {
      await authApi.changePassword(values);
      message.success('Contrasena actualizada correctamente');
      if (user) setUser({ ...user, mustChangePassword: false });
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
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Tu cuenta fue creada con una contrasena temporal. Debes cambiarla antes de continuar.
      </Typography.Paragraph>
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
