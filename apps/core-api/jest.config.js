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
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 10000, // 10 seconds default
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  maxWorkers: 2, // Run tests with limited parallelism for external services
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
      testTimeout: 10000,
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
      setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
      testTimeout: 30000, // 30 second timeout for integration tests
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        "^@core-poc/(.*)$": "<rootDir>/../../packages/$1/src",
      },
      transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
      },
    },
    {
      displayName: "e2e",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/e2e/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
      testTimeout: 20000, // 20 seconds for E2E tests
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
