/**
 * Repository/integration tests hit a real database (configured via
 * .env.test) rather than mocks, so they're kept out of the default `npm test`
 * run and require the test database to be migrated first:
 *   npm run db:migrate   (with APP_ENV=test)
 *   npm run test:integration
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@database/(.*)$': '<rootDir>/database/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@events/(.*)$': '<rootDir>/events/$1',
    '^@queues/(.*)$': '<rootDir>/queues/$1',
  },
};
