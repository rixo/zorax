import * as path from 'path'
import * as fs from 'fs'
import pm from 'picomatch'
import CheapWatch from 'cheap-watch'

import relativeMatcher from './find/relative-matcher.js'
import {
  fileMatcher,
  nope,
  joinGlob,
  toPosixSlashes,
  UserError,
} from './util.js'
import Debug from './debug.js'
import { actionRunner } from './action.js'
import Log from './util/log.js'

// if true, then patterns get ignored as soon as one of their parent dir is
// ignored by their deep parent
//
//     pattern: '**/*.spec.js'
//     ignore: '**/node_modules'
//
//     pattern: 'node_modules/my-lib' // gets ignored
//
//     pattern: 'node_modules/my-lib/*' // gets ignored
//
const MERGE_IN_DEEP_PARENTS = false
const MERGE_FILENAMES = false

const debug = Debug('zoar:watch')

const relativeGlob = (...base) => glob =>
  toPosixSlashes(path.posix.join(...base, glob))

const relativeTo = base => name => path.relative(base, name)

const startsWithDoubleStar = pattern =>
  pattern.startsWith('**') || pattern.startsWith('!**')

const isUpAny = pattern =>
  pattern.startsWith('../**') || pattern.startsWith('..\\**')

const relativeIgnorePattern = dir => pattern => {
  // NOTE ** patterns are _already_ absolute
  if (startsWithDoubleStar(pattern)) {
    return pattern
  }
  const { prefix, base, glob } = pm.scan(pattern)
  const relative = joinGlob(path.relative(dir, base), glob)
  const resolved = isUpAny(relative) ? relative.substr(3) : relative
  return prefix + resolved
}

const uniq = array => [...new Set(array)]

const relativeIgnorePatterns = (dir, patterns) =>
  uniq(
    patterns.map(relativeIgnorePattern(dir)).filter(s => !/^\!?\.\./.test(s))
  )

export const mergeTargets = args => {
  const { filenames, patterns, ignorePatterns } = relativeMatcher(args, true)

  const targetsByDir = {}

  const getTarget = dir => {
    if (!targetsByDir[dir]) {
      targetsByDir[dir] = {
        deep: false,
        dir,
        filenames: [],
        globs: [],
        deepGlobs: [],
      }
    }
    return targetsByDir[dir]
  }

  if (filenames && filenames.length > 0) {
    for (const filename of filenames) {
      // accept directories as dir/**
      try {
        if (fs.statSync(filename).isDirectory()) {
          getTarget(filename).deepGlobs.push('**')
          continue
        }
      } catch (err) {
        if (!(err && err.code === 'ENOENT')) {
          throw err
        }
      }
      const dir = path.dirname(filename)
      getTarget(dir).filenames.push(filename)
    }
  }

  if (patterns && patterns.length > 0) {
    for (const pattern of patterns) {
      const { base, glob } = pm.scan(pattern)
      const isDeep = glob.includes('**')
      const target = getTarget(base)
      const dest = target[isDeep ? 'deepGlobs' : 'globs']
      dest.push(glob)
      if (isDeep) {
        target.deep = true
      }
    }
  }

  // merge
  const formatTarget = ({ filenames, globs, deepGlobs, ...target }) => ({
    ...target,
    filenames: filenames.map(relativeTo(target.dir)),
    globs: [...deepGlobs, ...globs],
    ignore: relativeIgnorePatterns(target.dir, ignorePatterns),
  })

  if (!MERGE_IN_DEEP_PARENTS) {
    const targets = Object.values(targetsByDir)
    return targets.map(formatTarget)
  }

  // TODO dead code
  const targets = Object.values(targetsByDir)
  const deepTargets = []
  const shallowTargets = targets
    .filter(target => {
      if (target.deep) {
        deepTargets.push(target)
        return false
      } else {
        return true
      }
    })
    .filter(target => {
      const { dir } = target
      const parent = deepTargets.find(({ dir: parentDir }) =>
        dir.startsWith(parentDir)
      )
      if (parent) {
        const relation = path.relative(parent.dir, dir)
        const relative = relativeGlob(relation)
        parent.globs.push(...target.globs.map(relative))
        parent.deepGlobs.push(...target.deepGlobs.map(relative))
        if (MERGE_FILENAMES || target.filenames.length === 0) {
          parent.filenames.push(...target.filenames)
          return false
        } else {
          return true
        }
      }
      return true
    })

  return [...deepTargets, ...shallowTargets].map(formatTarget)
}

