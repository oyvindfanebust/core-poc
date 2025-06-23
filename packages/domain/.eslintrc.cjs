module.exports = {
  extends: ['@core-poc/eslint-config/backend'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
