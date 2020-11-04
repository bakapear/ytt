let main = {
  base: 'https://www.youtube.com',
  error: x => new Error(x),
  between: (str, a, b, c = 0, d = 0) => {
    let x = str.indexOf(a)
    let y = str.indexOf(b, x)
    if (!b) y = str.length
    return str.substring(x + a.length + d, y + c)
  },
  stat: (x, y) => {
    if (!x) return
    x = x.replace('K', '000').replace('M', '000000').replace(/\./g, ',')
    return Number(x.substr(0, x.indexOf(y)).trim().replace(/,/g, ''))
  },
  text: x => (typeof x === 'string') ? x.replace(/\+/g, ' ') : x.simpleText || x.runs.map(x => x.text).join(''),
  hmsToMs: x => {
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
      else if (x[key] === undefined) delete x[key]
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
