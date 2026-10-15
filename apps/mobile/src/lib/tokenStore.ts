import * as SecureStore from 'expo-secure-store';

/** Session tokens live in the OS keychain (iOS) / keystore (Android). The browser preview uses tokenStore.web.ts. */
export const tokenStore = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
