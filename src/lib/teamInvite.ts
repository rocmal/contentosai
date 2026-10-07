const STORAGE_KEY = 'lumora.openInvite';

/** Permission needed to add or remove teammates. */
export const MANAGE_MEMBERS_PERMISSION = 'organizations.manage-members';

/** Ask the Team page to open with the invite form already showing. */
export function requestInviteForm(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Storage blocked: the Team page just opens as normal.
  }
}

/** True once if another screen asked for the invite form. */
export function takeInviteRequest(): boolean {
  try {
    const wanted = window.sessionStorage.getItem(STORAGE_KEY) === '1';
    if (wanted) {
      // Cleared a moment later: React may run a state initializer twice in development.
      window.setTimeout(() => {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // Nothing to clear.
        }
      }, 1500);
    }
    return wanted;
  } catch {
    return false;
  }
}

/** Seats left on a plan: null means unlimited. */
export function seatsLeft(seatLimit: number | null, seatsUsed: number): number | null {
  return seatLimit === null ? null : Math.max(0, seatLimit - seatsUsed);
}
