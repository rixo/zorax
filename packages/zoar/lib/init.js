import * as path from 'path'

import * as fsp from './util/fsp'
import * as df from './defaults'
import Log from './log'

const { rcFile } = df

export const init = async ({ cwd, force }) => {
  const file = path.resolve(cwd, rcFile)
  const template = path.resolve(__dirname, 'init-zoarrc-template.js')
  if (await fsp.exists(file)) {
    if (force) {
      Log.info(`Overwriting existing file (option --force): ${file}`)
    } else {
      const msg = `File already exists: ${file}.\nUse --force option to recreate`
      Log.log(msg)
      process.exit(4)
    }
  }
  await fsp.copyFile(template, file)
}
