import { useState, useEffect } from 'react';
import { Card, Table, Typography, Button, Modal, Form, Input, message, Tag, Space, Popconfirm, Select } from 'antd';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, CopyOutlined, UserAddOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { leaguesApi, type League, type LeagueMember } from '../../api/leagues';
import { adminApi, type AdminUser } from '../../api/admin';

export default function AdminLeaguesTab() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  // Detail view state
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const { data } = await leaguesApi.adminGetLeagues();
      setLeagues(data);
    } catch {
      message.error('Error al cargar ligas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeagues(); }, []);

  const handleCreate = async (values: { name: string }) => {
    setCreating(true);
    try {
      const { data } = await leaguesApi.adminCreateLeague(values.name);
      message.success(`Liga "${data.name}" creada — Codigo: ${data.code}`);
      form.resetFields();
      setCreateModalOpen(false);
      fetchLeagues();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al crear liga');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await leaguesApi.adminDeleteLeague(id);
      message.success('Liga eliminada');
      setLeagues((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success('Codigo copiado');
  };

  // Detail view
  const openDetail = async (league: League) => {
    setSelectedLeague(league);
    setMembersLoading(true);
    try {
      const { data } = await leaguesApi.adminGetMembers(league.id);
      setMembers(data);
    } catch {
      message.error('Error al cargar miembros');
    } finally {
      setMembersLoading(false);
    }
  };

  const openAddMember = async () => {
    setAddMemberModalOpen(true);
    try {
      const { data } = await adminApi.getUsers();
      setAllUsers(data);
    } catch {
      message.error('Error al cargar usuarios');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !selectedLeague) return;
    try {
      await leaguesApi.adminAddMember(selectedLeague.id, selectedUserId);
      message.success('Usuario agregado');
      setAddMemberModalOpen(false);
      setSelectedUserId(null);
      openDetail(selectedLeague);
      fetchLeagues();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al agregar');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedLeague) return;
    try {
      await leaguesApi.adminRemoveMember(selectedLeague.id, userId);
      message.success('Usuario removido');
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      fetchLeagues();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al remover');
    }
  };

  // Detail view: members of a league
  if (selectedLeague) {
    const memberColumns = [
      {
        title: 'Nombre',
        key: 'name',
        render: (_: any, r: LeagueMember) => (
          <span>{r.name} {r.alias ? <Typography.Text type="secondary">({r.alias})</Typography.Text> : null}</span>
        ),
      },
      { title: 'Email', dataIndex: 'email', key: 'email' },
      {
        title: 'Puntos',
        dataIndex: 'totalPoints',
        key: 'totalPoints',
        width: 80,
        sorter: (a: LeagueMember, b: LeagueMember) => a.totalPoints - b.totalPoints,
        render: (pts: number) => <strong style={{ color: '#D4A93C' }}>{pts}</strong>,
      },
      {
        title: '',
        key: 'actions',
        width: 50,
        render: (_: any, record: LeagueMember) => (
          <Popconfirm
            title="Quitar de la liga"
            description={`Remover a ${record.name} de esta liga?`}
            onConfirm={() => handleRemoveMember(record.id)}
            okText="Remover"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      },
    ];

    const memberIds = new Set(members.map((m) => m.id));
    const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedLeague(null)}>Volver</Button>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {selectedLeague.name}
              <Tag color="gold" style={{ marginLeft: 8 }}>{selectedLeague.code}</Tag>
            </Typography.Title>
          </Space>
          <Button type="primary" icon={<UserAddOutlined />} onClick={openAddMember}>Agregar Miembro</Button>
        </div>
        <Card>
          <Table
            dataSource={members}
            columns={memberColumns}
            rowKey="id"
            loading={membersLoading}
            pagination={false}
            scroll={{ x: 500 }}
          />
        </Card>

        <Modal
          open={addMemberModalOpen}
          title="Agregar Miembro"
          onCancel={() => { setAddMemberModalOpen(false); setSelectedUserId(null); }}
          onOk={handleAddMember}
          okText="Agregar"
          okButtonProps={{ disabled: !selectedUserId }}
        >
          <Select
            showSearch
            placeholder="Buscar usuario..."
            style={{ width: '100%' }}
            value={selectedUserId}
            onChange={setSelectedUserId}
            filterOption={(input, option) =>
              (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableUsers.map((u) => ({
              value: u.id,
              label: `${u.name}${u.alias ? ` (${u.alias})` : ''} — ${u.email}`,
            }))}
          />
        </Modal>
      </div>
    );
  }

  // List view
  const columns = [
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    {
      title: 'Codigo',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Space>
          <Tag color="gold" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>{code}</Tag>
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={(e) => { e.stopPropagation(); copyCode(code); }} />
        </Space>
      ),
    },
    {
      title: 'Miembros',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
      render: (count: number) => <Tag>{count}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: League) => (
        <Popconfirm
          title="Eliminar liga"
          description={`Se eliminara "${record.name}" y todas sus membresías.`}
          onConfirm={() => handleDelete(record.id)}
          okText="Eliminar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Gestion de Ligas</Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchLeagues} loading={loading}>Actualizar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Crear Liga
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={leagues}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 500 }}
          onRow={(record) => ({ onClick: () => openDetail(record), style: { cursor: 'pointer' } })}
        />
      </Card>

      <Modal
        open={createModalOpen}
        title="Crear Nueva Liga"
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="Nombre de la liga"
            rules={[{ required: true, min: 2, message: 'Minimo 2 caracteres' }]}
          >
            <Input placeholder="Ej: Liga Oficina" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating} block size="large">
              Crear Liga
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
