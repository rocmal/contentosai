export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/** Port so application services never depend on a concrete hashing library. */
export interface IPasswordHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}
