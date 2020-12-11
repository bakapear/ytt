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
        views: util.stat(item.title.accessibility.accessibilityData.label.split(' ').slice(-2).join(' '), 'view') || 0,
        duration: Number(item.lengthSeconds) * 1000,
        thumbnail: new YoutubeThumbnail(item.thumbnail.thumbnails[0]),
        author: new YoutubeChannel({
          id: item.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
          vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
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
    views: util.stat(stats.find(x => x.indexOf('view') >= 0), 'view') || 0,
    size: util.stat(stats.find(x => x.indexOf('video') >= 0), 'video') || 0,
    thumbnail: new YoutubeThumbnail(micro.thumbnail.thumbnails[0]),
    author: owner
      ? new YoutubeChannel({
          id: owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId,
          vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
          title: util.text(owner.videoOwnerRenderer.title),
          thumbnail: new YoutubeThumbnail(owner.videoOwnerRenderer.thumbnail.thumbnails[0])
        })
      : undefined,
    continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
    fetch: async x => {
      let res = await fetchMore(x)
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
    vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
    title: header.title,
    description: meta.description,
    subscribers: header.subscriberCountText ? util.stat(util.text(header.subscriberCountText), 'subscriber') : undefined,
    views: util.stat(util.text(full.viewCountText), 'view') || 0,
    date: util.text(full.joinedDateText).replace('Joined', '').trim(),
    thumbnail: new YoutubeThumbnail(meta.avatar.thumbnails[0]),
    banner: new YoutubeThumbnail(header.banner.thumbnails[0])
  })
  channel = util.removeEmpty(channel)
  return channel
}

function makeVideoObject (data) {
  let primary = data.contents.twoColumnWatchNextResults.results.results.contents[0].videoPrimaryInfoRenderer
  let secondary = data.contents.twoColumnWatchNextResults.results.results.contents[1].videoSecondaryInfoRenderer
  let main = data.contents.twoColumnWatchNextResults.playlist.playlist.contents[0].playlistPanelVideoRenderer
  let time = main.thumbnailOverlays[0].thumbnailOverlayTimeStatusRenderer.text
  let url = secondary.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.canonicalBaseUrl
  let unlisted = !!data.contents.twoColumnWatchNextResults.playlist.playlist.badges.find(x => x.metadataBadgeRenderer.label === 'Unlisted')
  let video = new YoutubeVideo({
    id: data.currentVideoEndpoint.watchEndpoint.videoId,
    type: unlisted ? 'unlisted' : 'public',
    title: util.text(primary.title),
    description: util.text(secondary.description),
    views: util.stat(util.text(primary.viewCount.videoViewCountRenderer.viewCount), 'view') || 0,
    date: util.text(primary.dateText).replace('Premiered', '').replace('Streamed live on', '').trim(),
    likes: util.stat(primary.videoActions.menuRenderer.topLevelButtons[0].toggleButtonRenderer.defaultText.accessibility.accessibilityData.label, 'like') || 0,
    dislikes: util.stat(primary.videoActions.menuRenderer.topLevelButtons[1].toggleButtonRenderer.defaultText.accessibility.accessibilityData.label, 'dislike') || 0,
    duration: util.hmsToMs(util.text(time)),
    thumbnail: new YoutubeThumbnail(main.thumbnail.thumbnails[0]),
    author: new YoutubeChannel({
      id: secondary.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId,
      vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
      title: util.text(secondary.owner.videoOwnerRenderer.title),
      subscribers: util.stat(util.text(secondary.owner.videoOwnerRenderer.subscriberCountText), 'subscriber'),
      thumbnail: new YoutubeThumbnail(secondary.owner.videoOwnerRenderer.thumbnail.thumbnails[0])
    })
  })
  video = util.removeEmpty(video)
  return video
}

function makeQueryObject (data) {
  let query = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.subMenu.searchSubMenuRenderer.groups[4].searchFilterGroupRenderer.filters[1].searchFilterRenderer.navigationEndpoint.searchEndpoint.query
  let sections = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
  let main = util.findWithKey(sections, 'itemSectionRenderer')
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
            description: item.descriptionSnippet ? util.text(item.descriptionSnippet) : undefined,
            views: item.viewCountText ? (util.stat(util.text(item.viewCountText), 'view') || 0) : undefined,
            date: item.publishedTimeText ? util.text(item.publishedTimeText) : undefined,
            duration: item.lengthText ? util.hmsToMs(util.text(item.lengthText)) : undefined,
            thumbnail: new YoutubeThumbnail(item.thumbnail.thumbnails[0]),
            author: new YoutubeChannel({
              id: item.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
              vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
              title: util.text(item.shortBylineText)
            })
          }))
          break
        }
        case 'channelRenderer': {
          let item = x[i].channelRenderer
          let url = item.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url
          items.push(new YoutubeChannel({
            id: item.channelId,
            vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
            title: util.text(item.title),
            description: item.descriptionSnippet ? util.text(item.descriptionSnippet) : undefined,
            thumbnail: new YoutubeThumbnail(item.thumbnail.thumbnails[0]),
            subscribers: item.subscriberCountText ? util.stat(util.text(item.subscriberCountText), 'subscriber') : undefined,
            size: item.videoCountText ? util.stat(util.text(item.videoCountText), 'video') : undefined
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
              vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
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
    corrected: (main.contents.length && main.contents[0].didYouMeanRenderer) ? util.text(main.contents[0].didYouMeanRenderer.correctedQuery) : undefined,
    items: formatItems(main.contents),
    continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
    fetch: async x => {
      let res = await fetchMoreQuery(query, x)
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
    description: micro.description ? util.text(micro.description).replace(/\+/g, ' ') : undefined,
    thumbnail: new YoutubeThumbnail(Object.values(details.thumbnail.thumbnails)[0]),
    date: micro.publishDate,
    duration: Number(details.lengthSeconds) * 1000,
    views: Number(details.viewCount),
    author: new YoutubeChannel({
      id: details.channelId,
      vanity: url.indexOf('/user/') >= 0 ? util.between(url, '/user/') : undefined,
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

async function fetchMore (token) {
  let body = await dp('browse_ajax', {
    base: util.base,
    headers: {
      'Accept-Language': 'en-US',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': '2.20200701.03.01'
    },
    query: { continuation: token }
  }).json()
  body = body[1].response.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems
  let continuation = util.findWithKey(body, 'continuationItemRenderer')
  return {
    continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
    items: body.filter(x => x.playlistVideoRenderer)
  }
}

async function fetchMoreQuery (query, token) {
  let body = await dp.post('youtubei/v1/search', {
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
  let sections = body.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems
  let main = util.findWithKey(sections, 'itemSectionRenderer')
  let continuation = util.findWithKey(sections, 'continuationItemRenderer')
  return {
    continuation: continuation ? continuation.continuationEndpoint.continuationCommand.token : null,
    items: main.contents
  }
}

module.exports = { makePlaylistObject, makeChannelObject, makeVideoObject, makeQueryObject, makeVideoInfoObject }
