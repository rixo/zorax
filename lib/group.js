import { isFunction, Deferred, FatalError } from './_util'

const callWith = (...args) => fn => fn(...args)

const enforceNoAsync = result => {
  if (result && isFunction(result.then) && isFunction(result.catch)) {
    throw new Error('group / describe / it handlers cannot be async')
  }
}

const createRootContext = ({ test, skip, only }) => {
  const ctx = { children: [] }

  ctx.test = test

  ctx.skip = skip

  ctx.only = only

  ctx.group = title => group(ctx, title)

  ctx.flush = async () => {}

  return ctx
}

const group = ({ test }, title) => {
  let tasks = []
  const ctx = { title }

  const { promise: whenFlushed, resolve, reject } = Deferred()
  const flushed = err => (err ? reject(err) : resolve())

  ctx.test = (...args) =>
    new Promise((resolve, reject) => {
      tasks.push(t => {
        t.test(...args).then(resolve, reject)
      })
    })

  ctx.skip = (...args) =>
    new Promise((resolve, reject) => {
      tasks.push(t => {
        t.skip(...args).then(resolve, reject)
      })
    })

  ctx.only = (...args) =>
    new Promise((resolve, reject) => {
      tasks.push(t => {
        t.only(...args).then(resolve, reject)
      })
    })

  ctx.group = title => group(ctx, title)

  const createGroupTest = () =>
    new Promise(resolve => {
      test(title, async t => {
        resolve(t)
        await whenFlushed
      })
    })

  ctx.flush = async () => {
    if (tasks.length < 1) {
      flushed()
      return
    }

    const t = await createGroupTest()

    const currentTasks = tasks
    tasks = []

    currentTasks.forEach(callWith(t))

    flushed()
  }

  return ctx
}

export default () => ({
  name: 'zorax.group',

  description: 'group top level test (without defer)',

  harness(h) {
    let root = createRootContext(h)
    let cur = root

    h.group = (title, handler) => {
      if (!handler) {
        if (cur !== root) {
          throw new FatalError(
            "group('...') with no handler is only allowed at top level"
          )
        }
        root.flush()
        root = cur = cur.group(title)
        return
      }

      const prev = cur
      const ctx = cur.group(title)

      cur = ctx

      enforceNoAsync(handler())

      ctx.flush()

      cur = prev
    }

    h.test = (...args) => cur.test(...args)

    h.skip = (...args) => cur.skip(...args)

    h.only = (...args) => cur.only(...args)

    if (h.report) {
      const { report } = h
      h.report = async (...args) => {
        await root.flush()
        return report.call(h, ...args)
      }
    }
  },
})
