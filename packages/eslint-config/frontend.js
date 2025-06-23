module.exports = {
  extends: ['./index.js', 'next/core-web-vitals'],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};