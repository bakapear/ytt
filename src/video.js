let { YouTubeVideo, YouTubePlaylist, YouTubeMix, YouTubeComment } = require('./lib/structs')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (videoId) => {
  if (typeof videoId !== 'string') throw Error('Invalid value')

  let player = await req.api('player', { videoId: videoId })
  if (player.playabilityStatus.status !== 'OK') throw Error('Invalid video')

  let body = await req.api('next', { videoId: videoId })

  let video = makeVideoObject({ ...body, ...player })

  let res = await fetchRelated(null, body)
  video.related.push(...res.items)
  video.related.continuation = res.continuation

  Object.defineProperty(video, 'update', {
    enumerable: false, value: updateMetadata
  })

  return util.removeEmpty(video)
}

module.exports.comments = async (videoId, commentId) => {
  if (typeof videoId !== 'string') throw Error('Invalid value')

  let sortType = 0
  if (!isNaN(commentId)) {
    sortType = commentId
    commentId = ''
  }

  if (commentId && typeof commentId !== 'string') throw Error('Invalid value')

  let data = { items: { fetch: fetchComments, continuation: genToken(videoId, commentId, sortType) } }

  let out = {}
  util.next.call(out, data, 'items')
  await out.items.next()
  return out.items
}

function makeVideoObject (data) {
  let details = data.videoDetails
  let micro = data.microformat.playerMicroformatRenderer
  let contents = data.contents.twoColumnWatchNextResults.results.results.contents
  let primary = contents[0].videoPrimaryInfoRenderer
  let secondary = contents[1].videoSecondaryInfoRenderer
  let buttons = primary.videoActions.menuRenderer.topLevelButtons
  let owner = secondary.owner.videoOwnerRenderer
  let views = primary.viewCount.videoViewCountRenderer

  let ratings = details.allowRatings

  let chapters = data.playerOverlays.playerOverlayRenderer.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer.playerBar?.multiMarkersPlayerBarRenderer.markersMap[0].value.chapters
  if (chapters) {
    chapters = chapters.map(x => {
      let c = x.chapterRenderer
      return {
        title: util.text(c.title),
        offset: c.timeRangeStartMillis,
        thumbnail: c.thumbnail.thumbnails
      }
    })
  }

  let rows = secondary.metadataRowContainer.metadataRowContainerRenderer.rows
  let game, topic
  let songs = []
  if (rows) {
    for (let i = 0; i < rows.length; i++) {
      let r = rows[i]
      if (r.richMetadataRowRenderer) {
        for (let c of r.richMetadataRowRenderer.contents) {
          c = c.richMetadataRenderer
          let b = {
            id: c.endpoint.browseEndpoint.browseId,
            title: util.text(c.title),
            year: util.num(c.subtitle),
            avatar: c.thumbnail.thumbnails
          }
          if (c.style === 'RICH_METADATA_RENDERER_STYLE_BOX_ART') game = b
          else if (c.style === 'RICH_METADATA_RENDERER_STYLE_TOPIC') topic = b
        }
      } else if (r.metadataRowRenderer) {
        r = r.metadataRowRenderer
        let content = r.contents[0]
        let link = content.runs?.[0].navigationEndpoint

        if (!songs.length || r.hasDividerLine) songs.push({})
        let last = songs.length - 1
        switch (util.text(r.title)) {
          case 'Song': {
            songs[last].title = util.text(content)
            if (link) songs[last].video = { id: link.watchEndpoint.videoId }
            break
          }
          case 'Artist': {
            songs[last].artist = util.text(content)
            if (link) songs[last].channel = { id: link.browseEndpoint.browseId }
            break
          }
          case 'Album': {
            songs[last].album = util.text(content)
            break
          }
          case 'Licensed to YouTube by': {
            songs[last].license = util.text(content)
            break
          }
        }
      }
    }
  }
  return new YouTubeVideo({
    id: details.videoId,
    live: views.isLive || null,
    stream: views.isLive || details.isLiveContent || null,
    premiere: util.text(primary.dateText)?.indexOf('Premiere') !== -1 || null,
    title: details.title,
    unlisted: micro.isUnlisted || null,
    description: details.shortDescription,
    thumbnail: details.thumbnail.thumbnails,
    duration: Number(details.lengthSeconds) * 1000,
    views: Number(details.viewCount),
    viewers: views.isLive ? util.num(views.viewCount) : null,
    likes: util.num(buttons[0].toggleButtonRenderer.defaultText.accessibility?.accessibilityData.label) || (ratings ? 0 : null),
    dislikes: util.num(buttons[1].toggleButtonRenderer.defaultText.accessibility?.accessibilityData.label) || (ratings ? 0 : null),
    category: micro.category,
    tags: details.keywords,
    date: util.date(primary.dateText),
    // comments, // TODO: generate request that includes comment size
    channel: {
      id: owner.navigationEndpoint.browseEndpoint.browseId,
      legacy: util.between(micro.ownerProfileUrl, '/user/'),
      custom: util.between(micro.ownerProfileUrl, '/c/'),
      title: util.text(owner.title),
      avatar: owner.thumbnail.thumbnails,
      verified: !!owner.badges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
      subscribers: util.num(owner.subscriberCountText)
    },
    game,
    topic,
    songs: songs.length ? songs : null,
    chapters,
    related: { fetch: fetchRelated, continuation: true }
  })
}

