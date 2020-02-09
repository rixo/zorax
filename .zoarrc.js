module.exports = {
  // pattern(s) to find test files
  files: ['test/**/*.spec.js', '!test/find/sample'],

  // patterns of files to watch
  watch: ['**/*.{js,css,html,json}'],

  watchDebounce: 10,

  // we're watching dist for tests, so we ignore lib to avoid an early event and
  // possible bouncing of tests (running multiple times)
  ignore: ['**/node_modules', '**/.git', 'lib'],
}
