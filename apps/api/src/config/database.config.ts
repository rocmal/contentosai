import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  dialect: process.env.DB_DIALECT ?? 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  name: process.env.DB_NAME ?? 'lumora',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  logging: process.env.DB_LOGGING === 'true',
  pool: {
    max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
    min: parseInt(process.env.DB_POOL_MIN ?? '0', 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE ?? '30000', 10),
    idle: parseInt(process.env.DB_POOL_IDLE ?? '10000', 10),
  },
}));
