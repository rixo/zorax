import * as path from 'path'

import { actionRunner } from './action.js'

import Log from './log.js'

const readStdin = onFiles =>
  new Promise((resolve, reject) => {
    const { stdin } = process

    let flushCount = 0
    let partial = ''
    let files = []
    let lastResult

    const emit = file => {
      if (file === '') {
        flush()
          .then(result => {
            lastResult = result
          })
          .catch(reject)
        partial = ''
        files = []
      } else {
        files.push(path.resolve(file))
      }
    }

    const flush = () => {
      flushCount++
      return Promise.resolve(onFiles(files)).catch(err => {
        Log.error((err && err.stack) || err)
      })
    }

    const append = chunk => {
      const next = partial ? partial + chunk : chunk
      const split = next.split('\n')
      partial = split.pop()
      for (const file of split) {
        emit(file)
      }
    }

    stdin.on('readable', () => {
      const chunk = stdin.read()
      if (chunk !== null) {
        append(chunk.toString('utf8'))
      }
    })

    stdin.on('end', () => {
      if (partial) {
        emit(partial)
      } else if (flushCount > 0 && !files.length) {
        // already flushed
        resolve(lastResult)
      } else {
        flush()
          .then(result => {
            if (flushCount === 1) {
              return result
            }
          })
          .then(resolve)
          .catch(reject)
      }
    })
  })

export const pipeAction = async (input, options) => {
  if (options.watch) {
    throw new Error('Cannot watch while reading from stdin')
  }
  const run = actionRunner({ input, options })
  return await readStdin(run)
}
