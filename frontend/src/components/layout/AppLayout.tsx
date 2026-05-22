import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Avatar, Dropdown } from 'antd';
import {
  HomeOutlined,
  TrophyOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import ChangePasswordModal from '../ChangePasswordModal';
import { useAuthStore } from '../../stores/authStore';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Inicio' },
    { key: '/phase1', icon: <TrophyOutlined />, label: 'Fase 1' },
    { key: '/leaderboard', icon: <OrderedListOutlined />, label: 'Ranking' },
    ...(user?.role === 'ADMIN' ? [{ key: '/admin', icon: <SettingOutlined />, label: 'Admin' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Mi perfil', onClick: () => navigate('/profile') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesion', onClick: handleLogout, danger: true },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={0}
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ background: '#111111' }}
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Typography.Title level={4} style={{ color: '#fff', margin: 0, fontSize: collapsed ? 14 : 16 }}>
            {collapsed ? 'Q' : 'Quiniela 2026'}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: '#111111', borderRight: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#1A1A1A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar style={{ backgroundColor: '#E63946' }}>
                {(user?.alias || user?.name || '?')[0].toUpperCase()}
              </Avatar>
              <span style={{ fontWeight: 500, color: '#F1FAEE' }}>{user?.alias || user?.name}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
      <ChangePasswordModal />
    </Layout>
  );
}
