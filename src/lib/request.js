let https = require('https')

module.exports = {
  base: 'https://www.youtube.com/',
  path: 'youtubei/v1/',
  key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
  client: '1',
  version: '2.21111111',
  hl: 'en',
  gl: 'US',
  async head (url, query) {
    return await request(url, {
      method: 'HEAD',
      base: this.base,
      query
    }).catch(e => null)
  },
  async text (url, query) {
    return await request(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Safari/' },
      base: this.base,
      query,
      raw: true
    }).catch(e => null)
  },
  async api (type, data) {
    return await request(type, {
      method: 'POST',
      headers: { 'User-Agent': 'AppleWebKit Chrome/96' },
      base: this.base + this.path,
      query: { key: this.key },
      data: {
        context: { client: { hl: this.hl, gl: this.gl, clientName: this.client, clientVersion: this.version } },
        ...data
      }
    }).catch(e => null)
  }
}

function request (url, opts = {}) {
  url = new URL(url, opts.base)
  if (opts.query) url.search = new URLSearchParams(opts.query)
  opts.host = url.host
  opts.path = url.pathname + url.search
  let error = false
  return new Promise((resolve, reject) => {
    let req = https.request(opts, (res, data = '') => {
      if (res.statusCode >= 400) error = true
      if (res.statusCode >= 300 && res.statusCode < 400) return resolve(null)
      res.setEncoding(opts.encoding)
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (req.method === 'HEAD') return resolve(res.statusCode)
        try { res.body = JSON.parse(data) } catch (e) { return resolve(opts.raw ? data : null) }
        if (error) reject(res.body.error)
        else resolve(res.body)
      })
    })
    req.on('error', e => reject(e))
    if (opts.data) req.write(JSON.stringify(opts.data))
    req.end()
  })
}
