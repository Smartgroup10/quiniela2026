import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { isMobile } = useBreakpoint();

  // Countdown to tournament start (11 Jun 2026 18:00 CET)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  useEffect(() => {
    const target = new Date('2026-06-11T18:00:00+02:00').getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      login(data.token, data.user);
      message.success('Bienvenido!');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
    }}>
      {/* ============ HERO (Left) ============ */}
      <div style={{
        display: isMobile ? 'none' : 'flex',
        position: 'relative',
        background: `
          radial-gradient(circle at 20% 110%, rgba(212,169,60,0.12) 0%, transparent 45%),
          radial-gradient(circle at 110% 10%, rgba(123,167,232,0.10) 0%, transparent 50%),
          var(--bg-1)
        `,
        padding: '56px 64px',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Grid lines overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 75%)',
        }} />

        {/* Stadium concentric circles */}
        <div style={{
          position: 'absolute',
          width: 800, height: 800,
          bottom: -400, left: -200,
          borderRadius: '50%',
          background: `radial-gradient(circle,
            transparent 0%, transparent 38%,
            rgba(212,169,60,0.30) 38.2%, transparent 38.4%,
            transparent 60%,
            rgba(212,169,60,0.12) 60.2%, transparent 60.4%,
            transparent 100%)`,
          opacity: 0.6,
          pointerEvents: 'none',
        }} />

        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative', zIndex: 1,
          marginBottom: 64,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg, var(--gold) 0%, #8A7230 100%)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 20px -4px rgba(212,169,60,0.5), inset 0 1px 0 rgba(255,255,255,0.18)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 5, borderRadius: 7,
              border: '2px solid rgba(255,255,255,0.4)',
              borderBottomColor: 'transparent', borderLeftColor: 'transparent',
              transform: 'rotate(45deg)',
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <strong style={{
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18,
              letterSpacing: '-0.01em', color: 'var(--fg-0)',
            }}>Quiniela</strong>
            <span style={{
              fontSize: 11, color: 'var(--fg-2)',
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em',
            }}>2026 · MUNDIAL</span>
          </div>
        </div>

        {/* Hero body */}
        <div style={{
          position: 'relative', zIndex: 1, flex: 1,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', textAlign: 'center',
        }}>
          <img
            src="/assets/world-cup-2026-hero.png"
            alt="World Cup 2026"
            style={{
              width: '100%', maxWidth: 360, height: 'auto',
              marginBottom: 24,
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5)) drop-shadow(0 0 60px rgba(212,169,60,0.15))',
              animation: 'float 6s ease-in-out infinite',
            }}
          />

          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'var(--gold-2)', fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '0.12em',
            marginBottom: 24, fontWeight: 600,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--gold)',
              boxShadow: '0 0 0 4px var(--gold-soft)',
            }} />
            Edición 2026 · 11 jun — 19 jul
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.03em',
            marginBottom: 16, fontWeight: 600, maxWidth: '14ch',
            color: 'var(--fg-0)',
          }}>
            El torneo<br />de los{' '}
            <strong style={{
              background: 'linear-gradient(135deg, var(--gold-2) 0%, var(--gold) 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              color: 'transparent', fontWeight: 700,
            }}>tuyos</strong>.
          </h1>

          <p style={{
            fontSize: 15, color: 'var(--fg-1)',
            maxWidth: '38ch', lineHeight: 1.55, marginBottom: 36,
          }}>
            48 selecciones. 104 partidos. Un campeón.<br />
            Predice cada resultado y gana la quiniela.
          </p>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, auto)',
            gap: 36, paddingTop: 24,
            borderTop: '1px solid var(--line)', maxWidth: 420, margin: '0 auto',
          }}>
            {[
              { num: '48', lbl: 'Selecciones' },
              { num: '104', lbl: 'Partidos' },
              { num: '39', lbl: 'Días' },
            ].map((s) => (
              <div key={s.lbl} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                  fontSize: 32, letterSpacing: '-0.02em',
                  color: 'var(--gold-2)', lineHeight: 1,
                }}>{s.num}</div>
                <div style={{
                  marginTop: 6, fontSize: 11, color: 'var(--fg-2)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer: host cities */}
        <div style={{
          marginTop: 36, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12, color: 'var(--fg-2)',
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.06em', position: 'relative', zIndex: 1,
        }}>
          <span>Sedes</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['USA', 'CAN', 'MEX'].map((c) => (
              <div key={c} style={{
                width: 28, height: 20, borderRadius: 4,
                background: 'var(--bg-3)', border: '1px solid var(--line-2)',
                display: 'grid', placeItems: 'center',
                fontSize: 9, fontWeight: 700, color: 'var(--fg-1)',
              }}>{c}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ FORM (Right) ============ */}
      <div style={{
        background: 'var(--bg-0)',
        padding: isMobile ? '32px 24px' : '56px 64px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', position: 'relative',
      }}>
        {/* Top register link */}
        <div style={{
          position: 'absolute', top: 32, right: 64,
          fontSize: 13, color: 'var(--fg-2)',
        }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" style={{ color: 'var(--gold-2)', fontWeight: 600 }}>
            Regístrate
          </Link>
        </div>

        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32, letterSpacing: '-0.02em', marginBottom: 8,
            fontWeight: 600, color: 'var(--fg-0)',
          }}>
            Bienvenido de vuelta
          </h2>
          <p style={{ color: 'var(--fg-2)', fontSize: 14, margin: '0 0 36px' }}>
            Inicia sesión para entrar en tu quiniela.
          </p>

          <Form layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item
              name="email"
              label={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)' }}>Correo electrónico</span>}
              rules={[{ required: true, type: 'email', message: 'Email válido requerido' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'var(--fg-3)' }} />}
                placeholder="tu@correo.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)' }}>Contraseña</span>}
              rules={[{ required: true, message: 'Contraseña requerida' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--fg-3)' }} />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={<ArrowRightOutlined />}
                style={{
                  height: 48, fontWeight: 700, fontSize: 14,
                  letterSpacing: '0.02em',
                  boxShadow: '0 10px 24px -8px rgba(212, 169, 60, 0.6)',
                }}
              >
                Entrar
              </Button>
            </Form.Item>
          </Form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            margin: '28px 0', color: 'var(--fg-3)', fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            o bien
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <p style={{ textAlign: 'center', color: 'var(--fg-2)', fontSize: 13 }}>
            Únete a tu primera quiniela ·{' '}
            <Link to="/register" style={{ color: 'var(--gold-2)', fontWeight: 700 }}>
              Crear cuenta gratis
            </Link>
          </p>
        </div>

        {/* Tournament badge */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 999, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11, color: 'var(--fg-2)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 0 3px var(--green-soft)',
            animation: 'pulse 2s infinite',
          }} />
          <span>Torneo abre en</span>
          <span style={{ color: 'var(--gold-2)', fontWeight: 700 }}>
            {countdown.days}d {countdown.hours}h {String(countdown.minutes).padStart(2, '0')}m
          </span>
        </div>
      </div>

    </div>
  );
}
