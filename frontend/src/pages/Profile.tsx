import { useState } from 'react';
import { message } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import AvatarPicker from '../components/AvatarPicker';
import { Link } from 'react-router-dom';

const V = {
  bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  goldSoft: 'var(--gold-soft)', goldLine: 'var(--gold-line)',
  green: 'var(--green)',
};

const AV_COLORS = [
  ['#D4A93C', '#8A7230'],
  ['#7BA7E8', '#4A6B9D'],
  ['#5DBF8A', '#3A7A5A'],
  ['#B07ADB', '#6A4A8A'],
  ['#E26A5E', '#9A4A42'],
];

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');

  if (!user) return null;

  const initial = (user.alias || user.name || '?')[0].toUpperCase();
  const hasChanged = selectedAvatar !== (user.avatarUrl || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await authApi.updateProfile({ avatarUrl: selectedAvatar || undefined });
      setUser(data);
      message.success('Avatar actualizado');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const avatarGrad = () => {
    const idx = initial.charCodeAt(0) % AV_COLORS.length;
    return `linear-gradient(135deg, ${AV_COLORS[idx][0]}, ${AV_COLORS[idx][1]})`;
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
        color: V.fg2, textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 12,
      }}>
        <Link to="/" style={{ color: V.fg2, textDecoration: 'none' }}>Inicio</Link>
        <span style={{ color: V.fg3 }}>{'>'}</span>
        <span style={{ color: V.fg0 }}>Mi Perfil</span>
      </div>

      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em',
        color: V.fg0, margin: '0 0 28px',
      }}>Mi Perfil</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20, maxWidth: 900 }}>
        {/* Card: Info */}
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`,
          borderRadius: 16, padding: 24, textAlign: 'center',
        }}>
          {/* Current avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'grid', placeItems: 'center',
            background: user.avatarUrl ? V.bg2 : avatarGrad(),
            border: `3px solid ${V.gold}`,
            boxShadow: `0 0 20px rgba(212,169,60,0.3)`,
            overflow: 'hidden',
          }}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" style={{ width: 60, height: 60, objectFit: 'contain' }} />
            ) : (
              <span style={{
                fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 32, color: 'white',
              }}>{initial}</span>
            )}
          </div>

          <div style={{ fontWeight: 700, fontSize: 20, color: V.fg0, marginBottom: 4 }}>
            {user.alias || user.name}
          </div>
          <div style={{ fontSize: 13, color: V.fg2, marginBottom: 16 }}>{user.email}</div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            <div style={{
              background: V.bg2, borderRadius: 10, padding: 12,
              border: `1px solid ${V.line}`,
            }}>
              <div style={{ fontSize: 10, color: V.fg3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Rol</div>
              <div style={{
                fontWeight: 600, fontSize: 13,
                color: user.role === 'ADMIN' ? V.gold2 : V.fg0,
              }}>{user.role === 'ADMIN' ? 'Admin' : 'Jugador'}</div>
            </div>
            <div style={{
              background: V.bg2, borderRadius: 10, padding: 12,
              border: `1px solid ${V.line}`,
            }}>
              <div style={{ fontSize: 10, color: V.fg3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Puntos</div>
              <div style={{
                fontWeight: 700, fontSize: 16, color: V.gold2,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>{user.totalPoints}</div>
            </div>
          </div>
        </div>

        {/* Card: Avatar picker */}
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`,
          borderRadius: 16, padding: 24,
        }}>
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16, fontWeight: 600, color: V.fg0, margin: '0 0 16px',
          }}>Cambiar avatar</h3>

          <AvatarPicker value={selectedAvatar} onChange={setSelectedAvatar} />

          {hasChanged && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: 16,
                padding: '10px 24px', borderRadius: 10,
                fontWeight: 600, fontSize: 14,
                background: V.gold, color: '#0a0d14',
                border: 'none', cursor: saving ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(212,169,60,0.4)',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {saving ? 'Guardando...' : 'Guardar avatar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
