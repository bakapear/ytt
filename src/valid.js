let dp = require('despair')
let util = require('./lib/util')
let format = require('./format')

module.exports = async function (value, type) {
  let item = format(value)
  if (type && item.type !== type) return false
  let prefix = ''
  if (item.type === 'video') prefix = '/watch?v='
  if (item.type === 'playlist') prefix = '/playlist?list='
  if (!prefix) throw util.error(`Not an ID: '${value}'`)
  let body = await dp('oembed', {
    base: util.base,
    query: { url: util.base + prefix + value }
  }).catch(e => { return { statusCode: 404 } })
  return body.statusCode === 200
}
