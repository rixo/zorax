const del = require('del')
const fs = require('fs').promises
const path = require('path')

// const prod = !!process.env.PUBLISH

const rimraf = () =>
  del('dist/*', {
    // dryRun: true,
  })

// const changePrivateFalse = contents => {
//   const pkg = JSON.parse(contents)
//   pkg.private = false
//   delete pkg.files
//   return JSON.stringify(pkg, null, 2)
// }

const dist = filename => path.resolve(__dirname, '..', 'dist', filename)

const copy = async (source, transform) => {
  const dest = dist(source)
  if (transform) {
    const contents = await fs.readFile(source, 'utf8')
    const transformed = transform(contents)
    await fs.writeFile(dest, transformed, 'utf8')
  } else {
    await fs.copyFile(source, dest)
  }
}

const run = async () => {
  await rimraf()
  await Promise.all([
    copy('README.md'),
    copy('yarn.lock'),
    fs.symlink('../package.json', 'dist/package.json'),
    fs.symlink('../node_modules', 'dist/node_modules'),
    fs.symlink('../test', 'dist/test'),
  ])
}

run().catch(err => {
  // eslint-disable-next-line no-console
  console.error((err && err.stack) || err)
  process.exit(1)
})
