module.exports = {
  files: ['test/**/*.spec.js', '!test/find/sample'],

  watch: ['**/*.{js,css,html,json}'],

  ignore: ['**/node_modules', '**/.git', 'dist'],

  watchDebounce: 20,

  map: true,
}
