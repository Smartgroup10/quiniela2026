import { useState } from 'react';
import { Tabs } from 'antd';
import {
  DashboardOutlined,
  TrophyOutlined,
  TeamOutlined,
  StarOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import AdminDashboardTab from './admin/AdminDashboardTab';
import AdminMatchesTab from './admin/AdminMatchesTab';
import AdminGroupsTab from './admin/AdminGroupsTab';
import AdminBonusTab from './admin/AdminBonusTab';
import AdminScoringTab from './admin/AdminScoringTab';
import AdminUsersTab from './admin/AdminUsersTab';

const TAB_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: 'matches',   label: 'Partidos',  icon: <TrophyOutlined /> },
  { key: 'groups',    label: 'Grupos',     icon: <TeamOutlined /> },
  { key: 'bonus',     label: 'Bonus',      icon: <StarOutlined /> },
  { key: 'scoring',   label: 'Puntuacion', icon: <SettingOutlined /> },
  { key: 'users',     label: 'Usuarios',   icon: <UserOutlined /> },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        items={TAB_ITEMS}
      />
      <div style={{ marginTop: 16 }}>
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}><AdminDashboardTab /></div>
        <div style={{ display: activeTab === 'matches'   ? 'block' : 'none' }}><AdminMatchesTab /></div>
        <div style={{ display: activeTab === 'groups'    ? 'block' : 'none' }}><AdminGroupsTab /></div>
        <div style={{ display: activeTab === 'bonus'     ? 'block' : 'none' }}><AdminBonusTab /></div>
        <div style={{ display: activeTab === 'scoring'   ? 'block' : 'none' }}><AdminScoringTab /></div>
        <div style={{ display: activeTab === 'users'     ? 'block' : 'none' }}><AdminUsersTab /></div>
      </div>
    </div>
  );
}
