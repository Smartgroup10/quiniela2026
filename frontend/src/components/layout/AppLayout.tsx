import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Dropdown, Button } from 'antd';
import {
  HomeOutlined,
  TrophyOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import ChangePasswordModal from '../ChangePasswordModal';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const { Content } = Layout;

const NAV_ITEMS = [
  { key: '/', icon: <HomeOutlined />, label: 'Inicio' },
  { key: '/phase1', icon: <TrophyOutlined />, label: 'Fase 1' },
  { key: '/leaderboard', icon: <OrderedListOutlined />, label: 'Ranking' },
  { key: '/rules', icon: <FileTextOutlined />, label: 'Reglas' },
];

const ADMIN_NAV = { key: '/admin', icon: <SettingOutlined />, label: 'Administración' };

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Mi perfil', onClick: () => navigate('/profile') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', onClick: handleLogout, danger: true },
    ],
  };

  const initial = (user?.alias || user?.name || '?')[0].toUpperCase();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: (collapsed || isMobile) ? '1fr' : '248px 1fr', minHeight: '100vh', transition: 'grid-template-columns 0.25s ease' }}>
      {/* ============ SIDEBAR ============ */}
      <aside
        style={{
          background: 'var(--bg-1)',
          borderRight: isMobile ? 'none' : '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          padding: collapsed ? '20px 0' : '20px 14px',
          gap: 4,
          ...(isMobile ? {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            zIndex: 100,
            height: '100vh',
            width: collapsed ? 0 : 280,
            boxShadow: collapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.5)',
          } : {
            position: 'sticky' as const,
            top: 0,
            height: '100vh',
            width: collapsed ? 0 : 248,
          }),
          overflow: collapsed ? 'hidden' : 'auto',
          opacity: collapsed ? 0 : 1,
          transition: 'width 0.25s ease, opacity 0.2s ease, padding 0.25s ease',
        }}
      >
        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 8px 20px',
          borderBottom: '1px solid var(--line)',
          marginBottom: 12,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: 9,
            background: 'linear-gradient(135deg, var(--gold) 0%, #8A7230 100%)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 4px 14px -4px rgba(212, 169, 60, 0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            position: 'relative',
            flexShrink: 0,
          }}>
            {/* Inner diamond accent */}
            <div style={{
              position: 'absolute', inset: 4,
              borderRadius: 6,
              border: '1.5px solid rgba(255,255,255,0.4)',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              transform: 'rotate(45deg)',
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <strong style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--fg-0)' }}>
              Quiniela
            </strong>
            <span style={{ fontSize: 11, color: 'var(--fg-2)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>
              2026 · MUNDIAL
            </span>
          </div>
        </div>

        {/* Nav: Principal */}
        <div style={{
          fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase',
          letterSpacing: '0.12em', padding: '8px 10px 4px', fontWeight: 600,
        }}>
          Principal
        </div>

        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.key;
          return (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                color: active ? 'var(--fg-0)' : 'var(--fg-1)',
                fontWeight: 500, fontSize: 14, cursor: 'pointer',
                position: 'relative',
                background: active
                  ? 'linear-gradient(90deg, rgba(212, 169, 60, 0.12), transparent 70%)'
                  : 'transparent',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-2)';
                  e.currentTarget.style.color = 'var(--fg-0)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--fg-1)';
                }
              }}
            >
              {/* Active bar */}
              {active && (
                <div style={{
                  position: 'absolute', left: 0, top: 8, bottom: 8,
                  width: 3, background: 'var(--gold)',
                  borderRadius: '0 3px 3px 0',
                }} />
              )}
              <span style={{ fontSize: 18, opacity: 0.85, display: 'flex' }}>{item.icon}</span>
              {item.label}
            </div>
          );
        })}

        {/* Nav: Sistema (admin) */}
        {user?.role === 'ADMIN' && (
          <>
            <div style={{
              fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase',
              letterSpacing: '0.12em', padding: '8px 10px 4px', fontWeight: 600,
              marginTop: 12,
            }}>
              Sistema
            </div>
            {(() => {
              const active = location.pathname === ADMIN_NAV.key;
              return (
                <div
                  onClick={() => navigate(ADMIN_NAV.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    color: active ? 'var(--fg-0)' : 'var(--fg-1)',
                    fontWeight: 500, fontSize: 14, cursor: 'pointer',
                    position: 'relative',
                    background: active
                      ? 'linear-gradient(90deg, rgba(212, 169, 60, 0.12), transparent 70%)'
                      : 'transparent',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-2)';
                      e.currentTarget.style.color = 'var(--fg-0)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--fg-1)';
                    }
                  }}
                >
                  {active && (
                    <div style={{
                      position: 'absolute', left: 0, top: 8, bottom: 8,
                      width: 3, background: 'var(--gold)',
                      borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <span style={{ fontSize: 18, opacity: 0.85, display: 'flex' }}>{ADMIN_NAV.icon}</span>
                  {ADMIN_NAV.label}
                </div>
              );
            })()}
          </>
        )}

        {/* Footer */}
        <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
          <div style={{
            marginTop: 'auto',
            padding: 12,
            borderTop: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-2)',
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}>
            {user?.avatarUrl ? (
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--bg-2)',
                display: 'grid', placeItems: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                <img src={user.avatarUrl} alt="avatar" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold), #8A7230)',
                color: '#0a0d14',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14, flexShrink: 0,
              }}>
                {initial}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-0)' }}>
                {user?.alias || user?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-2)' }}>
                {user?.role === 'ADMIN' ? 'Administrador' : 'Jugador'}
              </div>
            </div>
            <LogoutOutlined style={{ color: 'var(--fg-2)', fontSize: 14 }} />
          </div>
        </Dropdown>
      </aside>

      {/* Mobile backdrop */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
        />
      )}

      {/* ============ MAIN AREA ============ */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Compact header (mobile toggle only) */}
        <header style={{
          padding: '0 24px',
          height: 48,
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: 'var(--fg-1)' }}
          />
        </header>

        <Content style={{ padding: isMobile ? '20px 16px 40px' : '28px 40px 60px', maxWidth: 1400, width: '100%' }}>
          <Outlet />
        </Content>
      </div>

      <ChangePasswordModal />
    </div>
  );
}
