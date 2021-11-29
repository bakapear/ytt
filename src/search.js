let { YoutubeSearch, YoutubeVideo, YoutubeChannel, YoutubePlaylist } = require('./lib/structure')
let util = require('./lib/util')
let req = require('./lib/request')

let FMAP = [64, 112, 32, 40, 48, 120, 208, 56, 200, 184, 72]
let FILTERS = {
  period: ['hour', 'day', 'week', 'month', 'year'],
  type: ['video', 'channel', 'playlist', 'movie'],
  duration: ['short', 'long', 'medium'],
  features: ['live', '4k', 'hd', 'subtitles', 'cc', '360', 'vr180', '3d', 'hdr', 'location', 'purchased'],
  sort: ['relevance', 'rating', 'age', 'views']
}

module.exports = async (query, opts = {}) => {
  if (typeof query !== 'string') throw Error('Invalid value')
  let body = await req.api('search', { query, params: getFilterParams(opts) })
  body.query = query

  let search = makeSearchObject(body)

  let res = await fetchResults(null, body)
  search.results.push(...res.items)
  search.results.continuation = res.continuation

  return util.removeEmpty(search)
}

function makeSearchObject (data) {
  let contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
  let items = util.key(contents, 'itemSectionRenderer').contents
  let corrected = util?.key(items, 'didYouMeanRenderer')?.correctedQuery

  return new YoutubeSearch({
    query: data.query,
    corrected: util.text(corrected),
    size: Number(data.estimatedResults),
    results: { fetch: fetchResults }
  })
}

async function fetchResults (next, data) {
  let contents = null

  if (!data) {
    data = await req.api('search', { continuation: next })
    contents = data.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems
  } else contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents

  let token = util.key(contents, 'continuationItemRenderer')?.continuationEndpoint.continuationCommand.token
  let items = util.key(contents, 'itemSectionRenderer').contents

  let res = []
  for (let item of items) {
    let key = Object.keys(item)[0]
    switch (key) {
      case 'videoRenderer': {
        let vid = item[key]
        let owner = vid.ownerText.runs[0]
        let live = !!vid.badges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_LIVE_NOW')
        res.push(new YoutubeVideo({
          id: vid.videoId,
          type: 'public',
          live: live,
          new: !!vid.badges?.some(x => x.metadataBadgeRenderer.label === 'New'),
          thumbnail: vid.thumbnail.thumbnails,
          title: util.text(vid.title),
          description: util.text(vid.detailedMetadataSnippets?.[0].snippetText),
          date: util.date(vid.publishedTimeText),
          duration: util.time(vid.lengthText),
          [live ? 'viewers' : 'views']: util.num(vid.viewCountText) || 0,
          channel: {
            id: owner.navigationEndpoint.browseEndpoint.browseId,
            legacy: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
            custom: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
            title: owner.text,
            avatar: vid.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails,
            verified: !!vid.ownerBadges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED')
          }
        }))
        break
      }
      case 'channelRenderer': {
        let chan = item[key]
        res.push(new YoutubeChannel({
          id: chan.channelId,
          legacy: util.between(chan.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
          custom: util.between(chan.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
          title: util.text(chan.title),
          avatar: chan.thumbnail.thumbnails,
          description: util.text(chan.descriptionSnippet),
          size: util.num(chan.videoCountText),
          verified: !!chan.ownerBadges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
          subscribers: util.num(chan.subscriberCountText)
        }))
        break
      }
      case 'playlistRenderer': {
        let list = item[key]
        let owner = list.shortBylineText.runs[0]
        res.push(new YoutubePlaylist({
          id: list.playlistId,
          type: 'public',
          title: util.text(list.title),
          thumbnail: list.thumbnails[0].thumbnails,
          size: Number(list.videoCount),
          channel: {
            id: owner.navigationEndpoint.browseEndpoint.browseId,
            legacy: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
            custom: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
            title: owner.text
          }
        }))
        break
      }
    }
  }

  return { items: util.removeEmpty(res), continuation: token || null }
}

function getFilterParams (opts) {
  if (!opts) return ''
  let arr = new Uint8Array(50)
  let i = 0
  let c = 0
  let w = (type, num, offs) => {
    if (opts[type]) {
      if (!offs && opts[type] === FILTERS[type][0]) return
      arr[i++] = num
      arr[i++] = FILTERS[type].indexOf(opts[type]) + offs
    }
  }
  w(arr, i, 'sort', 8, 0)
  arr[i++] = 18
  c = i++
  w('period', 8, 1)
  w('type', 16, 1)
  w('duration', 24, 1)
  if (opts.features?.length) {
    for (let f of opts.features) {
      let k = FMAP[FILTERS.features.indexOf(f)]
      arr[i++] = k
      if (k >= 128) arr[i++]++
      arr[i++]++
    }
  }
  arr[c] = i - c - 1
  return Buffer.from(arr.slice(0, i)).toString('base64')
}
