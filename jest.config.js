const nextJest = require('next/jest');

/** @type {import('next/jest').NextJest} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'app/**/*.js',
    'components/**/*.jsx',
    'lib/**/*.js',
    'app/api/**/*.js',
    '!**/*.config.js',
    '!**/node_modules/**',
    '!app/**/styles.css',
    '!app/layout.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!.*(?:bson|mongodb|mongodb-memory-server|mongodb-memory-server-core)/)',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
