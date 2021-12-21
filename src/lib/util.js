module.exports = {
  stb (str) {
    return [str.length, ...(Array.isArray(str) ? str : Buffer.from(str))]
  },
  between (str, a, b, c = 0, d = 0) {
    if (!str) return null
    if (a instanceof RegExp) a = str.match(a)?.[0]
    let x = str.indexOf(a)
    if (x === -1) return null
    let y = str.indexOf(b, x)
    if (!b) y = str.length
    return str.substring(x + a.length + d, y + c)
  },
  removeEmpty (obj) {
    for (let key in obj) {
      if (obj[key] && typeof obj[key] === 'object') this.removeEmpty(obj[key])
      if (obj[key] === undefined || obj[key] === null) delete obj[key]
    }
    return obj
  },
  isEmpty (obj, full) {
    if (full) obj = this.removeEmpty(obj)
    for (let o in obj) return false // eslint-disable-line no-unreachable-loop
    return true
  },
  extend (target) {
    for (let i = 1; i < arguments.length; ++i) {
      let from = arguments[i]
      if (typeof from !== 'object') continue
      for (let j in from) {
        if (Object.prototype.hasOwnProperty.call(from, j)) {
          target[j] = typeof from[j] === 'object'
            ? this.extend({}, target[j], from[j])
            : from[j]
        }
      }
    }
    return target
  },
  text (obj) {
    if (!obj) return null
    return obj.simpleText || obj.runs.map(x => x.text).join('')
  },
  time (str) {
    if (!str) return null
    if (typeof str !== 'string') str = this.text(str)
    let r = 0
    str = str.split(':').reverse()
    if (str[0]) r += str[0] * 1000
    if (str[1]) r += str[1] * 60000
    if (str[2]) r += str[2] * 3600000
    return r
  },
  num (str) {
    if (!str) return null
    if (typeof str !== 'string') str = this.text(str)
    return Number(str.split(' ')[0].replace('K', '000').replace('M', '000000').replace(/[.,]/g, ''))
  },
  date (str) {
    if (!str) return null
    if (typeof str !== 'string') str = this.text(str)
    return str.replace(/(Joined|Started streaming on)/, '').trim()
  },
  next (data, prop) {
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
}
