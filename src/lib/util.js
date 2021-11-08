let main = {
  base: 'https://www.youtube.com',
  error: x => new Error(x),
  between: (str, a, b, c = 0, d = 0) => {
    if (a instanceof RegExp) a = str.match(a)[0]
    let x = str.indexOf(a)
    if (x === -1) return null
    let y = str.indexOf(b, x)
    if (!b) y = str.length
    return str.substring(x + a.length + d, y + c)
  },
  num: x => {
    if (!x) return null
    if (typeof x !== 'string') x = main.text(x)
    return Number(x.split(' ')[0].replace('K', '000').replace('M', '000000').replace(/[.,]/g, ''))
  },
  date: x => {
    if (!x) return null
    return x.replace(/(Last updated on|Joined|Premiered|Streamed live on|Started streaming on)/, '').trim()
  },
  text: x => x ? (typeof x === 'string') ? x.replace(/\+/g, ' ') : x.simpleText || x.runs.map(x => x.text).join('') : null,
  hmsToMs: x => {
    if (!x) return null
    let r = 0
    x = x.split(':').reverse()
    if (x[0]) r += x[0] * 1000
    if (x[1]) r += x[1] * 60000
    if (x[2]) r += x[2] * 3600000
    return r
  },
  parse: x => {
    let pointer = 'window["ytInitialData"] = '
    if (x.indexOf(pointer) < 0) pointer = 'var ytInitialData = '
    return main.between(x, pointer, '};', 1)
  },
  removeEmpty: x => {
    Object.keys(x).forEach(function (key) {
      if (x[key] && typeof x[key] === 'object') main.removeEmpty(x[key])
      else if (x[key] === undefined || x[key] === null) delete x[key]
      if (typeof x[key] === 'object' && Object.keys(x[key]).length === 0 && !(x[key] instanceof Date)) delete x[key]
    })
    return x
  },
  findWithKey: (x, key) => {
    let a = x.find(y => y[key])
    return a ? a[key] : null
  },
  findLastWithKey: (x, key) => {
    return main.findWithKey(x.slice().reverse(), key)
  }
}

module.exports = main
