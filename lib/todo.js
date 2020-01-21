/**
 * zorax.todo
 */

export default () => ({
  name: 'zorax.todo',
  decorate: t => {
    t.test.todo = title => t.skip(title)
  },
})
