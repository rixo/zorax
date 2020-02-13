const pass = value => fn => fn(value)

const matcher = pattern => {
  const patternLc = pattern.toLowerCase()
  return x => x && x.toLowerCase().includes(patternLc)
}

const notMatcher = pattern => {
  const patternLc = pattern.toLowerCase()
  return x => !(x && x.includes(patternLc))
}

const createFilter = filter => {
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
  const isMatch = matcher(filter)
  // for debug
  isMatch.input = filter
  return isMatch
}

export default () => {
  let isMatch = null

  return {
    name: 'zorax.filter',

    description: 'filter test by title',

    harness(h, { options: { skip: useSkip = false } }) {
      h.filter = filter => {
        isMatch = createFilter(filter)
      }

      const { test, skip } = h
      h.test = async (desc, ...args) => {
        if (isMatch != null && !isMatch(desc)) {
          if (useSkip) {
            return skip(desc, ...args)
          }
          return
        }
        return test(desc, ...args)
      }
    },
  }
}
