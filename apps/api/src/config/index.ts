import appConfig from './app.config';
import jwtConfig from './jwt.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import storageConfig from './storage.config';
import aiConfig from './ai.config';
import mailConfig from './mail.config';
import oauthConfig from './oauth.config';
import stripeConfig from './stripe.config';
import monitoringConfig from './monitoring.config';
import metaConfig from './meta.config';
import linkedinConfig from './linkedin.config';
import youtubeConfig from './youtube.config';

export const configurations = [
  appConfig,
  jwtConfig,
  databaseConfig,
  redisConfig,
  storageConfig,
  aiConfig,
  mailConfig,
  oauthConfig,
  stripeConfig,
  monitoringConfig,
  metaConfig,
  linkedinConfig,
  youtubeConfig,
];

export * from './env.validation';
