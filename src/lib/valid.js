let dp = require('despair')
let util = require('./util.js')

module.exports = async function (id = '') {
  let prefix = id.length === 34 ? '/playlist?list=' : '/watch?v='
  let body = await dp.head('oembed', {
    base: util.base,
    query: {
      url: util.base + prefix + id
    }
  }).catch(e => { return { statusCode: 404 } })
  return body.statusCode === 200
}
