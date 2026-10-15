/** Browser preview only (npx expo start, then press w): there is no keychain, so tokens go to localStorage. */
export const tokenStore = {
  get: async (key: string) => localStorage.getItem(key),
  set: async (key: string, value: string) => localStorage.setItem(key, value),
  remove: async (key: string) => localStorage.removeItem(key),
};
