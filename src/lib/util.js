module.exports = {
  base: 'https://www.youtube.com',
  sub: (x, y, z = 0, a, b = 0) => x.substring(x.indexOf(y) + z, x.indexOf(a, x.indexOf(y) + z) + b),
  hmsToMs: x => {
    let r = 0
    x = x.split(':').reverse()
    if (x[0]) r += x[0] * 1000
    if (x[1]) r += x[1] * 60000
    if (x[2]) r += x[2] * 3600000
    return r
  },
  msToHms: x => {
    let t = new Date(x).toISOString().substr(11, 8).split(':')
    let h = Math.floor(x / 1000 / 60 / 60).toString()
    if (h > 23) t[0] = h
    while (t.length > 2 && t[0] === '00' && t[1].startsWith('0')) {
      t.shift()
    }
    if (t.length > 2 && t[0] === '00') t.shift()
    if (t[0].startsWith('0')) t[0] = t[0].substr(1)
    return t.join(':')
  },
  getThumb: x => x.indexOf('hqdefault') >= 0 ? `https://i3.ytimg.com/vi/${x.match(/vi\/(.*?)\//)[1]}/mqdefault.jpg` : x,
  formatStat: (x, y) => Number(x.substr(0, x.indexOf(y)).trim().replace(/,/g, ''))
}
