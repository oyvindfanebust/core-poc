module.exports = {
  extends: ['@core-poc/eslint-config/frontend'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
        alwaysTryTypes: true,
      },
      alias: {
        map: [['@', '.']],
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
    },
  },
  rules: {
    'import/no-unresolved': ['error', { ignore: ['^@/'] }],
  },
};
