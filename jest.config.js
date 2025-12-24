/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: "ts-jest",

  // Test environment
  testEnvironment: "node",

  // Root directories for tests
  roots: ["<rootDir>/apps", "<rootDir>/packages"],

  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.spec.ts",
    "**/*.test.ts",
    "**/*.spec.ts",
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "apps/**/*.ts",
    "packages/**/*.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/__tests__/**",
    "!**/coverage/**",
  ],

  // Coverage thresholds (aspirational - adjust as needed)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // Module path aliases (match tsconfig paths)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Transform configuration
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          // Compiler options for tests
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/coverage/"],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,
};

