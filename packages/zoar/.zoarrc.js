export default {
  // pattern(s) to find test files
  files: ['test/**/*.spec.js', '!test/find/sample'],

  // patterns of files to watch
  watch: ['**/*.{js,css,html,json}'],

  // patterns to always ignore when searching for files or watching
  ignore: [
    '**/node_modules',
    '**/.git',
    './examples',
    'test/**/sample',
    'dist/',
  ],
}
