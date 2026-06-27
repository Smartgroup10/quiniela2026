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
import { useAuthStore } from '../stores/authStore';
import AdminDashboardTab from './admin/AdminDashboardTab';
import AdminMatchesTab from './admin/AdminMatchesTab';
import AdminGroupsTab from './admin/AdminGroupsTab';
import AdminBonusTab from './admin/AdminBonusTab';
import AdminScoringTab from './admin/AdminScoringTab';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminPhase2LabTab from './admin/AdminPhase2LabTab';

const SUPER_ADMIN_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: 'groups',    label: 'Grupos',     icon: <TeamOutlined /> },
  { key: 'phase2lab', label: 'Lab Fase 2', icon: <TrophyOutlined /> },
];

const COMMON_TABS = [
  { key: 'matches',   label: 'Partidos',   icon: <TrophyOutlined /> },
  { key: 'bonus',     label: 'Bonus',       icon: <StarOutlined /> },
  { key: 'scoring',   label: 'Puntuacion',  icon: <SettingOutlined /> },
  { key: 'users',     label: 'Usuarios',    icon: <UserOutlined /> },
];

export default function Admin() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'ADMIN';
  const tabs = isSuperAdmin ? [...SUPER_ADMIN_TABS, ...COMMON_TABS] : COMMON_TABS;
  const [activeTab, setActiveTab] = useState(tabs[0].key);

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        items={tabs}
      />
      <div style={{ marginTop: 16 }}>
        {isSuperAdmin && (
          <>
            <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}><AdminDashboardTab /></div>
            <div style={{ display: activeTab === 'groups'    ? 'block' : 'none' }}><AdminGroupsTab /></div>
            <div style={{ display: activeTab === 'phase2lab' ? 'block' : 'none' }}><AdminPhase2LabTab /></div>
          </>
        )}
        <div style={{ display: activeTab === 'matches'   ? 'block' : 'none' }}><AdminMatchesTab /></div>
        <div style={{ display: activeTab === 'bonus'     ? 'block' : 'none' }}><AdminBonusTab /></div>
        <div style={{ display: activeTab === 'scoring'   ? 'block' : 'none' }}><AdminScoringTab /></div>
        <div style={{ display: activeTab === 'users'     ? 'block' : 'none' }}><AdminUsersTab /></div>
      </div>
    </div>
  );
}
