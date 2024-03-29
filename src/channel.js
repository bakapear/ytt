import { YouTubeChannel, YouTubeVideo, YouTubePlaylist } from './lib/structs.js'
import { removeEmpty, more, text, num, between, date, stb, time } from './lib/util.js'
import { api } from './lib/request.js'

let channel = async (channelId) => {
  if (typeof channelId !== 'string') throw Error('Invalid value')

  let body = await api('browse', { browseId: channelId, params: genToken('about') })
  if (!body || !body.contents) throw Error('Invalid channel')

  let chan = makeChannelObject(body)

  return removeEmpty(chan)
}

channel.videos = async (channelId, sortType) => {
  if (typeof channelId !== 'string') throw Error('Invalid value')

  let body = await api('browse', { browseId: channelId, params: genToken('videos', sortType || 0) })
  if (!body || !body.contents) throw Error('Invalid channel')

  return await more(fetchContents, body)
}

channel.playlists = async (channelId, sortType) => {
  if (typeof channelId !== 'string') throw Error('Invalid value')

  let body = await api('browse', { browseId: channelId, params: genToken('playlists', sortType || 0) })
  if (!body || !body.contents) throw Error('Invalid channel')

  return await more(fetchContents, body)
}

channel.channels = async (channelId, sortType) => {
  if (typeof channelId !== 'string') throw Error('Invalid value')

  let body = await api('browse', { browseId: channelId, params: genToken('channels', sortType || 0) })
  if (!body || !body.contents) throw Error('Invalid channel')

  return await more(fetchContents, body)
}

export default channel

function makeChannelObject (data) {
  if (!data.microformat) {
    let header = data.header.carouselHeaderRenderer
    if (!header) throw Error('Channel type not supported')
    header = data.header.carouselHeaderRenderer.contents[1].topicChannelDetailsRenderer
    return new YouTubeChannel({
      id: data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.tabIdentifier,
      title: text(header.title),
      subscribers: num(header.subtitle),
      avatar: header.avatar.thumbnails
    })
  }

  let header = data.header?.c4TabbedHeaderRenderer || data.header?.interactiveTabbedHeaderRenderer || {}
  let meta = data.metadata?.channelMetadataRenderer || {}
  let micro = data.microformat.microformatDataRenderer
  let tabs = data.contents?.twoColumnBrowseResultsRenderer.tabs
  let about = tabs?.find(x => x.tabRenderer.selected).tabRenderer
    .content.sectionListRenderer.contents[0].itemSectionRenderer
    .contents[0].channelAboutFullMetadataRenderer

  let game = header.metadata ? text(header.metadata).split(' • ') : null

  return new YouTubeChannel({
    id: between(micro.urlCanonical, '/channel/'),
    legacy: meta.doubleclickTrackingUsername || between(meta.vanityChannelUrl, '/user/'),
    custom: between(meta.vanityChannelUrl, '/c/'),
    verified: !!header.badges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
    generated: header.autoGenerated ? true : null,
    title: text(header.title) || micro.title,
    description: text(header.description) || text(about?.description) || micro.description,
    views: num(about?.viewCountText),
    subscribers: num(header.subscriberCountText),
    date: date(about?.joinedDateText),
    tags: micro.tags,
    labels: header.autoGenerated && header.badges ? header.badges.map(x => x.metadataBadgeRenderer.label) : null,
    year: game ? Number(game[0]) : null,
    devs: game ? game.slice(1) : null,
    avatar: [...meta.avatar?.thumbnails || [], ...header.avatar?.thumbnails || [], ...header.boxArt?.thumbnails || []],
    banner: header.banner ? [...header.banner.thumbnails, ...header.tvBanner?.thumbnails || [], ...header.mobileBanner?.thumbnails || []] : null
  })
}

function genToken (page, sortType) {
  return Buffer.from([18, ...stb(page), 24, sortType]).toString('base64')
}

async function fetchContents (next, data) {
  let res = []

  if (next) data = await api('browse', { continuation: next })
  else Object.defineProperty(res, 'channel', { value: removeEmpty(makeChannelObject(data)) })

  let contents = data.contents?.twoColumnBrowseResultsRenderer.tabs.find(x => x.tabRenderer.selected).tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].gridRenderer.items
  if (!contents) contents = data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems

  let token = contents[contents.length - 1].continuationItemRenderer
  if (token) token = token.continuationEndpoint.continuationCommand.token

  for (let item of contents) {
    let key = Object.keys(item)[0]
    switch (key) {
      case 'gridVideoRenderer': {
        let vid = item[key]
        res.push(new YouTubeVideo({
          id: vid.videoId,
          stream: text(vid.publishedTimeText)?.indexOf('Stream') !== -1 || null,
          labels: vid.badges?.map(x => x.metadataBadgeRenderer.label),
          thumbnail: vid.thumbnail.thumbnails,
          title: text(vid.title),
          description: text(vid.detailedMetadataSnippets?.[0].snippetText),
          date: date(vid.publishedTimeText),
          duration: time(vid.thumbnailOverlays[0].thumbnailOverlayTimeStatusRenderer.text),
          views: num(vid.viewCountText) || 0
        }))
        break
      }
      case 'gridPlaylistRenderer': {
        let list = item[key]
        res.push(new YouTubePlaylist({
          id: list.playlistId,
          title: text(list.title),
          thumbnail: list.thumbnail.thumbnails,
          size: num(list.videoCountText)
        }))
        break
      }
      case 'gridChannelRenderer': {
        let chan = item[key]
        res.push(new YouTubeChannel({
          id: chan.channelId,
          legacy: between(chan.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
          custom: between(chan.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
          title: text(chan.title),
          avatar: chan.thumbnail.thumbnails,
          size: num(chan.videoCountText),
          verified: !!chan.ownerBadges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
          subscribers: num(chan.subscriberCountText)
        }))
        break
      }
    }
  }

  return { items: removeEmpty(res), continuation: token || null }
}
