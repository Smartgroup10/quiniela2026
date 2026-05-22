import { useState, useEffect } from 'react';
import { Card, message, Tag } from 'antd';
import { CheckCircleOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Team } from '../api/teams';
import type { GroupPrediction } from '../api/predictions';
import { predictionsApi } from '../api/predictions';
import TeamFlag from './TeamFlag';

interface SortableTeamProps {
  team: Team;
  position: number;
  disabled: boolean;
}

function SortableTeam({ team, position, disabled }: SortableTeamProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    marginBottom: 4,
    borderRadius: 6,
    background: disabled ? '#1A1A1A' : '#2D2D2D',
    border: '1px solid #3A3A3A',
    color: '#F1FAEE',
    cursor: disabled ? 'default' : 'grab',
    fontSize: 14,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {!disabled && <HolderOutlined style={{ color: '#A8A8A8' }} />}
      <span style={{ fontWeight: 600, minWidth: 20 }}>{position}.</span>
      <TeamFlag code={team.code} size={22} />
      <span style={{ flex: 1 }}>{team.name}</span>
      {position <= 2 && (
        <Tag color="green" style={{ margin: 0, fontSize: 11 }}>Clasifica</Tag>
      )}
    </div>
  );
}

interface GroupCardProps {
  groupKey: string;
  teams: Team[];
  prediction?: GroupPrediction;
  disabled: boolean;
  onSaved: () => void;
}

export default function GroupCard({ groupKey, teams, prediction, disabled, onSaved }: GroupCardProps) {
  const [ordered, setOrdered] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!prediction);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  useEffect(() => {
    if (prediction) {
      const order = [prediction.firstTeamId, prediction.secondTeamId, prediction.thirdTeamId, prediction.fourthTeamId];
      const sorted = order.map((id) => teams.find((t) => t.id === id)).filter(Boolean) as Team[];
      if (sorted.length === 4) {
        setOrdered(sorted);
        setSaved(true);
        return;
      }
    }
    setOrdered([...teams]);
  }, [teams, prediction]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((t) => t.id === active.id);
    const newIndex = ordered.findIndex((t) => t.id === over.id);
    const newOrder = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(newOrder);

    // Auto-save
    setSaving(true);
    try {
      await predictionsApi.saveGroup(groupKey, {
        firstTeamId: newOrder[0].id,
        secondTeamId: newOrder[1].id,
        thirdTeamId: newOrder[2].id,
        fourthTeamId: newOrder[3].id,
      });
      setSaved(true);
      onSaved();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Grupo {groupKey}</span>
          {saved ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Guardado</Tag>
          ) : (
            <Tag icon={<EditOutlined />} color="warning">Pendiente</Tag>
          )}
        </div>
      }
      size="small"
      loading={saving}
      style={{
        borderTop: `3px solid ${saved ? '#2DC653' : '#F4A261'}`,
        height: '100%',
      }}
    >
      <div style={{ fontSize: 12, color: '#A8A8A8', marginBottom: 8 }}>
        {disabled ? 'Fase cerrada' : 'Arrastra para ordenar del 1o al 4o'}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {ordered.map((team, idx) => (
            <SortableTeam key={team.id} team={team} position={idx + 1} disabled={disabled} />
          ))}
        </SortableContext>
      </DndContext>
    </Card>
  );
}
