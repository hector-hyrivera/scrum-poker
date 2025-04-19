/**
 * Jest configuration for the backend (Node.js)
 * Uses ts-jest for TypeScript support and node as the test environment.
 * See: https://jestjs.io/docs/configuration
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.(ts)$': 'ts-jest',
  },
  testMatch: ['**/__tests__/**/*.(ts|js)', '**/?(*.)+(spec|test).(ts|js)'],
  collectCoverageFrom: ['**/*.{ts}', '!**/*.d.ts', '!dist/**', '!node_modules/**'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.node.json',
    },
  },
};
