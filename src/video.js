let { YoutubeVideo } = require('./lib/structs')
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

  return util.removeEmpty(video)
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

  let chapters = data.playerOverlays.playerOverlayRenderer.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer.playerBar.multiMarkersPlayerBarRenderer.markersMap[0].value.chapters
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

  return new YoutubeVideo({
    id: details.videoId,
    live: !!details.isLiveContent,
    title: details.title,
    type: micro.isUnlisted ? 'unlisted' : 'public',
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
    chapters: chapters,
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
        let owner = vid.shortBylineText?.runs[0]
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
            verified: !!vid.ownerBadges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
            title: owner.text,
            avatar: vid.channelThumbnail.thumbnails
          }
        }))
        break
      }
    }
  }
  return { items: util.removeEmpty(res), continuation: token || null }
}
