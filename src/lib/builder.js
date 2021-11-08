let dp = require('despair')
let util = require('./util')
let { YoutubePlaylist, YoutubeChannel, YoutubeVideo, YoutubeQuery, YoutubeThumbnail, YoutubeFormats } = require('./structure')

function makePlaylistObject (data) {
  let meta = data.metadata.playlistMetadataRenderer
  let micro = data.microformat.microformatDataRenderer
  let stats = data.sidebar.playlistSidebarRenderer.items[0].playlistSidebarPrimaryInfoRenderer.stats.map(x => util.text(x))
  let owner = data.sidebar.playlistSidebarRenderer.items[1].playlistSidebarSecondaryInfoRenderer.videoOwner
  let url = owner ? owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.canonicalBaseUrl : ''
  let list = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents
  let continuation = util.findWithKey(list, 'continuationItemRenderer')
  let formatItems = x => {
    let items = []
    for (let i = 0; i < x.length; i++) {
      let item = x[i].playlistVideoRenderer
      let title = util.text(item.title)
      if (!item.shortBylineText && ['[Deleted video]', '[Private video]'].includes(title)) {
        items.push(new YoutubeVideo({
          index: Number(util.text(item.index)),
          type: title.indexOf('Deleted') >= 0 ? 'deleted' : 'private',
          id: item.videoId,
          title: title
        }))
        continue
      }
      let url = item.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url
      items.push(new YoutubeVideo({
        index: Number(util.text(item.index)),
        id: item.videoId,
        title: title,
        duration: Number(item.lengthSeconds) * 1000,
        thumbnail: new YoutubeThumbnail(item.thumbnail.thumbnails[0]),
        author: new YoutubeChannel({
          id: item.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
          vanity: util.between(url, '/user/'),
          title: util.text(item.shortBylineText)
        })
      }))
    }
    return util.removeEmpty(items)
  }
  let playlist = new YoutubePlaylist({
    id: util.between(micro.urlCanonical, '?list='),
    type: micro.unlisted ? 'unlisted' : 'public',
    title: meta.title,
    description: meta.description,
    views: util.num(stats[0]),
    size: util.num(stats[1]),
    date: util.date(stats[2]),
    thumbnail: new YoutubeThumbnail(micro.thumbnail.thumbnails[0]),
    author: owner
      ? new YoutubeChannel({
          id: owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId,
          vanity: util.between(url, '/user/'),
          title: util.text(owner.videoOwnerRenderer.title),
          thumbnail: new YoutubeThumbnail(owner.videoOwnerRenderer.thumbnail.thumbnails[0])
        })
      : null,
    continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
    fetch: async x => {
      let res = await fetchMore('browse', x)
      return { continuation: res.continuation, items: formatItems(res.items) }
    },
    items: formatItems(list.filter(x => x.playlistVideoRenderer))
  })
  playlist = util.removeEmpty(playlist)
  if (!playlist.items) playlist.items = []
  return playlist
}

function makeChannelObject (data) {
  let meta = data.metadata.channelMetadataRenderer
  let header = data.header.c4TabbedHeaderRenderer
  let url = header.navigationEndpoint.browseEndpoint.canonicalBaseUrl
  let full = data.contents.twoColumnBrowseResultsRenderer.tabs.find(x => x.tabRenderer.title === 'About').tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].channelAboutFullMetadataRenderer
  let channel = new YoutubeChannel({
    id: header.channelId,
    vanity: util.between(url, '/user/'),
    title: header.title,
    description: meta.description,
    subscribers: util.num(header.subscriberCountText),
    views: util.num(full.viewCountText),
    date: util.date(util.text(full.joinedDateText)),
    thumbnail: new YoutubeThumbnail(meta.avatar.thumbnails[0]),
    banner: header.banner ? new YoutubeThumbnail(header.banner.thumbnails[0]) : null
  })
  channel = util.removeEmpty(channel)
  return channel
}

function makeVideoObject (data) {
  let primary = data.contents.twoColumnWatchNextResults.results.results.contents[0].videoPrimaryInfoRenderer
  let secondary = data.contents.twoColumnWatchNextResults.results.results.contents[1].videoSecondaryInfoRenderer
  let main = data.contents.twoColumnWatchNextResults.playlist.playlist.contents[0].playlistPanelVideoRenderer
  let time = main.thumbnailOverlays[0].thumbnailOverlayTimeStatusRenderer || {}
  let url = secondary.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.canonicalBaseUrl
  let unlisted = primary.badges && primary.badges.find(x => x.metadataBadgeRenderer.label === 'Unlisted')
  let video = new YoutubeVideo({
    id: data.currentVideoEndpoint.watchEndpoint.videoId,
    type: unlisted ? 'unlisted' : 'public',
    title: util.text(primary.title),
    description: util.text(secondary.description),
    views: util.num(primary.viewCount.videoViewCountRenderer.viewCount),
    date: util.date(util.text(primary.dateText)),
    likes: util.num(primary.videoActions.menuRenderer.topLevelButtons[0].toggleButtonRenderer.defaultText.accessibility.accessibilityData.label),
    dislikes: util.num(primary.videoActions.menuRenderer.topLevelButtons[1].toggleButtonRenderer.defaultText.accessibility.accessibilityData.label),
    duration: util.hmsToMs(util.text(time.text)),
    thumbnail: new YoutubeThumbnail(main.thumbnail.thumbnails[0]),
    author: new YoutubeChannel({
      id: secondary.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId,
      vanity: util.between(url, '/user/'),
      title: util.text(secondary.owner.videoOwnerRenderer.title),
      subscribers: util.num(secondary.owner.videoOwnerRenderer.subscriberCountText),
      thumbnail: new YoutubeThumbnail(secondary.owner.videoOwnerRenderer.thumbnail.thumbnails[0])
    })
  })
  video = util.removeEmpty(video)
  return video
}

