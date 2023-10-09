// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

/** @type {import("eslint").Linter.Config} */
const config = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: false,
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.json'),
  },
  "env": {
    "node": true
  }
};

module.exports = config;