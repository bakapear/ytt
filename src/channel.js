let dp = require('despair')
let util = require('./lib/util')
let builder = require('./lib/builder')

module.exports = async function (id, opts = {}) {
  if (!id) throw util.error(`Invalid channel ID: '${id}'`)
  let type = await getQueryType(id)
  let data = await getChannelData(id, type)
  let channel = builder.makeChannelObject(data)
  return channel
}

async function getChannelData (id, type, retries = 5) {
  if (retries <= 0) throw util.error('Failed to fetch the YouTube page properly!')
  let body = await dp(type + '/' + id + '/about', {
    base: util.base,
    headers: { 'Accept-Language': 'en-US' }
  }).text()
  if (!body) throw util.error(`Invalid channel ID: '${id}'`)
  body = util.parse(body)
  try { body = JSON.parse(body) } catch (e) { return getChannelData(id, type, --retries) }
  return body
}

async function getQueryType (id) {
  let types = ['channel', 'user']
  for (let i = 0; i < types.length; i++) {
    let { statusCode } = await dp.head(types[i] + '/' + id, { base: util.base }).catch(e => { return { statusCode: e.code } })
    if (statusCode === 200) return types[i]
  }
}
