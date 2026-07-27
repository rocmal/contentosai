import * as path from 'path';
import * as dotenv from 'dotenv';
import { Dialect } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

/**
 * Builds a bare Sequelize connection (no Nest DI) for repository integration
 * tests. Connects to the real database configured in .env.test - the schema
 * must already be migrated (`npm run db:migrate`, with APP_ENV=test) since
 * this deliberately never calls sync().
 */
export function createTestSequelize(models: Array<new (...args: never[]) => unknown>): Sequelize {
  return new Sequelize({
    dialect: (process.env.DB_DIALECT as Dialect) ?? 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    models: models as never[],
    logging: false,
  });
}
