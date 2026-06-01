import { useEffect, useState } from 'react';
import { Spin, Segmented, Tag } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import type { Team } from '../api/teams';
import type { GroupPrediction } from '../api/predictions';
import { predictionsApi } from '../api/predictions';
import TeamFlag from './TeamFlag';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const V = {
  bg0: 'var(--bg-0)', bg1: 'var(--bg-1)', bg2: 'var(--bg-2)', bg3: 'var(--bg-3)',
  line: 'var(--line)', line2: 'var(--line-2)',
  fg0: 'var(--fg-0)', fg1: 'var(--fg-1)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
  gold: 'var(--gold)', gold2: 'var(--gold-2)',
  goldSoft: 'var(--gold-soft)', goldLine: 'var(--gold-line)',
  green: 'var(--green)', greenSoft: 'var(--green-soft)',
  amber: 'var(--amber)',
};

interface UserGroupPrediction extends GroupPrediction {
  user: { id: string; name: string; alias: string | null };
}

interface Props {
  teams: Team[];
}

export default function GroupComparison({ teams }: Props) {
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [predictions, setPredictions] = useState<UserGroupPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  useEffect(() => {
    setLoading(true);
    predictionsApi.getGroupPredictionsByGroup(selectedGroup)
      .then((res) => setPredictions(res.data))
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }, [selectedGroup]);

  const groupTeams = teams.filter((t) => t.groupKey === selectedGroup);

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 20, fontWeight: 700, color: V.fg0, margin: '0 0 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <TeamOutlined style={{ fontSize: 18 }} /> Comparativa de Grupos
      </h2>

      <Segmented
        options={GROUPS}
        value={selectedGroup}
        onChange={(v) => setSelectedGroup(v as string)}
        block
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : predictions.length === 0 ? (
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`, borderRadius: 12,
          padding: 32, textAlign: 'center', color: V.fg2, fontSize: 14,
        }}>
          No hay predicciones disponibles para el Grupo {selectedGroup}.
        </div>
      ) : (
        <div style={{
          background: V.bg1, border: `1px solid ${V.line}`, borderRadius: 12,
          overflow: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.line}` }}>
                <th style={{
                  textAlign: 'left', padding: '10px 12px',
                  color: V.fg2, fontWeight: 600, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  position: 'sticky', left: 0, background: V.bg1, zIndex: 1,
                }}>Jugador</th>
                {[1, 2, 3, 4].map((pos) => (
                  <th key={pos} style={{
                    textAlign: 'center', padding: '10px 12px',
                    color: V.fg2, fontWeight: 600, fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {pos}o
                    {pos <= 2 && <Tag color="green" style={{ margin: '0 0 0 4px', fontSize: 9, lineHeight: '14px', padding: '0 3px' }}>C</Tag>}
                    {pos === 3 && <Tag color="orange" style={{ margin: '0 0 0 4px', fontSize: 9, lineHeight: '14px', padding: '0 3px' }}>3o</Tag>}
                  </th>
                ))}
                <th style={{
                  textAlign: 'center', padding: '10px 12px',
                  color: V.fg2, fontWeight: 600, fontSize: 11,
                }}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((pred) => {
                const positions = [pred.firstTeamId, pred.secondTeamId, pred.thirdTeamId, pred.fourthTeamId];
                return (
                  <tr key={pred.id} style={{ borderBottom: `1px solid ${V.line}` }}>
                    <td style={{
                      padding: '8px 12px', fontWeight: 600, color: V.fg0,
                      whiteSpace: 'nowrap', position: 'sticky', left: 0,
                      background: V.bg1, zIndex: 1,
                    }}>
                      {pred.user.alias || pred.user.name}
                    </td>
                    {positions.map((teamId, idx) => {
                      const team = teamMap.get(teamId);
                      return (
                        <td key={idx} style={{ textAlign: 'center', padding: '8px 12px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {team && <TeamFlag code={team.code} size={16} />}
                            <span style={{ color: V.fg1, fontSize: 12 }}>{team?.code || '?'}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td style={{
                      textAlign: 'center', padding: '8px 12px',
                      fontWeight: 700, color: pred.pointsEarned > 0 ? V.gold : V.fg3,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {pred.pointsEarned}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Real results row if available */}
          {groupTeams.some((t) => t.realFinalPosition != null) && (
            <div style={{
              borderTop: `2px solid ${V.gold}`,
              padding: '10px 12px',
              background: V.goldSoft,
            }}>
              <div style={{ fontSize: 11, color: V.gold, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
                Resultado real
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[1, 2, 3, 4].map((pos) => {
                  const team = groupTeams.find((t) => t.realFinalPosition === pos);
                  return (
                    <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: V.fg2, fontSize: 11 }}>{pos}o:</span>
                      {team ? (
                        <>
                          <TeamFlag code={team.code} size={16} />
                          <span style={{ color: V.fg0, fontWeight: 600, fontSize: 12 }}>{team.code}</span>
                        </>
                      ) : (
                        <span style={{ color: V.fg3, fontSize: 12 }}>-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
