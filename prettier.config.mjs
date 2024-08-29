import prettierPluginTailwindcss from 'prettier-plugin-tailwindcss';

/** @type {import("prettier").Config} */
const config = {
  semi: true,
  printWidth: 120,
  trailingComma: 'es5',
  plugins: [prettierPluginTailwindcss],
  "singleQuote": true,
  "editor.formatOnSave": true,
  "proseWrap": "always",
  "tabWidth": 2,
  "requireConfig": false,
  "useTabs": false,
  "bracketSpacing": true,
  "jsxBracketSameLine": false
};

module.exports = config;
