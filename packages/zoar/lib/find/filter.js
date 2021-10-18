import { basename } from 'path'

const pass = value => fn => fn(value)

const matcher = pattern => {
  const patternLc = pattern.toLowerCase()
  return x =>
    x &&
    basename(x)
      .toLowerCase()
      .includes(patternLc)
}

const notMatcher = pattern => {
  const patternLc = pattern.toLowerCase()
  return x => !(x && basename(x).includes(patternLc))
}

export const createMatcher = filter => {
  if (filter == null) return null

  if (Array.isArray(filter)) {
    const include = []
    const exclude = []

    filter.flat().forEach(pattern => {
      const negated = pattern.slice(0, 1) === '!'
      if (negated) {
        exclude.push(matcher(pattern.slice(1)))
      } else {
        include.push(matcher(pattern))
      }
    })

    return include.length > 0 && exclude.length > 0
      ? x => !exclude.some(pass(x)) && include.some(pass(x))
      : include.length > 0
      ? x => include.some(pass(x))
      : exclude.length > 0
      ? x => !exclude.some(pass(x))
      : null
  }

  if (filter.slice(0, 1) === '!') {
    const pattern = filter.slice(1)
    return notMatcher(pattern)
  }

  return matcher(filter)
}
