export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: string;
}

export const PUSH_TOKENS_REPOSITORY = Symbol('PUSH_TOKENS_REPOSITORY');

export interface IPushTokensRepository {
  /** Stores the token for this user; if the token already exists (another account on the same phone) it moves to this user. */
  upsert(userId: string, token: string, platform: string): Promise<void>;
  listByUser(userId: string): Promise<PushToken[]>;
  /** Removes a token regardless of owner (used on sign-out and when Expo reports it dead). */
  removeByToken(token: string, userId?: string): Promise<void>;
}
