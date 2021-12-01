let { YoutubeVideo, YoutubePlaylist } = require('./lib/structure')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (id, opts = {}) => {
  if (typeof id !== 'string') throw Error('Invalid value')
  let body = await req.api('browse', { browseId: 'VL' + id, params: opts.all ? 'wgYCCAA=' : '' })
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
    videos: { fetch: fetchVideos, continuation: true, size: util.num(info.stats[0]) }
  })
}

async function fetchVideos (next, data) {
  let contents = null

  if (!data) {
    data = await req.api('browse', { continuation: next })
    contents = data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems
  } else {
    contents = data.contents.twoColumnBrowseResultsRenderer.tabs[0]
      .tabRenderer.content.sectionListRenderer.contents[0]
      .itemSectionRenderer.contents[0].playlistVideoListRenderer.contents
  }

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
