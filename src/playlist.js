let dp = require('despair')
let util = require('./lib/util')
let valid = require('./valid')
let builder = require('./lib/builder')

module.exports = async function (id, opts = {}) {
  id = await formatId(id, opts.title)
  let data = await getPlaylistData(id)
  let playlist = builder.makePlaylistObject(data)
  let min = Number(opts.min)
  let max = Number(opts.max)
  if (opts.full === true) while (playlist.items.continuation) await playlist.items.more()
  else {
    if (!isNaN(min)) while (playlist.items.continuation && playlist.items.length < min) await playlist.items.more()
    if (!isNaN(max)) if (playlist.items.length > max) playlist.items.length = max
  }
  return playlist
}

async function formatId (id, title) {
  if (Array.isArray(id)) {
    for (let i = 0; i < id.length; i++) {
      if (!await valid(id[i], 'video')) throw util.error(`Invalid video ID: '${id[i]}'`)
    }
    id = await getPlaylistLink(id, title)
  } else if (!await valid(id, 'playlist')) throw util.error(`Invalid playlist ID: ${id}`)
  return id
}

async function getPlaylistData (id, retries = 5) {
  if (retries <= 0) throw util.error('Failed to fetch the YouTube page properly!')
  let body = await dp('playlist', {
    base: util.base,
    headers: { 'Accept-Language': 'en-US' },
    query: { list: id }
  }).text()
  body = util.parse(body)
  try { body = JSON.parse(body) } catch (e) { return getPlaylistData(id, --retries) }
  return body
}

async function getPlaylistLink (ids, title, retries = 5) {
  if (retries <= 0) throw util.error('Failed to fetch the YouTube page properly!')
  let body = await dp('watch_videos', {
    base: util.base,
    headers: { 'Accept-Language': 'en-US' },
    query: { video_ids: ids, title: title }
  }).text()
  body = util.parse(body)
  try { body = JSON.parse(body) } catch (e) { return getPlaylistLink(ids, title, --retries) }
  return body.currentVideoEndpoint.watchEndpoint.playlistId
}
