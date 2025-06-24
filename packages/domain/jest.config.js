export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@core-poc/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
