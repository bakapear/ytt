export function stb (str) {
  return [str.length, ...(Array.isArray(str) ? str : Buffer.from(str))]
}

export function between (str, a, b, c = 0, d = 0) {
  if (!str) return null
  if (a instanceof RegExp) a = str.match(a)?.[0]
  let x = str.indexOf(a)
  if (x === -1) return null
  let y = str.indexOf(b, x)
  if (!b) y = str.length
  return str.substring(x + a.length + d, y + c)
}

export function removeEmpty (obj) {
  for (let key in obj) {
    if (obj[key] && typeof obj[key] === 'object') removeEmpty(obj[key])
    if (obj[key] === undefined || obj[key] === null) delete obj[key]
  }
  return obj
}

export function isEmpty (obj, full) {
  if (full) obj = removeEmpty(obj)
  for (let o in obj) return false // eslint-disable-line no-unreachable-loop
  return true
}

export function extend (target) {
  for (let i = 1; i < arguments.length; ++i) {
    let from = arguments[i]
    if (typeof from !== 'object') continue
    for (let j in from) {
      if (Object.prototype.hasOwnProperty.call(from, j)) {
        target[j] = typeof from[j] === 'object'
          ? extend({}, target[j], from[j])
          : from[j]
      }
    }
  }
  return target
}

export function text (obj) {
  if (!obj) return null
  if (typeof obj === 'string') return obj
  return obj.simpleText || obj.runs.map(x => x.text).join('')
}

export function time (str) {
  if (!str) return null
  if (typeof str !== 'string') str = text(str)
  let r = 0
  str = str.split(':').reverse()
  if (str[0]) r += str[0] * 1000
  if (str[1]) r += str[1] * 60000
  if (str[2]) r += str[2] * 3600000
  return r
}

export function num (str) {
  if (!str) return null
  if (typeof str !== 'string') str = text(str)
  return Number(str.split(' ')[0].replace('K', '000').replace('M', '000000').replace(/[.,]/g, ''))
}

export function date (str) {
  if (!str) return null
  if (typeof str !== 'string') str = text(str)
  return str.replace(/(Started streaming on|Streamed live on|Streamed|Premiered|Joined)/, '').trim()
}

export function next (data, prop) {
  if (!data[prop].continuation) return
  this[prop] = []
  Object.defineProperties(this[prop], {
    continuation: { enumerable: false, writable: true, value: data[prop].continuation },
    fetch: { enumerable: false, value: data[prop].fetch },
    next: {
      enumerable: false,
      value: async (steps = 1) => {
        let step = 0
        let last = this[prop].length
        while (this[prop].continuation && step++ < steps) {
          let res = await this[prop].fetch(this[prop].continuation)
          this[prop].continuation = res.continuation
          this[prop].push(...res.items)
        }
        return this[prop].slice(last)
      }
    }
  })
}

export async function more (fn, data) {
  let res = data ? await fn(null, data) : []

  let items = res.items

  Object.defineProperties(items, {
    continuation: { value: res.continuation, enumerable: false, writable: true },
    next: {
      value: async (steps = 1) => {
        let step = 0
        let last = items.length
        while (items.continuation && step++ < steps) {
          let res = await fn(items.continuation)
          items.continuation = res.continuation
          items.push(...res.items)
        }
        return items.slice(last)
      }
    }
  })

  return items
}
