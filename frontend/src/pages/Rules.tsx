import { Link } from 'react-router-dom';
import { useTournamentStore } from '../stores/tournamentStore';
import { useBreakpoint } from '../hooks/useBreakpoint';

const V = {
  bg0: 'var(--bg-0)', bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  goldSoft: 'var(--gold-soft)', goldLine: 'var(--gold-line)',
  green: 'var(--green)', greenSoft: 'var(--green-soft)', greenLine: 'var(--green-line)',
  amber: 'var(--amber)',
  blue: 'var(--blue)',
  red: 'var(--red)',
};

interface RuleRow {
  label: string;
  points: number;
  desc: string;
}

function RulesTable({ title, icon, rows }: { title: string; icon: string; rows: RuleRow[] }) {
  return (
    <div style={{
      background: V.bg1, border: `1px solid ${V.line}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${V.line}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: V.goldSoft, border: `1px solid ${V.goldLine}`,
          display: 'grid', placeItems: 'center', fontSize: 16,
        }}>{icon}</span>
        <h3 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16, fontWeight: 600, color: V.fg0, margin: 0,
        }}>{title}</h3>
      </div>
      <div>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr auto',
            gap: 12, padding: '14px 20px', alignItems: 'center',
            borderBottom: i < rows.length - 1 ? `1px solid ${V.line}` : 'none',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: V.fg0 }}>{row.label}</div>
              <div style={{ fontSize: 12, color: V.fg2, marginTop: 2 }}>{row.desc}</div>
            </div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 22, color: V.gold2,
              display: 'flex', alignItems: 'baseline', gap: 3,
            }}>
              {row.points > 0 ? '+' : ''}{row.points}
              <span style={{
                fontSize: 11, color: V.fg3, fontWeight: 500,
                fontFamily: "'JetBrains Mono', monospace",
              }}>pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Rules() {
  const sc = useTournamentStore((s) => s.scoringConfig);
  const { isMobile } = useBreakpoint();

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
        <span style={{ color: V.fg3 }}>›</span>
        <span style={{ color: V.fg0 }}>Reglas</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em',
          display: 'flex', alignItems: 'center', gap: 14,
          color: V.fg0, margin: 0,
        }}>
          <span style={{
            width: 44, height: 44, borderRadius: 12,
            background: V.goldSoft, border: `1px solid ${V.goldLine}`,
            display: 'grid', placeItems: 'center', color: V.gold2,
            fontSize: 22,
          }}>📋</span>
          Reglas de puntuación
        </h1>
        <p style={{ color: V.fg2, margin: '6px 0 0', fontSize: 14 }}>
          Sistema de puntos para cada tipo de predicción. Las predicciones se bloquean 1 hora antes del inicio de cada partido.
        </p>
      </div>

      {/* Aviso reembolso (pre-Mundial) */}
      <div style={{
        background: 'rgba(212,169,60,0.10)',
        border: `1px solid ${V.goldLine}`,
        borderLeft: `4px solid ${V.gold}`,
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>📜</span>
        <div style={{ fontSize: 14, color: V.fg0, fontWeight: 500, lineHeight: 1.55 }}>
          <strong style={{ fontWeight: 700, color: V.gold2 }}>Antes de nada, lee las reglas.</strong>{' '}
          Quien no esté de acuerdo, se le devolverá el dinero siempre que el Mundial
          aún no haya comenzado. Una vez iniciado el Mundial,{' '}
          <strong style={{ color: V.gold2 }}>no habrá reembolsos</strong>.
        </div>
      </div>

      {/* Aviso importante */}
      <div style={{
        background: 'rgba(220, 53, 69, 0.08)',
        border: `1px solid ${V.red}`,
        borderLeft: `4px solid ${V.red}`,
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>
        <div style={{ fontSize: 14, color: V.red, fontWeight: 500, lineHeight: 1.5 }}>
          <strong style={{ fontWeight: 700 }}>IMPORTANTE:</strong>{' '}
          Por favor revisa después de cada resultado que la asignación de puntos sea la correcta.
          En el caso de detectar un error por favor contacta con Rafa al WhatsApp.
        </div>
      </div>

      {/* Phases explanation */}
      <div style={{
        background: V.bg1, border: `1px solid ${V.line}`,
        borderRadius: 14, padding: '24px 20px', marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18, fontWeight: 600, color: V.fg0, margin: '0 0 6px',
        }}>Como funciona</h3>
        <p style={{ fontSize: 14, color: V.fg1, margin: '0 0 16px' }}>
          La quiniela es de <strong style={{ color: V.gold2 }}>20 €</strong> por persona y se juega en 2 fases:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {/* Fase 1 */}
          <div style={{
            background: V.bg2, borderRadius: 10, padding: '16px 18px',
            border: `1px solid ${V.line}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: V.gold2,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              fontFamily: "'JetBrains Mono', monospace",
            }}>Fase 1 — Grupos</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: V.fg1, lineHeight: 1.8 }}>
              <li>Predicciones de partidos de grupo</li>
              <li>Clasificacion de los grupos (se deriva automaticamente)</li>
              <li>Mejores terceros</li>
              <li>Bonus iniciales: campeon, subcampeon, 3er puesto, goleador, MVP y revelacion</li>
            </ul>
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 6,
              background: V.goldSoft, border: `1px solid ${V.goldLine}`,
              fontSize: 12, color: V.fg0,
            }}>
              <strong>Fecha limite bonus:</strong> 10 de junio (1 dia antes del Mundial).<br />
              <strong>Partidos:</strong> se pueden cambiar hasta 1h antes del inicio de cada partido.
            </div>
          </div>

          {/* Fase 2 */}
          <div style={{
            background: V.bg2, borderRadius: 10, padding: '16px 18px',
            border: `1px solid ${V.line}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: V.blue,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              fontFamily: "'JetBrains Mono', monospace",
            }}>Fase 2 — Eliminatorias</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: V.fg1, lineHeight: 1.8 }}>
              <li>Una vez se definan los cruces de dieciseisavos, rellenas tus predicciones hasta la final</li>
              <li>Prediccion de campeon de Fase 2 (8 pts extra)</li>
            </ul>
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 6,
              background: V.greenSoft, border: `1px solid ${V.greenLine}`,
              fontSize: 12, color: V.fg0,
            }}>
              <strong>Fecha limite:</strong> domingo 28 de junio, antes del inicio de dieciseisavos.<br />
              <strong>Importante:</strong> NO se pueden cambiar las predicciones despues de la fecha limite.
            </div>
          </div>
        </div>
      </div>

      {/* Important notice */}
      <div style={{
        background: 'rgba(230,57,70,0.10)',
        border: '1px solid rgba(230,57,70,0.30)',
        borderRadius: 12, padding: '14px 20px', marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <p style={{ margin: 0, fontSize: 13, color: V.fg0, lineHeight: 1.6 }}>
          <strong style={{ color: V.red }}>Importante:</strong> Las reglas son definitivas y no se cambiarán una vez iniciado el torneo. Cualquier duda, preguntar antes del inicio.
        </p>
      </div>

      {/* Rules grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 18,
      }}>
        {/* Partidos */}
        <RulesTable
          title="Partidos de grupo"
          icon="⚽"
          rows={[
            { label: 'Resultado exacto', points: sc?.matchExactScore ?? 3, desc: 'Acertaste el marcador exacto (ej: 2-1)' },
            { label: 'Resultado correcto', points: sc?.matchCorrectResult ?? 1, desc: 'Acertaste quién gana/empata, pero no el marcador' },
          ]}
        />

        {/* Posiciones de grupo */}
        <RulesTable
          title="Posiciones de grupo"
          icon="📊"
          rows={[
            { label: 'Posición exacta', points: sc?.groupExactPosition ?? 2, desc: 'El equipo quedó justo en la posición que dijiste' },
            { label: 'Clasificado invertido (1º↔2º)', points: sc?.groupClassifiedOtherPos ?? 1, desc: 'Pusiste el equipo en 1º o 2º pero quedó en la otra. Si lo pusiste en 3º/4º y clasifica, no da puntos.' },
          ]}
        />

        {/* Mejores terceros */}
        <RulesTable
          title="Mejores terceros"
          icon="🥉"
          rows={[
            { label: 'Tercero que clasifica acertado', points: sc?.bestThirdCorrect ?? 2, desc: 'Marcaste "Sí pasa" y tu 3º quedó entre los 8 mejores terceros. Marcar "No pasa" acertado NO da puntos.' },
          ]}
        />

        {/* Predicciones especiales */}
        <RulesTable
          title="Predicciones especiales"
          icon="🌟"
          rows={[
            { label: 'Campeón', points: sc?.champion ?? 12, desc: 'Acertaste al ganador del Mundial' },
            { label: 'Subcampeón', points: sc?.runnerUp ?? 8, desc: 'Acertaste al finalista' },
            { label: 'Tercer puesto', points: sc?.third ?? 5, desc: 'Acertaste al tercer lugar' },
            { label: 'Goleador', points: sc?.topScorer ?? 6, desc: 'Acertaste al máximo goleador. Escribe SOLO el apellido (ej: Mbappé).' },
            { label: 'MVP', points: sc?.mvp ?? 4, desc: 'Acertaste al mejor jugador del torneo. Escribe SOLO el apellido (ej: Messi).' },
            { label: 'Revelación', points: sc?.revelation ?? 4, desc: 'Acertaste al equipo revelación' },
          ]}
        />

        {/* Eliminatorias */}
        <RulesTable
          title="Eliminatorias"
          icon="🏆"
          rows={[
            { label: 'Ganador del cruce', points: sc?.knockoutWinner ?? 3, desc: 'Acertaste qué equipo avanza' },
            { label: 'Marcador exacto (90 min)', points: sc?.knockoutExactScore ?? 3, desc: 'Acertaste el marcador del cruce. Se acumula con el ganador.' },
            { label: 'Acierta penaltis', points: sc?.knockoutPenalties ?? 1, desc: 'Bonus extra si aciertas quién gana en la tanda de penaltis' },
            { label: 'Campeón (Fase 2)', points: sc?.championPhase2 ?? 8, desc: 'Predicción de campeón en Fase 2 (menos puntos que en Fase 1)' },
          ]}
        />

        {/* Info adicional */}
        <div style={{
          background: `linear-gradient(135deg, ${V.goldSoft}, transparent 60%), ${V.bg1}`,
          border: `1px solid ${V.goldLine}`,
          borderRadius: 14, padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <h3 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16, fontWeight: 600, color: V.fg0, margin: 0,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            Plazos importantes
          </h3>
          <div style={{ fontSize: 13, color: V.fg1, lineHeight: 1.7 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 0', borderBottom: `1px solid ${V.line}`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: V.amber, flexShrink: 0, marginTop: 6,
              }} />
              <span>Las predicciones de cada partido se <strong style={{ color: V.fg0 }}>bloquean 1 hora antes</strong> del inicio (kickoff).</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 0', borderBottom: `1px solid ${V.line}`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: V.green, flexShrink: 0, marginTop: 6,
              }} />
              <span>Las posiciones de grupo se <strong style={{ color: V.fg0 }}>derivan automáticamente</strong> de tus predicciones de partidos.</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: V.blue, flexShrink: 0, marginTop: 6,
              }} />
              <span>Los puntos finales se calculan cuando termine cada partido con el <strong style={{ color: V.fg0 }}>resultado oficial</strong>.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
