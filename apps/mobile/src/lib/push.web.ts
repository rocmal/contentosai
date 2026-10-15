/** Browser preview only: there are no push notifications on the web, so these do nothing (see push.ts for the app). */
export async function enablePush(): Promise<void> {}

export async function disablePush(): Promise<void> {}

export function useOpenTappedNotification(_enabled: boolean): void {}