function makeQueryObject (data) {
  let query = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.subMenu.searchSubMenuRenderer.groups[4].searchFilterGroupRenderer.filters[1].searchFilterRenderer.navigationEndpoint.searchEndpoint.query
  let sections = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
  let main = util.findLastWithKey(sections, 'itemSectionRenderer')
  let continuation = util.findWithKey(sections, 'continuationItemRenderer')

  let formatItems = x => {
    let items = []
    for (let i = 0; i < x.length; i++) {
      switch (Object.keys(x[i])[0]) {
        case 'videoRenderer': {
          let item = x[i].videoRenderer
          let url = item.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url
          items.push(new YoutubeVideo({
            id: item.videoId,
            type: 'public',
            title: util.text(item.title),
            description: util.text(item.descriptionSnippet),
            views: util.num(item.viewCountText),
            date: util.text(item.publishedTimeText),
            duration: util.hmsToMs(util.text(item.lengthText)),
            thumbnail: new YoutubeThumbnail(item.thumbnail.thumbnails[0]),
            author: new YoutubeChannel({
              id: item.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
              vanity: util.between(url, '/user/'),
              title: util.text(item.shortBylineText),
              thumbnail: new YoutubeThumbnail(item.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0])
            })
          }))
          break
        }
        case 'channelRenderer': {
          let item = x[i].channelRenderer
          let url = item.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url
          items.push(new YoutubeChannel({
            id: item.channelId,
            vanity: util.between(url, '/user/'),
            title: util.text(item.title),
            description: util.text(item.descriptionSnippet),
            thumbnail: new YoutubeThumbnail(item.thumbnail.thumbnails[0]),
            subscribers: util.num(item.subscriberCountText),
            size: util.num(item.videoCountText)
          }))
          break
        }
        case 'playlistRenderer': {
          let item = x[i].playlistRenderer
          let url = item.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url
          items.push(new YoutubePlaylist({
            id: item.playlistId,
            type: 'public',
            title: util.text(item.title),
            thumbnail: new YoutubeThumbnail(item.thumbnails[0].thumbnails[0]),
            size: Number(item.videoCount),
            author: new YoutubeChannel({
              id: item.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
              vanity: util.between(url, '/user/'),
              title: util.text(item.shortBylineText)
            })
          }))
          break
        }
      }
    }
    return util.removeEmpty(items)
  }

  let search = new YoutubeQuery({
    query: query,
    results: Number(data.estimatedResults),
    corrected: (main.contents.length && main.contents[0].didYouMeanRenderer) ? util.text(main.contents[0].didYouMeanRenderer.correctedQuery) : null,
    items: formatItems(main.contents),
    continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
    fetch: async x => {
      let res = await fetchMore('search', x)
      return { continuation: res.continuation, items: formatItems(res.items) }
    }
  })
  search = util.removeEmpty(search)
  if (!search.items) search.items = []
  return search
}

function makeVideoInfoObject (data, formats) {
  let details = data.videoDetails
  let micro = data.microformat.playerMicroformatRenderer
  let url = micro.ownerProfileUrl
  let regex = /(?<=codecs=").*(?=")/
  let video = new YoutubeVideo({
    id: details.videoId,
    type: micro.isUnlisted ? 'unlisted' : 'public',
    title: util.text(micro.title).replace(/\+/g, ' '),
    description: micro.description ? util.text(micro.description).replace(/\+/g, ' ') : null,
    thumbnail: new YoutubeThumbnail(Object.values(details.thumbnail.thumbnails)[0]),
    date: micro.publishDate,
    duration: Number(details.lengthSeconds) * 1000,
    views: Number(details.viewCount),
    author: new YoutubeChannel({
      id: details.channelId,
      vanity: util.between(url, '/user/'),
      title: details.author.replace(/\+/g, ' ')
    })
  })
  formats = new YoutubeFormats(formats.map(x => {
    let parts = x.mimeType.split(';')
    x.mime = parts[0]
    x.codecs = parts[1].match(regex)[0].split(', ')
    x.size = Number(x.contentLength)
    x.duration = Number(x.approxDurationMs)
    if (x.audioSampleRate) x.samplerate = Number(x.audioSampleRate)
    x.quality = x.qualityLabel || x.audioQuality
    x.channels = x.audioChannels
    return x
  }))
  return { info: util.removeEmpty(video), formats: util.removeEmpty(formats) }
}

async function fetchMore (type, token) {
  let body = await dp.post('youtubei/v1/' + type, {
    base: util.base,
    query: {
      key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8' // public
    },
    data: {
      context: {
        client: {
          hl: 'en',
          gl: 'US',
          clientName: '1',
          clientVersion: '2.20200701.03.01'
        }
      },
      continuation: token
    },
    type: 'json'
  }).json()
  if (type === 'search') {
    let sections = body.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems
    let main = util.findWithKey(sections, 'itemSectionRenderer')
    let continuation = util.findWithKey(sections, 'continuationItemRenderer')
    return {
      continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
      items: main.contents
    }
  } else if (type === 'browse') {
    body = body.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems
    let continuation = util.findWithKey(body, 'continuationItemRenderer')
    return {
      continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
      items: body.filter(x => x.playlistVideoRenderer)
    }
  }
}

module.exports = { makePlaylistObject, makeChannelObject, makeVideoObject, makeQueryObject, makeVideoInfoObject }
