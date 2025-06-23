module.exports = {
  extends: ['./index.js'],
  env: {
    node: true,
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
