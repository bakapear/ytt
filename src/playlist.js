import { YouTubeVideo, YouTubePlaylist } from './lib/structs.js'
import { removeEmpty, text, num, between, date, stb } from './lib/util.js'
import { api } from './lib/request.js'

export default async (playlistId, index) => {
  if (typeof playlistId !== 'string') throw Error('Invalid value')

  let body = await api('browse', { continuation: genToken(playlistId, index || 1) })
  if (!body.contents) throw Error('Invalid playlist')

  let list = makePlaylistObject(body)

  if (list.videos) {
    let res = await fetchVideos(null, body)
    list.videos.push(...res.items)
    list.videos.continuation = res.continuation
  }

  return removeEmpty(list)
}

function makePlaylistObject (data) {
  let micro = data.microformat.microformatDataRenderer
  let items = data.sidebar.playlistSidebarRenderer.items

  let info = items[0].playlistSidebarPrimaryInfoRenderer
  let owner = items[1]?.playlistSidebarSecondaryInfoRenderer.videoOwner.videoOwnerRenderer

  return new YouTubePlaylist({
    id: between(micro.urlCanonical, '='),
    unlisted: micro.unlisted || null,
    title: micro.title,
    description: micro.description,
    size: num(info.stats[0]) || 0,
    views: num(info.stats[1]) || 0,
    date: date(info.stats[2]),
    thumbnail: micro.thumbnail.thumbnails,
    channel: owner
      ? {
          id: owner.navigationEndpoint.browseEndpoint.browseId,
          legacy: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
          custom: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
          title: text(owner.title),
          avatar: owner.thumbnail.thumbnails
        }
      : null,
    videos: { fetch: fetchVideos, continuation: !!data.onResponseReceivedActions }
  })
}

async function fetchVideos (next, data) {
  if (!data) data = await api('browse', { continuation: next })

  let contents = data.onResponseReceivedActions?.[0].appendContinuationItemsAction.continuationItems || []

  let token = contents[contents.length - 1]?.continuationItemRenderer?.continuationEndpoint.continuationCommand.token

  let res = []

  for (let item of contents) {
    if (!item.playlistVideoRenderer) continue
    let vid = item.playlistVideoRenderer
    let owner = vid.shortBylineText?.runs[0]
    if (owner) {
      res.push(new YouTubeVideo({
        id: vid.videoId,
        live: !vid.lengthSeconds || null,
        stream: !vid.lengthSeconds || null,
        thumbnail: vid.thumbnail.thumbnails,
        title: text(vid.title),
        index: num(vid.index),
        duration: Number(vid.lengthSeconds) * 1000 || 0,
        channel: {
          id: owner.navigationEndpoint.browseEndpoint.browseId,
          legacy: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
          custom: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
          title: owner.text
        }
      }))
    } else {
      let title = text(vid.title)
      let type = title.match(/\[(.*?) /)[1].toLowerCase()
      res.push(new YouTubeVideo({
        id: vid.videoId,
        [type]: true,
        title,
        index: num(vid.index),
        thumbnail: vid.thumbnail.thumbnails
      }))
    }
  }

  return { items: removeEmpty(res), continuation: token || null }
}

function genToken (id, i = 1) {
  i = i <= 0 ? 0 : (i - 1)
  let g = [194, 6, 2, 8, 0] // include unavailable videos
  let f = [i % 128, Math.floor(i / 128)]
  f[1] > 0 ? f[0] += 128 : f.pop()
  let e = Buffer.from([8, ...f]).toString('base64')
  let d = [80, 84, 58, ...Buffer.from(e)]
  let c = Buffer.from([8, 0, 122, ...stb(d), ...g]).toString('base64')
  let b = [18, ...stb('VL' + id), 26, ...stb(encodeURIComponent(c)), 154, 2, ...stb(id)]
  let a = [226, 169, 133, 178, 2, ...stb(b)]
  return Buffer.from(a).toString('base64')
}
