import { Path } from 'react-native-svg';

export default function PlateSector({ d, fill, stroke, onPress }: {
  d: string;
  fill: string;
  stroke: string;
  onPress: () => void;
}) {
  return <Path d={d} fill={fill} stroke={stroke} strokeWidth={2} onPress={onPress} />;
}
