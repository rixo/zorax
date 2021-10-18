const path = require('path')

const readConfig = async rcPath => {
  if (!rcPath) return
  const { default: config } = await import(rcPath)
  return { cwd: path.dirname(rcPath), ...config }
}

const importModule = mod => import(mod)

module.exports = { readConfig, importModule }
