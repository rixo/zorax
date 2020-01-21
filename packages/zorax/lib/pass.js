/**
 * zorax/pass
 */

export default () => ({
  name: 'zorax.pass',
  test: t => {
    t.pass = (msg = 'pass called') => t.ok(true, msg)
  },
})
