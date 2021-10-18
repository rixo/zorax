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
    const adds = []
    const subs = []
    filter.flat().forEach(pattern => {
      const mod = pattern.slice(0, 1)
      if (mod === '+') {
        adds.push(matcher(pattern.slice(1)))
      } else if (mod === '-') {
        subs.push(matcher(pattern.slice(1)))
      } else {
        include.push(matcher(pattern))
      }
    })
    return x => {
      const passes = pass(x)
      if (subs.length && subs.some(passes)) {
        return false
      }
      if (adds.length && !adds.every(passes)) {
        return false
      }
      if (include.length && !include.some(passes)) {
        return false
      }
      return true
    }
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
