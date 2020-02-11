module.exports = {
  files: ['test/**/*.spec.js', '!test/find/sample'],

  watch: ['**/*.{js,css,html,json}'],

  watchDebounce: 10,

  ignore: ['**/node_modules', '**/.git', 'dist'],
}
