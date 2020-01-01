let got = require('got')
let util = require('./util.js')

module.exports = async function (id = '') {
  let prefix = id.length === 34 ? '/playlist?list=' : '/watch?v='
  let body = await got.head('oembed', {
    prefixUrl: util.base,
    searchParams: {
      url: util.base + prefix + id
    }
  }).catch(e => { return { statusCode: 404 } })
  return body.statusCode === 200
}
