import { useState, useEffect } from 'react';
import { Card, Table, Typography, Button, Modal, Form, Input, Select, message, Tag, Space, Alert, Popconfirm } from 'antd';
import { UserAddOutlined, MailOutlined, UserOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminApi, type AdminUser } from '../../api/admin';
import { useAuthStore } from '../../stores/authStore';

export default function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getUsers();
      setUsers(data);
    } catch {
      message.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (values: { name: string; email: string; role?: string }) => {
    setCreating(true);
    try {
      const { data } = await adminApi.createUser(values);
      if (data.emailSent) {
        message.success(`Invitacion enviada a ${values.email}`);
      } else {
        Modal.warning({
          title: 'Usuario creado, pero el email no se pudo enviar',
          content: (
            <div>
              <p>Comunica estas credenciales manualmente:</p>
              <p><strong>Email:</strong> {values.email}</p>
              <p><strong>Contrasena temporal:</strong> <code style={{ color: '#E63946', fontSize: 16 }}>{data.tempPassword}</code></p>
            </div>
          ),
          okText: 'Entendido',
        });
      }
      form.resetFields();
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al crear usuario');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      message.success('Usuario eliminado');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AdminUser) => (
        <span>{name} {record.alias ? <Typography.Text type="secondary">({record.alias})</Typography.Text> : null}</span>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (role: string, record: AdminUser) => (
        <Select
          size="small"
          value={role}
          style={{ width: 140 }}
          disabled={record.id === currentUserId}
          onChange={async (val) => {
            try {
              await adminApi.updateUser(record.id, { role: val });
              setUsers((prev) => prev.map((u) => u.id === record.id ? { ...u, role: val } : u));
              message.success('Rol actualizado');
            } catch { message.error('Error al actualizar rol'); }
          }}
          options={[
            { value: 'PLAYER', label: 'Jugador' },
            { value: 'LEAGUE_ADMIN', label: 'Admin Liga' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      width: 100,
      render: (_: any, record: AdminUser) =>
        record.mustChangePassword
          ? <Tag color="orange">Pendiente</Tag>
          : <Tag color="green">Activo</Tag>,
    },
    {
      title: 'Puntos',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      width: 80,
      sorter: (a: AdminUser, b: AdminUser) => a.totalPoints - b.totalPoints,
      render: (pts: number) => <strong style={{ color: '#E63946' }}>{pts}</strong>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: AdminUser) =>
        record.role === 'PLAYER' || record.role === 'LEAGUE_ADMIN' ? (
          <Popconfirm
            title="Eliminar usuario"
            description={`Se eliminara a ${record.name} y todos sus pronosticos. Esta accion no se puede deshacer.`}
            onConfirm={() => handleDelete(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Gestion de Usuarios</Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>Actualizar</Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setModalOpen(true)}>
            Invitar Usuario
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 700 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title="Invitar Nuevo Usuario"
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Alert
          type="info"
          message="Se creara una cuenta con contrasena temporal y se enviara un email con las credenciales."
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="Nombre completo"
            rules={[{ required: true, min: 2, message: 'Minimo 2 caracteres' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nombre del participante" size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Correo electronico"
            rules={[{ required: true, type: 'email', message: 'Email valido requerido' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="correo@ejemplo.com" size="large" />
          </Form.Item>
          <Form.Item name="role" label="Rol" initialValue="PLAYER">
            <Select size="large" options={[
              { value: 'PLAYER', label: 'Jugador' },
              { value: 'LEAGUE_ADMIN', label: 'Admin de Liga' },
              { value: 'ADMIN', label: 'Administrador' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating} block size="large">
              Crear y Enviar Invitacion
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
