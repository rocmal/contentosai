import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from './api-account';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;
const platform = Platform.OS === 'ios' ? 'ios' : 'android';

/**
 * Asks permission, gets this phone's Expo push token and tells the server.
 * Returns quietly when push is not possible (simulator, permission denied, no EAS project id yet, Expo Go on Android),
 * because notifications are a nice-to-have and must never block sign-in.
 */
export async function enablePush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Lumora',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = data;
    await registerPushToken(data, platform);
  } catch {
    // Not fatal: the in-app notification list still works.
  }
}

/** Call before the session is cleared so this phone stops receiving the account's notifications. */
export async function disablePush(): Promise<void> {
  if (!currentToken) return;
  try {
    await unregisterPushToken(currentToken, platform);
  } catch {
    // Signing out matters more.
  }
  currentToken = null;
}
