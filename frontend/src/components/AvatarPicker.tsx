const AVATARS = [
  { id: 'goalkeeper', label: 'Portero', file: '/avatars/goalkeeper.svg' },
  { id: 'striker', label: 'Delantero', file: '/avatars/striker.svg' },
  { id: 'referee', label: 'Arbitro', file: '/avatars/referee.svg' },
  { id: 'fan', label: 'Hincha', file: '/avatars/fan.svg' },
  { id: 'ball', label: 'Balon', file: '/avatars/ball.svg' },
  { id: 'trophy', label: 'Trofeo', file: '/avatars/trophy.svg' },
  { id: 'boot', label: 'Bota', file: '/avatars/boot.svg' },
  { id: 'bicycle', label: 'Chilena', file: '/avatars/bicycle.svg' },
  { id: 'var-robot', label: 'VAR', file: '/avatars/var-robot.svg' },
  { id: 'coach', label: 'Entrenador', file: '/avatars/coach.svg' },
  { id: 'drama', label: 'Drama', file: '/avatars/drama.svg' },
  { id: 'lion', label: 'Leon', file: '/avatars/lion.svg' },
  { id: 'goat', label: 'GOAT', file: '/avatars/goat.svg' },
  { id: 'mohawk', label: 'Mohawk', file: '/avatars/mohawk.svg' },
  { id: 'ninja', label: 'Ninja', file: '/avatars/ninja.svg' },
  { id: 'cactus', label: 'Cactus', file: '/avatars/cactus.svg' },
];

export { AVATARS };

interface AvatarPickerProps {
  value?: string;
  onChange: (url: string) => void;
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div>
      <div style={{
        fontSize: 12, color: 'var(--fg-2)', marginBottom: 10,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        Elige tu avatar
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 8,
      }}>
        {AVATARS.map((av) => {
          const selected = value === av.file;
          return (
            <div
              key={av.id}
              onClick={() => onChange(av.file)}
              title={av.label}
              style={{
                width: 56, height: 56,
                borderRadius: 14,
                display: 'grid', placeItems: 'center',
                cursor: 'pointer',
                background: selected ? 'var(--gold-soft)' : 'var(--bg-2)',
                border: selected ? '2px solid var(--gold)' : '2px solid transparent',
                boxShadow: selected ? '0 0 12px rgba(212,169,60,0.4)' : 'none',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'var(--bg-3)';
                  e.currentTarget.style.borderColor = 'var(--line-2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'var(--bg-2)';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <img
                src={av.file}
                alt={av.label}
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
