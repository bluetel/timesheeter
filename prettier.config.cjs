/** @type {import("prettier").Config} */
const config = {
  tabWidth: 2,
  semi: true,
  printWidth: 120,
  trailingComma: 'es5',
  singleQuote: true,
  plugins: [require.resolve('prettier-plugin-tailwindcss')],
};

module.exports = config;