const compileTarget = ({ dir, deep, filenames, globs, ignore }) => {
  const isFileMatch = fileMatcher(filenames)
  const isGlobMatch = pm(globs, { dot: true })

  const isIgnored = pm(ignore, { dot: true })

  const isMatch = x => isFileMatch(x) || (!isIgnored(x) && isGlobMatch(x))

  const isDirMatch = deep ? x => !isIgnored(x) : nope

  return { dir, isMatch, isDirMatch }
}

export const watchAction = async (input, initialOptions, extra) => {
  const { watch, files } = input
  let options = { ...initialOptions }

  const {
    watchDebounce = 20,
    watchFilenames,
    dump: isDump,
    interactive: isInteractive,
  } = options

  let timeout = null

  let doRun

  const setOptions = (opts, andRun = false) => {
    options = Object.assign(options, opts)
    doRun = actionRunner({ input: { files }, options })
    if (andRun) {
      return run()
    }
  }

  setOptions(null, false)

  const run = () => {
    clearTimeout(timeout)
    timeout = null
    debug('run', timeout)
    return doRun(null, options).catch(err => {
      Log.error((err && err.stack) || err)
    })
  }

  const onChange = ({ path, stats }) => {
    debug('changed', path)
    // if we get a change on a directory, we just bounce existing calls, we
    // don't schedule a new one if none is already planned
    if (stats.isDirectory() && timeout === null) {
      return
    }
    clearTimeout(timeout)
    timeout = setTimeout(run, watchDebounce)
  }

  const targets = mergeTargets(watch)

  const dump = () => {
    Log.inspect(targets, { depth: null, colors: process.stdout.isTTY })
  }

  const dumpInput = () => {
    Log.inspect(input)
  }

  if (isDump === 'watch') {
    dump()
    process.exit()
  }

  // protected against unintentional expension of:
  //
  //     zoar *.spec.js
  //
  // into:
  //
  //     zoar a.spec.js b.spec.js etc
  //
  // the problem is especially nasty in a case like the following, where the
  // command doesn't do what it seems to do at all:
  //
  //     zoar -w *.spec.js
  //
  if (!watchFilenames) {
    const hasFilenames = ({ filenames }) => filenames.length > 0
    const getFilenames = o => o.filenames
    const filenames = targets.filter(hasFilenames).flatMap(getFilenames)
    if (filenames.length > 0) {
      const received = filenames.flat().join(', ')
      throw new UserError(
        `Watch patterns must be glob patterns (--watch-filenames to bypass). Received: ${received}`
      )
    }
  }

  // interactive cli
  if (isInteractive) {
    import('./watch-interactive.js')
      .then(({ default: interactive }) => {
        interactive({
          setOptions,
          options,
          run,
          dump,
          dumpInput,
          initialOptions,
          extra,
        })
      })
      .catch(err => {
        Log.error(
          'failed to init interative watch cli',
          (err && err.stack) || err
        )
      })
  }

  await run()

  // watch
  {
    const files = []

    await Promise.all(
      targets.map(compileTarget).map(async ({ dir, isMatch, isDirMatch }) => {
        const watch = new CheapWatch({
          watch: true,
          dir,
          filter: ({ path: p, stats }) =>
            stats.isDirectory() ? isDirMatch(p) : isMatch(p),
        })
        await watch.init()
        if (debug.enabled) {
          files.push(
            ...[...watch.paths.keys()].map(file => path.join(dir, file))
          )
        }
        watch.on('+', onChange)
        watch.on('-', onChange)
      })
    )

    debug('watching', files)
  }
}
