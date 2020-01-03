let dp = require('despair')
let util = require('./util.js')
let playlist = require('./playlist.js')

module.exports = async function (...args) {
  let mult = false
  let id = null
  if (args.length === 1) {
    id = args[0]
    mult = id.constructor === Array
    if (mult) id = id.join(',')
  } else {
    id = args.join(',')
  }
  let body = await dp('watch_videos', {
    base: util.base,
    headers: { 'accept-language': 'en-US' },
    query: {
      disable_polymer: 1,
      video_ids: id
    }
  }).text()
  let playlistId = util.sub(body, 'data-full-list-id="', 19, '"')
  let pl = await playlist(playlistId)
  if (mult) return pl
  for (let i = 0; i < pl.items.length; i++) {
    let item = pl.items[i]
    delete item.index
    item.url = util.base + '/watch?v=' + item.id
  }
  if (pl.items.length === 1) return pl.items[0]
  return pl.items
}