async function fetchRelated (next, data) {
  let contents = null

  if (!data) {
    data = await req.api('next', { continuation: next })
    contents = data.onResponseReceivedEndpoints[0].appendContinuationItemsAction.continuationItems
  } else contents = data.contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results

  let token = contents[contents.length - 1].continuationItemRenderer?.continuationEndpoint.continuationCommand.token

  let res = []
  for (let item of contents) {
    let key = Object.keys(item)[0]
    switch (key) {
      case 'compactVideoRenderer': {
        let vid = item[key]
        let owner = vid.shortBylineText.runs[0]
        let live = !!vid.badges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_LIVE_NOW')
        res.push(new YouTubeVideo({
          id: vid.videoId,
          live: live || null,
          stream: live || util.text(vid.publishedTimeText)?.indexOf('Stream') !== -1 || null,
          labels: vid.badges?.map(x => x.metadataBadgeRenderer.label),
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
            verified: !!vid.ownerBadges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
            title: owner.text,
            avatar: vid.channelThumbnail.thumbnails
          }
        }))
        break
      }
      case 'compactPlaylistRenderer': {
        let list = item[key]
        let owner = list.shortBylineText.runs[0]
        res.push(new YouTubePlaylist({
          id: list.playlistId,
          title: util.text(list.title),
          thumbnail: list.thumbnail.thumbnails,
          size: util.num(list.videoCountShortText),
          date: util.date(list.publishedTimeText),
          channel: {
            id: owner.navigationEndpoint.browseEndpoint.browseId,
            legacy: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
            custom: util.between(owner.navigationEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
            title: owner.text
          }
        }))
        break
      }
      case 'compactRadioRenderer': {
        let mix = item[key]
        res.push(new YouTubeMix({
          id: mix.playlistId,
          title: util.text(mix.title),
          thumbnail: mix.thumbnail.thumbnails
        }))
        break
      }
    }
  }
  return { items: util.removeEmpty(res), continuation: token || null }
}

async function updateMetadata () {
  let fnd = (a, b, c) => (a = a.find(b)) && c(b(a))
  let body = await req.api('updated_metadata', { videoId: this.id })
  if (body.actions) {
    fnd(body.actions, x => x.updateViewershipAction, x => {
      this.viewers = util.num(x.viewCount.videoViewCountRenderer.viewCount)
    })
    fnd(body.actions, x => x.updateDateTextAction, x => {
      this.date = util.date(x.dateText)
    })
    fnd(body.actions, x => x.updateTitleAction, x => {
      this.title = util.text(x.title)
    })
    fnd(body.actions, x => x.updateDescriptionAction, x => {
      this.title = util.text(x.description)
    })
    return true
  }
  return false
}

async function fetchComments (next) {
  let data = await req.api('next', { continuation: next })
  if (!data.onResponseReceivedEndpoints) throw Error('Could not retrieve comments')
  let contents = data.onResponseReceivedEndpoints[0].appendContinuationItemsAction?.continuationItems
  if (!contents) contents = data.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems
  if (!contents) return { items: [], continuation: null }

  let token = contents[contents.length - 1].continuationItemRenderer
  if (token) {
    token = token.button?.buttonRenderer.command || token.continuationEndpoint
    token = token.continuationCommand.token
  }

  let res = []

  for (let item of contents) {
    let com = item.commentThreadRenderer?.comment.commentRenderer || item.commentRenderer
    if (!com) continue

    let date = util.text(com.publishedTimeText)
    let edit = date.indexOf('(edited)')
    if (edit !== -1) date = date.substr(0, edit)

    res.push(new YouTubeComment({
      id: com.commentId,
      edited: edit >= 0,
      hearted: !!com.actionButtons.commentActionButtonsRenderer.creatorHeart,
      pinned: !!com.pinnedCommentBadge,
      owner: com.authorIsChannelOwner,
      text: util.text(com.contentText),
      likes: util.num(com.voteCount),
      date: util.date(date),
      channel: {
        id: com.authorEndpoint.browseEndpoint.browseId,
        legacy: util.between(com.authorEndpoint.commandMetadata.webCommandMetadata.url, '/user/'),
        custom: util.between(com.authorEndpoint.commandMetadata.webCommandMetadata.url, '/c/'),
        title: util.text(com.authorText),
        verified: !!com.authorCommentBadge,
        avatar: com.authorThumbnail.thumbnails
      },
      replies: util.num(item.commentThreadRenderer?.replies?.commentRepliesRenderer.viewReplies.buttonRenderer.text.runs[1]?.text)
    }))
  }

  let count = util.num(data.onResponseReceivedEndpoints[0].reloadContinuationItemsCommand?.continuationItems[0].commentsHeaderRenderer.commentsCount)
  if (count) this.size = count

  return { items: util.removeEmpty(res), continuation: token || null }
}

function genToken (vid, cid, sortType) {
  let a = [...util.stb([34, 17, 34, ...util.stb(vid), 48, sortType, 120, 2])]
  if (cid) {
    // TODO: find way to get rid of Array(24)
    let b = [...util.stb(Array(24)), 50, ...util.stb(vid), 64, 1, 72, 10]
    a = util.stb([26, ...util.stb([18, ...util.stb(cid), 34, 2, 8, 0, ...util.stb(b)])])
  }
  a = [18, ...util.stb([18, ...util.stb(vid)]), 24, 6, 50, ...a]
  return Buffer.from(a).toString('base64')
}
