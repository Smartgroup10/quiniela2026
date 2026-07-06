import { useState } from 'react';
import { message } from 'antd';
import { UsergroupAddOutlined, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { resultsApi, type AllPrediction } from '../api/results';

const V = {
  bg2: 'var(--bg-2)',
  line: 'var(--line)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)',
};

interface Props {
  matchId: string;
  /**
   * Cuando true, el boton se muestra pero se avisa que el partido
   * aun no empezo (aunque el backend tambien lo bloquea).
   */
  compact?: boolean;
}

export default function PredictionsToggle({ matchId, compact = false }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [allPreds, setAllPreds] = useState<AllPrediction[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

  const toggleAll = async () => {
    if (showAll) { setShowAll(false); return; }
    if (allPreds) { setShowAll(true); return; }
    setLoadingAll(true);
    try {
      const { data } = await resultsApi.getPredictions(matchId);
      setAllPreds(data);
      setShowAll(true);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'No se pudieron cargar las predicciones');
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleAll}
        disabled={loadingAll}
        style={{
          marginTop: compact ? 8 : 10, width: '100%',
          background: 'transparent',
          border: `1px solid ${V.line}`,
          borderRadius: 8, padding: compact ? '6px 8px' : '8px 10px',
          color: V.fg1, fontSize: compact ? 11 : 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: loadingAll ? 'default' : 'pointer',
        }}
      >
        <UsergroupAddOutlined />
        {loadingAll ? 'Cargando…' : showAll ? 'Ocultar' : 'Ver predicciones de todos'}
        {!loadingAll && (showAll ? <CaretUpOutlined /> : <CaretDownOutlined />)}
      </button>

      {showAll && allPreds && (
        <div style={{
          marginTop: 8, background: V.bg2, border: `1px solid ${V.line}`,
          borderRadius: 8, padding: 8,
        }}>
          {allPreds.length === 0 ? (
            <div style={{ color: V.fg2, fontSize: 12, textAlign: 'center', padding: 12 }}>
              Nadie predijo este partido.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 6, fontSize: 12 }}>
              <div style={headerStyle}>Usuario</div>
              <div style={{ ...headerStyle, textAlign: 'center' }}>Marcador</div>
              <div style={{ ...headerStyle, textAlign: 'center' }}>Ganador</div>
              <div style={{ ...headerStyle, textAlign: 'right' }}>Pts</div>
              {allPreds.map((pr) => (
                <>
                  <div key={`${pr.userId}-name`} style={{ color: V.fg0, padding: '5px 0' }}>{pr.userName}</div>
                  <div key={`${pr.userId}-score`} style={{
                    color: V.fg1, textAlign: 'center',
                    fontFamily: "'JetBrains Mono', monospace", padding: '5px 0',
                  }}>
                    {pr.homeGoals}-{pr.awayGoals}{pr.wentToPenalties ? ' [p]' : ''}
                  </div>
                  <div key={`${pr.userId}-winner`} style={{ color: V.fg1, textAlign: 'center', padding: '5px 0' }}>
                    {pr.winnerTeam?.code || '—'}
                  </div>
                  <div key={`${pr.userId}-pts`} style={{
                    color: pr.pointsEarned > 0 ? V.gold : V.fg3,
                    textAlign: 'right', fontWeight: 700, padding: '5px 0',
                  }}>+{pr.pointsEarned}</div>
                </>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const headerStyle = {
  color: V.fg2, fontSize: 10,
  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  paddingBottom: 4, borderBottom: `1px solid ${V.line}`,
};
