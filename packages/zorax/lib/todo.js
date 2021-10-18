/**
 * zorax.todo
 *
 * TODO
 */

export default () => ({
  name: 'zorax.todo',
  decorate: t => {
    t.test.todo = title => t.skip(title)
  },
})
