import { fork } from 'child_process'
import npmRun from 'npm-run'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ensureArray = x => (x ? (Array.isArray(x) ? x : [x]) : [])

const parsePipes = ({
  ls,
  print,
  pipe,
  'pipe.run': runPipe,
  'pipe.ls': lsPipe,
  'pipe.print': printPipe,
  pipes,
}) => {
  if (!pipes) return null
  const source = pipe || (ls ? lsPipe : print ? printPipe : runPipe)
  return ensureArray(source)
}

const pipeline = (pipes, input, handleError) => {
  const children = []
  let last = { stdout: input }

  pipes.forEach((pipe, i) => {
    const isLast = i === pipes.length - 1
    const stdio = [last.stdout, isLast ? 'inherit' : 'pipe', 'inherit']

    last = npmRun.spawn(pipe, { stdio, shell: true, windowsHide: true })

    last.on('error', handleError)

    children.push(last)
  })

  const kill = signal =>
    children.every(child => {
      if (child.exitCode !== null) return true
      if (child._killed) return true
      if (!child.kill(signal)) return false
      child._killed = true
      return true
    })

  return { first: children[0], last, kill }
}

const forkRunner = (_options, exit) => {
  let cancelLast

  return (files, options = _options) =>
    new Promise((resolve, reject) => {
      if (cancelLast && !cancelLast()) {
        throw new Error('Staled test run')
      }

      const handleError = err => {
        cancelLast && cancelLast()
        reject(err)
      }

      const pipes = parsePipes(options)

      const { env: extraEnv = {} } = options

      const modulePath = path.resolve(__dirname, 'runner.js')
      const args = []
      const execArgv = []
      const env = { ...process.env, ...extraEnv }
      const forkOptions = {
        execArgv,
        env,
        stdio: ['ipc', 'inherit', 'inherit'],
      }

      if (pipes && pipes.length > 0) {
        forkOptions.stdio[1] = 'pipe'
      }

      // tsm
      const { tsm, module } = options
      if (tsm) {
        if (module) {
          execArgv.push('--loader')
        } else {
          execArgv.push('--require')
        }
        execArgv.push('tsm')
      }

      // --inspect --inspect-brk
      const { inspect, inspectBrk } = options
      if (inspectBrk) {
        execArgv.push('--inspect-brk')
      } else if (inspect) {
        execArgv.push('--inspect')
      }

      const entry = fork(modulePath, args, forkOptions)

      entry.on('error', handleError)

      let last = entry
      let killChildren

      // --pipe
      if (pipes && pipes.length > 0) {
        ;({ last, kill: killChildren } = pipeline(
          pipes,
          entry.stdout,
          handleError
        ))
      }

      last.on('exit', () => {
        if (exit) {
          process.exit(last.exitCode)
        } else {
          resolve()
        }
      })

      entry.on('message', msg => {
        if (msg === 'ready') {
          entry.send({ type: 'start', files, options })
        }
      })

      cancelLast = () => {
        cancelLast = null
        if (killChildren) {
          return killChildren('SIGTERM') || killChildren('SIGKILL')
        }
        return true
      }
    }).finally(() => {
      cancelLast = null
    })
}

const createForkRun = (input, options, exit) => {
  const forkRun = forkRunner(options, exit)

  return async (extraFiles, opts = options) => {
    const { default: find } = await import('./find.js')
    const files = await find(input.files, opts)
    const allFiles = extraFiles
      ? [...new Set([...files, ...extraFiles])]
      : files
    return forkRun(allFiles, opts)
  }
}

const createPrinter = (files, options, exit, footer) => async (
  filenames,
  opts = options
) => {
  const { printAction } = await import('./print.js')

  const pipes = parsePipes(options)

  if (pipes && pipes.length > 0) {
    return new Promise((resolve, reject) => {
      const { first, last } = pipeline(pipes, 'pipe', reject)
      last.on('exit', () => {
        if (exit) process.exit(last.exitCode)
        else resolve()
      })
      printAction({ files, footer, filenames, out: first.stdin }, opts)
        .catch(reject)
        .finally(() => {
          last.stdin.destroy()
        })
    })
  } else {
    return printAction({ files, footer, filenames }, opts)
  }
}

export const actionRunner = ({
  input: { files },
  options,
  footer = '\n',
  exit = false,
}) =>
  options.ls
    ? createPrinter(files, options, exit, footer)
    : createForkRun({ files }, options, exit)
