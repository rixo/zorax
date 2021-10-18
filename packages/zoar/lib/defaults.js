export const CLI = 'zoar'

export const defaultFilePattern = '*.spec.js'
// export const defaultWatchPattern = '{src,lib,test}/**/*.js'
export const defaultWatchPattern = '*'
export const defaultWatchDirs = '.'
export const defaultIgnore = ['**/node_modules', '**/.git', '**/*.bak']

export const rcFile = '.zoarrc.js'

export const matchOptions = {
  basename: true,
}

export const defaultConfig = {
  files: ['**/*.spec.js', '**/*.spec.ts'],
  ignore: defaultIgnore,
  watch: '**/*',
}
