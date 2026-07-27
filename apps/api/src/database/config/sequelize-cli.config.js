/**
 * Standalone config consumed by sequelize-cli (migrations/seeders run outside
 * the Nest DI container, so this intentionally does not use @nestjs/config).
 * Reads the same .env.<environment> files as the application to guarantee
 * migrations always target the database the app itself connects to.
 */
const path = require('path');
const dotenv = require('dotenv');

const environment = process.env.APP_ENV || process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${environment}`) });
dotenv.config();

function buildConfig() {
  return {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lumora',
    logging: process.env.DB_LOGGING === 'true',
    migrationStorageTableName: 'sequelize_migrations',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_seeds',
    define: {
      underscored: false,
      timestamps: true,
      paranoid: true,
    },
  };
}

module.exports = {
  development: buildConfig(),
  test: buildConfig(),
  staging: buildConfig(),
  production: buildConfig(),
};
