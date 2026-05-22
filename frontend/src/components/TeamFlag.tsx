import { getFlagUrl } from '../utils/flags';

interface Props {
  code: string;
  size?: number;
  style?: React.CSSProperties;
}

export default function TeamFlag({ code, size = 24, style }: Props) {
  const url = getFlagUrl(code, size * 2); // 2x for retina
  if (!url) return <span>?</span>;
  return (
    <img
      src={url}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      style={{ borderRadius: 2, objectFit: 'cover', verticalAlign: 'middle', ...style }}
    />
  );
}
