/**
 * Minimal ambient typings for the OAuth passport strategies used by the auth
 * module. These packages either ship no types or types that drift from the
 * exact shape we consume - declaring the slice we use here keeps the build
 * hermetic regardless of upstream @types availability.
 */
declare module 'passport-google-oauth20' {
  export interface Profile {
    id: string;
    displayName?: string;
    name?: { givenName?: string; familyName?: string };
    emails?: { value: string }[];
    photos?: { value: string }[];
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export type VerifyCallback = (error: unknown, user?: unknown, info?: unknown) => void;

  export class Strategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
      ) => void,
    );
    name: string;
  }
}

declare module 'passport-github2' {
  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export class Strategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: unknown,
        done: (error: unknown, user?: unknown) => void,
      ) => void,
    );
    name: string;
  }
}

declare module 'passport-microsoft' {
  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export class Strategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: unknown,
        done: (error: unknown, user?: unknown) => void,
      ) => void,
    );
    name: string;
  }
}
