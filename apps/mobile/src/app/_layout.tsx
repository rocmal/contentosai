import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useOpenTappedNotification } from '@/lib/push';
import { colors } from '@/ui/theme';

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'forgot-password';
  useOpenTappedNotification(!!user && !loading);

  useEffect(() => {
    if (loading) return;
    if (!user && !onLogin) router.replace('/login');
    else if (user && onLogin) router.replace('/');
  }, [user, loading, onLogin, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, headerTitleStyle: { color: colors.text }, headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="copilot" options={{ title: 'Co-pilot' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
      <Stack.Screen name="team" options={{ title: 'Team' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="billing" options={{ title: 'Plan and credits' }} />
      <Stack.Screen name="create/image" options={{ title: 'Image' }} />
      <Stack.Screen name="create/video" options={{ title: 'Video' }} />
      <Stack.Screen name="create/voice" options={{ title: 'Voiceover' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
