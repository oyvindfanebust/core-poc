export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@core-poc/(.*)$": "<rootDir>/../../packages/$1/src",
  },
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/*.test.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/app.ts", // Exclude main app file
  ],
  // Global setup removed - test projects configure their own setup requirements
  testTimeout: 30000, // 30 seconds default timeout
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
      testTimeout: 30000,
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        "^@core-poc/(.*)$": "<rootDir>/../../packages/$1/src",
      },
      transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
      },
    },
    {
      displayName: "integration",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      testPathIgnorePatterns: ["<rootDir>/tests/integration/fast-.*\\.test\\.ts"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
      testTimeout: 60000, // 60 second timeout for integration tests with external services
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        "^@core-poc/(.*)$": "<rootDir>/../../packages/$1/src",
      },
      transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
      },
    },
    {
      displayName: "fast-integration",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/fast-*.test.ts"],
      // NO setupFilesAfterEnv - fast tests use mocks and don't need global setup
      testTimeout: 10000, // 10 seconds - fast tests should be very quick
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        "^@core-poc/(.*)$": "<rootDir>/../../packages/$1/src",
      },
      transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
      },
      maxWorkers: 4, // Can run in parallel since using mocks
    },
    {
      displayName: "e2e",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/e2e/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
      testTimeout: 60000, // 60 seconds for E2E tests with external services
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        "^@core-poc/(.*)$": "<rootDir>/../../packages/$1/src",
      },
      transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
      },
    },
  ],
};
