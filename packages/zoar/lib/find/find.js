/**
 * find test files
 */
import * as path from 'path'
import CheapWatch from 'cheap-watch'
import pm from 'picomatch'

import * as fsp from '../util/fsp.js'
import relativeMatcher from './relative-matcher.js'
import { createMatcher } from './filter.js'

const relative = (cwd, pattern) => ({ pattern, cwd })

const simplifyIgnore = ignores => {
  // merge by cwd
  const byCwd = {}
  for (const { cwd, pattern } of ignores) {
    if (!byCwd[cwd]) {
      byCwd[cwd] = { cwd, patterns: new Set() }
    }
    const patterns = byCwd[cwd].patterns
    if (Array.isArray(pattern)) {
      for (const _pattern of pattern) {
        patterns.add(_pattern)
      }
    } else {
      patterns.add(pattern)
    }
  }
  return Object.values(byCwd).map(({ patterns: patternSet, ...ignore }) => {
    // dedup
    const patterns = [...patternSet]
    return {
      // ['single'] => 'single'
      pattern: patterns.length === 1 ? patterns[0] : patterns,
      ...ignore,
    }
  })
}

// - files are replaced
// - ignore are accumulated
export const mergeInputs = (...inputs) => {
  const merged = inputs
    .filter(Boolean)
    .reduce((merged, { files, watch, ignore, cwd }) => {
      if (files && files.length) {
        merged.files = {
          pattern: files,
          cwd,
        }
      }
      if (watch) {
        if (!merged.watch) {
          merged.watch = {
            pattern: [],
          }
        }
        if (cwd) {
          merged.watch.cwd = cwd
        }
        if (typeof watch !== 'boolean') {
          merged.watch.pattern.push({ cwd, pattern: watch })
        }
      }
      if (ignore && ignore.length) {
        const previousIgnores = merged.ignore || []
        merged.ignore = [...previousIgnores, relative(cwd, ignore)]
      }
      return merged
    }, {})

  if (merged.watch) {
    // disable watch if not enabled by cli (last input layer)
    const last = inputs[inputs.length - 1]
    if ((last && !last.watch) || merged.watch.pattern.length === 0) {
      delete merged.watch
    }
  }

  if (merged.ignore) {
    const ignore = simplifyIgnore(merged.ignore)

    if (merged.files) {
      merged.files.ignore = ignore
    }
    if (merged.watch) {
      merged.watch.ignore = ignore
    }

    delete merged.ignore
  }

  return merged
}

const makeFilter = (dir, pattern, isIgnored, deep) => {
  const isMatch = pm(pattern)
  return ({ path: p, stats }) => {
    const fullPath = path.resolve(dir, p)
    if (stats.isDirectory()) {
      if (deep) {
        return !isIgnored(fullPath)
      } else {
        return false
      }
    } else {
      return !isIgnored(fullPath) && isMatch(fullPath)
    }
  }
}

const findFiles = async (dir, filter, files) => {
  const watch = new CheapWatch({ watch: false, dir, filter })
  await watch.init()
  const abs = p => path.join(dir, p)
  for (const [path, stats] of watch.paths) {
    if (!stats.isDirectory()) {
      files.add(abs(path))
    }
  }
}

const formatFiles = (iterable, filter) => {
  if (!filter || !filter.length) {
    return [...iterable]
  }
  const result = []
  const isMatch = createMatcher(filter)
  iterable.forEach(item => {
    if (isMatch(item)) {
      result.push(item)
    }
  })
  return result
}

const find = async (findArgs, { filter } = {}) => {
  const { filenames, patterns, isIgnored } = relativeMatcher(findArgs, true)

  const promises = []
  const files = new Set()

  if (filenames && filenames.length > 0) {
    promises.push(
      ...filenames.map(async filename => {
        const exists = await fsp.exists(filename)
        if (!exists) {
          throw new Error('File not found: ' + filename)
        }
        files.add(filename)
      })
    )
  }

  if (patterns && patterns.length > 0) {
    const byDirs = []
    for (const pattern of patterns) {
      const { base, glob } = pm.scan(pattern)
      if (!byDirs[base]) {
        byDirs[base] = {
          dir: base,
          globs: [],
          deepGlobs: [],
        }
      }
      const isDeep = glob.includes('**')
      const dest = isDeep ? byDirs[base].deepGlobs : byDirs[base].globs
      dest.push(pattern)
    }

    promises.push(
      ...Object.values(byDirs).flatMap(({ dir, globs, deepGlobs }) => {
        const promises = []
        if (globs.length > 0) {
          const filter = makeFilter(dir, globs, isIgnored, false)
          promises.push(findFiles(dir, filter, files))
        }
        if (deepGlobs.length > 0) {
          const filter = makeFilter(dir, deepGlobs, isIgnored, true)
          promises.push(findFiles(dir, filter, files))
        }
        return promises
      })
    )
  }

  await Promise.all(promises)

  return formatFiles(files, filter)
}

export default find
