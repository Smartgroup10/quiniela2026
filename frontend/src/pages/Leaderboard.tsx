import { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Avatar, Spin } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { leaderboardApi, type LeaderboardEntry } from '../api/leaderboard';
import { useAuthStore } from '../stores/authStore';

const MEDALS = ['first', 'second', 'third'];

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    leaderboardApi.get().then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  }, []);

  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <span style={{ fontSize: index < 3 ? 20 : 14, fontWeight: index < 3 ? 700 : 400 }}>
          {index < 3 ? ['1st', '2nd', '3rd'][index] : index + 1}
        </span>
      ),
    },
    {
      title: 'Jugador',
      key: 'player',
      render: (record: LeaderboardEntry) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ backgroundColor: '#E63946' }} size="small">
            {(record.alias || record.name)[0].toUpperCase()}
          </Avatar>
          <span style={{ fontWeight: record.id === currentUserId ? 700 : 400 }}>
            {record.alias || record.name}
            {record.id === currentUserId && <Tag color="blue" style={{ marginLeft: 8 }}>Tu</Tag>}
          </span>
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      width: 80,
      render: (val: number) => <strong style={{ color: '#E63946', fontSize: 16 }}>{val}</strong>,
    },
    {
      title: 'Grupos',
      dataIndex: 'groupPoints',
      key: 'groupPoints',
      width: 70,
      responsive: ['md'] as any,
    },
    {
      title: '3os',
      dataIndex: 'bestThirdPoints',
      key: 'bestThirdPoints',
      width: 60,
      responsive: ['md'] as any,
    },
    {
      title: 'Bonus F1',
      dataIndex: 'bonusPhase1Points',
      key: 'bonusPhase1Points',
      width: 80,
      responsive: ['lg'] as any,
    },
    {
      title: 'Bracket',
      dataIndex: 'knockoutPoints',
      key: 'knockoutPoints',
      width: 70,
      responsive: ['lg'] as any,
    },
    {
      title: 'Bonus F2',
      dataIndex: 'bonusPhase2Points',
      key: 'bonusPhase2Points',
      width: 80,
      responsive: ['lg'] as any,
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 100 }} />;

  return (
    <div>
      <Typography.Title level={3}>
        <CrownOutlined style={{ marginRight: 8 }} />
        Ranking
      </Typography.Title>
      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={false}
          rowClassName={(record) => record.id === currentUserId ? 'ant-table-row-selected' : ''}
          size="middle"
        />
      </Card>
    </div>
  );
}
