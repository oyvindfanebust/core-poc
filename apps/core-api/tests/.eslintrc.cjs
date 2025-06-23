module.exports = {
  extends: ['@core-poc/eslint-config/backend'],
  parserOptions: {
    project: null, // Disable TypeScript project checking for tests
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
};