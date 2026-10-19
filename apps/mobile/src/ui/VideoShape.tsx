import { Text, View } from 'react-native';
import { describeVideoShape } from '@/lib/videoShape';
import { colors, space } from './theme';

/** "Wide 16:9 · fits YouTube, Facebook and LinkedIn" under a clip, from its real shape. */
export function ShapeLabel({ ratio }: { ratio: number }) {
  const shape = describeVideoShape(ratio);
  return (
    <Text style={{ textAlign: 'center', fontSize: 13, color: colors.textMuted }}>
      <Text style={{ fontWeight: '700', color: colors.text }}>{shape.name}</Text> · fits {shape.fitsOn}
    </Text>
  );
}

const FRAME = 56;

/** A small outline of the chosen shape next to its name, so the format is clear before creating. */
export function ShapePreview({ ratio }: { ratio: number }) {
  const shape = describeVideoShape(ratio);
  const width = ratio >= 1 ? FRAME : Math.round(FRAME * ratio);
  const height = ratio >= 1 ? Math.round(FRAME / ratio) : FRAME;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ width: FRAME, height: FRAME, alignItems: 'center', justifyContent: 'center' }}>
        <View
          accessible={false}
          style={{ width, height, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }}
        />
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: colors.textMuted }}>
        <Text style={{ fontWeight: '700', color: colors.text }}>{shape.name}</Text> · fits {shape.fitsOn}
      </Text>
    </View>
  );
}
