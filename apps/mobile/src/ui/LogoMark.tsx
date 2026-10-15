import { View } from 'react-native';
import { colors } from './theme';

/**
 * The Lumora spark from design_handoff_mobile_app: four rounded bars at 0/45/90/135 degrees on a blue tile.
 * Same artwork as the app icon (assets/images/icon.png).
 */
export function LogoMark({ size = 56 }: { size?: number }) {
  const bar = size * 0.42;
  const thick = bar * 0.15;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Lumora"
      style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      {[0, 45, 90, 135].map((deg) => (
        <View
          key={deg}
          style={{ position: 'absolute', width: thick, height: bar, borderRadius: thick / 2, backgroundColor: '#fff', transform: [{ rotate: `${deg}deg` }] }}
        />
      ))}
    </View>
  );
}
