let { YoutubeVideo, YoutubePlaylist } = require('./lib/structure')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (id, index) => {
  if (typeof id !== 'string') throw Error('Invalid value')

  let body = await req.api('browse', { continuation: genToken(id, index || 1) })
  if (!body.contents) throw Error('Invalid playlist')

  let list = makePlaylistObject(body)

  let res = await fetchVideos(null, body)
  list.videos.push(...res.items)
  list.videos.continuation = res.continuation

  return util.removeEmpty(list)
}

function makePlaylistObject (data) {
  let micro = data.microformat.microformatDataRenderer
  let items = data.sidebar.playlistSidebarRenderer.items

  let info = items[0].playlistSidebarPrimaryInfoRenderer
  let owner = items[1].playlistSidebarSecondaryInfoRenderer.videoOwner.videoOwnerRenderer

  return new YoutubePlaylist({
    id: info.navigationEndpoint.watchEndpoint.playlistId,
    type: micro.unlisted ? 'unlisted' : 'public',
    title: micro.title,
    description: micro.description,
    size: util.num(info.stats[0]),
    views: util.num(info.stats[1]),
    date: util.date(info.stats[2]),
    thumbnail: micro.thumbnail.thumbnails,
    channel: {
      id: owner.navigationEndpoint.browseEndpoint.browseId,
      legacy: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
      custom: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
      title: util.text(owner.title),
      avatar: owner.thumbnail.thumbnails
    },
    videos: { fetch: fetchVideos, continuation: true }
  })
}

async function fetchVideos (next, data) {
  if (!data) data = await req.api('browse', { continuation: next })

  let contents = data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems

  let token = contents[contents.length - 1].continuationItemRenderer?.continuationEndpoint.continuationCommand.token

  let res = []

  for (let item of contents) {
    if (!item.playlistVideoRenderer) continue
    let vid = item.playlistVideoRenderer
    let owner = vid.shortBylineText?.runs[0]
    if (owner) {
      let live = !vid.lengthSeconds
      res.push(new YoutubeVideo({
        id: vid.videoId,
        live: live,
        type: 'public',
        thumbnail: vid.thumbnail.thumbnails,
        title: util.text(vid.title),
        index: util.num(vid.index),
        duration: live ? 0 : (Number(vid.lengthSeconds) * 1000),
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
        type: title.match(/\[(.*?) /)[1].toLowerCase(),
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
