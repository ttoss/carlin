module.exports = {
  purge: {
    mode: 'all',
    content: ['./components/**/*.tsx', './pages/**/*.tsx'],
  },
  // eslint-disable-next-line global-require
  plugins: [require('@tailwindcss/typography')],
  theme: {},
};
