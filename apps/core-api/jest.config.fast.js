export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@core-poc/(.*)$": "<rootDir>/../../packages/$1/src",
  },
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/tests/integration/fast-*.test.ts"], // Only fast tests
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/app.ts", // Exclude main app file
  ],
  // NO setupFilesAfterEnv - fast tests use mocks and don't need global setup
  testTimeout: 10000, // 10 seconds - fast tests should be very quick
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  maxWorkers: 4, // Can run in parallel since using mocks
  displayName: "fast-integration",
};