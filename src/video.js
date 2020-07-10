let dp = require('despair')
let util = require('./lib/util')
let valid = require('./valid')
let builder = require('./lib/builder')

module.exports = async function (id, opts = {}) {
  if (!await valid(id, 'video')) throw util.error(`Invalid video ID: '${id}'`)
  let data = await getVideoData(id)
  let video = builder.makeVideoObject(data)
  return video
}

async function getVideoData (id, retries = 5) {
  if (retries <= 0) throw util.error('Failed to fetch the YouTube page properly!')
  let body = await dp('watch_videos', {
    base: util.base,
    headers: { 'Accept-Language': 'en-US' },
    query: { video_ids: id }
  }).text()
  body = util.parse(body)
  try { body = JSON.parse(body) } catch (e) { return getVideoData(id, --retries) }
  return body
}
