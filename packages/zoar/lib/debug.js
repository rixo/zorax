import Debug from 'debug'

const k = v => {
  if (!v) return ''
  const entries = Object.entries(v)
    .map(([k, v]) => `'${k}': ${v ? '...' : v}`)
    .join(',')
  return `{ ${entries} }`
}

const h = v => {
  const maxLen = 50
  const s = String(v).replace(/\n/g, ' ')
  const l = s.length
  return s.substr(0, maxLen) + (l < maxLen ? '' : '...')
}

Object.assign(Debug.formatters, { k, h })

export default Debug
