let { YoutubeVideo, YoutubePlaylist } = require('./lib/structs')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (playlistId, index) => {
  if (typeof playlistId !== 'string') throw Error('Invalid value')

  let body = await req.api('browse', { continuation: genToken(playlistId, index || 1) })
  if (!body.contents) throw Error('Invalid playlist')

  let list = makePlaylistObject(body)

  if (list.videos) {
    let res = await fetchVideos(null, body)
    list.videos.push(...res.items)
    list.videos.continuation = res.continuation
  }

  return util.removeEmpty(list)
}

function makePlaylistObject (data) {
  let micro = data.microformat.microformatDataRenderer
  let items = data.sidebar.playlistSidebarRenderer.items

  let info = items[0].playlistSidebarPrimaryInfoRenderer
  let owner = items[1].playlistSidebarSecondaryInfoRenderer.videoOwner.videoOwnerRenderer

  return new YoutubePlaylist({
    id: util.between(micro.urlCanonical, '='),
    unlisted: micro.unlisted || null,
    title: micro.title,
    description: micro.description,
    size: util.num(info.stats[0]) || 0,
    views: util.num(info.stats[1]) || 0,
    date: util.date(info.stats[2]),
    thumbnail: micro.thumbnail.thumbnails,
    channel: {
      id: owner.navigationEndpoint.browseEndpoint.browseId,
      legacy: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
      custom: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
      title: util.text(owner.title),
      avatar: owner.thumbnail.thumbnails
    },
    videos: { fetch: fetchVideos, continuation: !!data.onResponseReceivedActions }
  })
}

async function fetchVideos (next, data) {
  if (!data) data = await req.api('browse', { continuation: next })

  let contents = data.onResponseReceivedActions?.[0].appendContinuationItemsAction.continuationItems || []

  let token = contents[contents.length - 1]?.continuationItemRenderer?.continuationEndpoint.continuationCommand.token

  let res = []

  for (let item of contents) {
    if (!item.playlistVideoRenderer) continue
    let vid = item.playlistVideoRenderer
    let owner = vid.shortBylineText?.runs[0]
    if (owner) {
      res.push(new YoutubeVideo({
        id: vid.videoId,
        live: !vid.lengthSeconds || null,
        stream: !vid.lengthSeconds || null,
        thumbnail: vid.thumbnail.thumbnails,
        title: util.text(vid.title),
        index: util.num(vid.index),
        duration: Number(vid.lengthSeconds) * 1000 || 0,
        channel: {
          id: owner.navigationEndpoint.browseEndpoint.browseId,
          legacy: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
          custom: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
          title: owner.text
        }
      }))
    } else {
      let title = util.text(vid.title)
      res.push(new YoutubeVideo({
        id: vid.videoId,
        thumbnail: vid.thumbnail.thumbnails,
        title: title,
        index: util.num(vid.index)
      }))
    }
  }

  return { items: util.removeEmpty(res), continuation: token || null }
}

function genToken (id, i = 1) {
  i = i <= 0 ? 0 : (i - 1)
  let g = [194, 6, 2, 8, 0] // include unavailable videos
  let f = [i % 128, Math.floor(i / 128)]
  f[1] > 0 ? f[0] += 128 : f.pop()
  let e = Buffer.from([8, ...f]).toString('base64')
  let d = [80, 84, 58, ...Buffer.from(e)]
  let c = Buffer.from([8, 0, 122, ...util.stb(d), ...g]).toString('base64')
  let b = [18, ...util.stb('VL' + id), 26, ...util.stb(encodeURIComponent(c)), 154, 2, ...util.stb(id)]
  let a = [226, 169, 133, 178, 2, ...util.stb(b)]
  return Buffer.from(a).toString('base64')
}
