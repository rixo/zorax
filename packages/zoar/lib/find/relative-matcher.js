import pm from 'picomatch'
import * as path from 'path'

import { nope, fileMatcher, toPosixSlashes } from '../util/index.js'

const resolveGlob = (...parts) => toPosixSlashes(path.resolve(...parts))

// (defaultCwd, string|{cwd, pattern})=> { cwd, pattern }
const resolveCwd = (cwd, pattern) =>
  pattern && pattern.pattern
    ? { pattern: pattern.pattern, cwd: pattern.cwd || cwd }
    : { cwd, pattern }

const relativePatternMatcher = (cwd, patternArg, negative = false) => {
  const negatedFilenames = []
  const filenames = []
  const negatedPatterns = []
  const patterns = []

  if (patternArg) {
    const resolvePattern = (pattern, _cwd) => {
      const { isGlob, negated, base, glob } = pm.scan(pattern)
      const absolutePattern =
        negative && pattern.startsWith('**')
          ? // NOTE **/ patterns are _already_ absolute!
            pattern
          : negative && pattern.startsWith('!**')
          ? pattern.slice(1)
          : // NOTE we can't join pattern cause it might be !negated
            resolveGlob(_cwd, base, glob)
      const target = isGlob //
        ? negated
          ? negatedPatterns
          : patterns
        : negated
        ? negatedFilenames
        : filenames
      target.push(absolutePattern)
    }

    // resolves { pattern: [], cwd }
    const resolve = inputPattern => {
      const { cwd: _cwd, pattern: _pattern } = resolveCwd(cwd, inputPattern)
      if (Array.isArray(_pattern)) {
        for (const pattern of _pattern) {
          resolvePattern(pattern, _cwd)
        }
      } else {
        resolvePattern(_pattern, _cwd)
      }
    }

    // resolves [{ pattern: [], cwd }, ...]
    if (Array.isArray(patternArg)) {
      patternArg.forEach(resolve)
    } else {
      resolve(patternArg)
    }
  }

  const isFileIgnored = negatedFilenames.length
    ? fileMatcher(negatedFilenames)
    : nope

  const isGlobIgnored = negatedPatterns.length
    ? pm(negatedPatterns, { dot: true })
    : nope

  const isGlobMatch = patterns.length ? pm(patterns, { dot: true }) : nope

  const isIgnored = x => isFileIgnored(x) || isGlobIgnored(x)

  const isMatch = x => !isIgnored(x) && isGlobMatch(x)

  const isFileMatch = filenames.length ? fileMatcher(filenames) : nope

  const isAnyMatch = x => isFileMatch(x) || isMatch(x)

  return {
    isMatch,
    isIgnored,
    isFileMatch,
    filenames,
    negatedFilenames,
    patterns,
    negatedPatterns,
    isAnyMatch,
  }
}

const relativeMatcher = ({ cwd, pattern, ignore } = {}, split = false) => {
  if (!pattern) return nope

  const {
    isAnyMatch: isIgnored,
    patterns: ignorePatterns,
    negatedPatterns: ignoreNegatedPatterns,
    filenames: ignoreFilenames,
    negatedFilenames: ignoreNegatedFilenames,
  } = relativePatternMatcher(cwd, ignore, true)

  const {
    isMatch,
    isFileMatch,
    isIgnored: isNegated,
    filenames,
    patterns,
    negatedPatterns,
  } = relativePatternMatcher(cwd, pattern)

  const _isMatch = x => isFileMatch(x) || (!isIgnored(x) && isMatch(x))

  if (split) {
    return {
      filenames,
      patterns,
      isFileMatch,
      isIgnored: x => isNegated(x) || isIgnored(x),
      ignorePatterns: [
        ...ignoreFilenames,
        ...ignoreNegatedFilenames.map(x => `!${x}`),
        ...ignorePatterns,
        ...ignoreNegatedPatterns.map(x => `!${x}`),
        ...negatedPatterns,
      ],
    }
  } else {
    return _isMatch
  }
}
// const relativeMatcher = ({ cwd, pattern, ignore } = {}) => {
//   if (!pattern) return nope
//
//   // const ignoreMatcher = filenameOverGlobMatcher(cwd, ignore)
//   // const { isMatch: isIgnored, isFileMatch: isFileIgnored } = ignoreMatcher
//   const isIgnored = relativePatternMatcher(cwd, ignore, false)
//
//   const { isMatch, isFileMatch } = relativePatternMatcher(cwd, pattern)
//
//   return x =>
//     // !isFileIgnored(x) && (isFileMatch(x) || (!isIgnored(x) && isMatch(x)))
//     isFileMatch(x) || (!isIgnored(x) && isMatch(x))
// }

export default relativeMatcher
