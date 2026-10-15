import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LogoMark } from './LogoMark';

/**
 * Artwork for the sign-in screen: a dark navy backdrop with soft colour glows, an animated voice waveform
 * and a short brand splash shown once per app launch. Drawn with React Native's built-in CSS gradients
 * (no SVG or gradient package), so nothing extra to install.
 */

const NAVY = '#0a0f24';
const nativeDriver = Platform.OS !== 'web';

/** CSS gradient background: `experimental_backgroundImage` on iOS/Android, plain `backgroundImage` on web. */
function gradient(css: string): ViewStyle {
  if (Platform.OS === 'web') {
    const web: ViewStyle & { backgroundImage?: string } = { backgroundImage: css };
    return web;
  }
  return { experimental_backgroundImage: css };
}

const aurora = gradient(
  [
    'radial-gradient(circle at 12% 8%, rgba(37,99,235,0.6) 0%, rgba(37,99,235,0) 55%)',
    'radial-gradient(circle at 95% 45%, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0) 50%)',
    'radial-gradient(circle at 30% 105%, rgba(217,70,239,0.3) 0%, rgba(217,70,239,0) 55%)',
    'radial-gradient(circle at 85% 95%, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0) 35%)',
  ].join(', '),
);

/** Fills its parent with the navy-and-glow backdrop. */
export function AuroraBackdrop() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: NAVY }, aurora]} />;
}

const WAVE = [6, 14, 22, 12, 28, 18, 34, 20, 10, 26, 16, 30, 12, 22, 8, 18, 26, 14, 20, 10];

function WaveBar({ height, delay }: { height: number; delay: number }) {
  const [scale] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriver }),
        Animated.timing(scale, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, delay]);
  return <Animated.View style={{ width: 3, height, borderRadius: 2, backgroundColor: '#93a5fb', transform: [{ scaleY: scale }] }} />;
}

/** Breathing voice waveform. */
export function Waveform() {
  return (
    <View accessible={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 36 }}>
      {WAVE.map((h, i) => (
        <WaveBar key={i} height={h} delay={(i % 7) * 120} />
      ))}
    </View>
  );
}

/** Small translucent pill, e.g. "Image" with a coloured dot. */
export function GlassChip({ label, dot }: { label: string; dot: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// Once per app launch: navigating back to the login screen (e.g. after sign-out) skips it.
let splashShown = false;

/**
 * Full-screen brand splash over the sign-in screen: a glow and the name rise around the spark, then it fades to
 * the form after about 1.6 s. Tap to skip. Skipped entirely when the device asks for reduced motion.
 * On iOS/Android it continues the native launch screen (same navy, same 88 pt tile, dead centre), so the spark
 * starts already in place; on web, where there is no launch screen, it pops in.
 */
export function BrandSplash() {
  const [visible, setVisible] = useState(() => !splashShown);
  const [fade] = useState(() => new Animated.Value(1));
  const [pop] = useState(() => new Animated.Value(nativeDriver ? 1 : 0));
  const [rise] = useState(() => new Animated.Value(0));
  const [load] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    splashShown = true;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          setVisible(false);
          return;
        }
        Animated.parallel([
          Animated.timing(load, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.sequence([
            Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: nativeDriver }),
            Animated.timing(rise, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: nativeDriver }),
            Animated.delay(600),
            Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: nativeDriver }),
          ]),
        ]).start(({ finished }) => {
          if (finished && !cancelled) setVisible(false);
        });
      });
    return () => {
      cancelled = true;
    };
  }, [visible, fade, pop, rise, load]);

  if (!visible) return null;

  const skip = () => {
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: nativeDriver }).start(() => setVisible(false));
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 10, opacity: fade }]}>
      <Pressable accessibilityLabel="Skip intro" onPress={skip} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AuroraBackdrop />
        <Animated.View
          style={{
            position: 'absolute',
            width: 124,
            height: 124,
            borderRadius: 62,
            opacity: rise,
            ...gradient('radial-gradient(circle at 50% 50%, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 70%)'),
          }}
        />
        <Animated.View
          style={{
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <LogoMark size={88} />
        </Animated.View>
        <Animated.View
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            marginTop: 44 + 24,
            alignItems: 'center',
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -0.5 }}>Lumora</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>Images, videos and voice in minutes</Text>
        </Animated.View>
        <View style={{ position: 'absolute', bottom: 64, width: 96, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <Animated.View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#818cf8',
              width: load.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
