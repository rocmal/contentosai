import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from './theme';

export function Screen({ children, scroll = true, pad = true }: { children: ReactNode; scroll?: boolean; pad?: boolean }) {
  const insets = useSafeAreaInsets();
  const inner = { paddingHorizontal: pad ? space.lg : 0, paddingBottom: insets.bottom + space.xl };
  if (!scroll) return <View style={[styles.screen, inner]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={inner}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const off = disabled || loading;
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: pressed ? colors.primaryPressed : colors.primary } : styles.buttonSecondary,
        off && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, !primary && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textFaint} {...props} style={[styles.input, props.multiline && styles.inputMulti, props.style]} />;
}

export function Chip({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipOn, disabled && { opacity: 0.4 }]}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Text style={{ color: colors.danger, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  button: { minHeight: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  buttonSecondary: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryTint },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  input: {
    minHeight: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    fontSize: 16,
    color: colors.text,
  },
  inputMulti: { minHeight: 120, paddingTop: space.md, textAlignVertical: 'top' },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  card: { backgroundColor: colors.background, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  error: { backgroundColor: colors.dangerTint, borderRadius: radius.control, padding: space.md },
});
