export default function PlateSector({ d, fill, stroke, onPress }: {
  d: string;
  fill: string;
  stroke: string;
  onPress: () => void;
}) {
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={2} onClick={onPress} aria-hidden="true" />;
}
