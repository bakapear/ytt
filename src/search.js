import { YouTubeSearch, YouTubeVideo, YouTubeChannel, YouTubePlaylist } from './lib/structs.js'
import { removeEmpty, text, num, between, date, time } from './lib/util.js'
import { api } from './lib/request.js'

let FMAP = [64, 112, 32, 40, 48, 120, 208, 56, 200, 184, 72]
let FILTERS = {
  period: ['hour', 'day', 'week', 'month', 'year'],
  type: ['video', 'channel', 'playlist', 'movie'],
  duration: ['short', 'long', 'medium'],
  features: ['live', '4k', 'hd', 'subtitles', 'cc', '360', 'vr180', '3d', 'hdr', 'location', 'purchased'],
  sort: ['relevance', 'rating', 'age', 'views']
}

export default async (query, filters = {}) => {
  if (typeof query !== 'string') throw Error('Invalid value')

  let body = await api('search', { query, params: getFilterParams(filters) })
  body.query = query

  let search = makeSearchObject(body)

  let res = await fetchResults(null, body)
  search.results.push(...res.items)
  search.results.continuation = res.continuation

  return removeEmpty(search)
}

function makeSearchObject (data) {
  let contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
  let items = contents[0].itemSectionRenderer.contents

  let suggested = items[0].didYouMeanRenderer?.correctedQuery
  let corrected = items[0].showingResultsForRenderer?.correctedQuery

  return new YouTubeSearch({
    query: data.query,
    suggested: text(suggested),
    corrected: text(corrected),
    size: Number(data.estimatedResults),
    results: { fetch: fetchResults, continuation: true }
  })
}

async function fetchResults (next, data) {
  let contents = null

  if (!data) {
    data = await api('search', { continuation: next })
    contents = data.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems
  } else contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents

  let items = contents[0].itemSectionRenderer.contents
  let token = contents[contents.length - 1].continuationItemRenderer?.continuationEndpoint.continuationCommand.token

  let res = []
  for (let item of items) {
    let key = Object.keys(item)[0]
    switch (key) {
      case 'videoRenderer': {
        let vid = item[key]
        let owner = vid.ownerText.runs[0]
        let live = !!vid.badges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_LIVE_NOW')
        res.push(new YouTubeVideo({
          id: vid.videoId,
          live: live || null,
          stream: live || text(vid.publishedTimeText)?.indexOf('Stream') !== -1 || null,
          labels: vid.badges?.map(x => x.metadataBadgeRenderer.label),
          thumbnail: vid.thumbnail.thumbnails,
          title: text(vid.title),
          description: text(vid.detailedMetadataSnippets?.[0].snippetText),
          date: date(vid.publishedTimeText),
          duration: time(vid.lengthText),
          [live ? 'viewers' : 'views']: num(vid.viewCountText) || 0,
          channel: {
            id: owner.navigationEndpoint.browseEndpoint.browseId,
            legacy: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
            custom: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
            title: owner.text,
            avatar: vid.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails,
            verified: !!vid.ownerBadges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED')
          }
        }))
        break
      }
      case 'channelRenderer': {
        let chan = item[key]
        res.push(new YouTubeChannel({
          id: chan.channelId,
          legacy: between(chan.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
          custom: between(chan.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
          title: text(chan.title),
          avatar: chan.thumbnail.thumbnails,
          description: text(chan.descriptionSnippet),
          size: num(chan.videoCountText),
          verified: !!chan.ownerBadges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
          subscribers: num(chan.subscriberCountText)
        }))
        break
      }
      case 'playlistRenderer': {
        let list = item[key]
        let owner = list.shortBylineText.runs[0]
        res.push(new YouTubePlaylist({
          id: list.playlistId,
          title: text(list.title),
          thumbnail: list.thumbnails[0].thumbnails,
          size: Number(list.videoCount),
          channel: {
            id: owner.navigationEndpoint.browseEndpoint.browseId,
            legacy: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
            custom: between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
            title: owner.text
          }
        }))
        break
      }
    }
  }

  return { items: removeEmpty(res), continuation: token || null }
}

function getFilterParams (filters) {
  if (!filters) return ''
  let arr = new Uint8Array(50)
  let i = 0
  let c = 0
  let w = (type, num, offs) => {
    if (filters[type]) {
      if (!offs && filters[type] === FILTERS[type][0]) return
      arr[i++] = num
      arr[i++] = FILTERS[type].indexOf(filters[type]) + offs
    }
  }
  w(arr, i, 'sort', 8, 0)
  arr[i++] = 18
  c = i++
  w('period', 8, 1)
  w('type', 16, 1)
  w('duration', 24, 1)
  if (filters.features?.length) {
    for (let f of filters.features) {
      let k = FMAP[FILTERS.features.indexOf(f)]
      arr[i++] = k
      if (k >= 128) arr[i++]++
      arr[i++]++
    }
  }
  arr[c] = i - c - 1
  return Buffer.from(arr.slice(0, i)).toString('base64')
}
