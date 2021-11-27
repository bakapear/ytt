let { YoutubeVideo, YoutubeComment } = require('./lib/structure')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (id, opts = {}) => {
  if (typeof id !== 'string') throw Error('Invalid value')
  let player = await req.api('player', { videoId: id })
  let body = await req.api('next', { videoId: id })
  if (player.playabilityStatus.status === 'ERROR') throw Error('Invalid video')

  let video = makeVideoObject({ ...body, ...player })

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

  let comments = contents[contents.length - 1].itemSectionRenderer.contents[0].continuationItemRenderer
  if (comments) comments = { fetch: fetchComments, continuation: comments.continuationEndpoint.continuationCommand.token }

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
    likes: util.num(buttons[0].toggleButtonRenderer.defaultText.accessibility?.accessibilityData.label),
    dislikes: util.num(buttons[1].toggleButtonRenderer.defaultText.accessibility?.accessibilityData.label),
    category: micro.category,
    tags: details.keywords,
    date: util.date(primary.dateText),
    channel: {
      id: owner.navigationEndpoint.browseEndpoint.browseId,
      legacy: util.between(micro.ownerProfileUrl, '/user/'),
      custom: util.between(micro.ownerProfileUrl, '/c/'),
      title: util.text(owner.title),
      avatar: owner.thumbnail.thumbnails,
      verified: !!owner.badges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
      subscribers: util.num(owner.subscriberCountText)
    },
    comments: comments
  })
}

async function fetchComments (next) {
  let data = await req.api('next', { continuation: next })

  let contents = data.onResponseReceivedEndpoints[0].appendContinuationItemsAction?.continuationItems
  if (!contents) contents = data.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems

  let token = util.key(contents, 'continuationItemRenderer')
  if (token) {
    token = token.button?.buttonRenderer.command || token.continuationEndpoint
    token = token.continuationCommand.token
  }

  let res = []

  for (let item of contents) {
    let com = item.commentThreadRenderer?.comment.commentRenderer || item.commentRenderer
    if (!com) continue

    let rep = item.commentThreadRenderer?.replies
    if (rep) {
      rep = rep.commentRepliesRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token
      rep = { continuation: rep, fetch: fetchComments }
    }

    let date = util.text(com.publishedTimeText)
    let edit = date.indexOf('(edited)')
    if (edit !== -1) date = date.substr(0, edit)

    res.push(new YoutubeComment({
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
      replies: rep
    }))
  }

  return { items: util.removeEmpty(res), continuation: token || null }
}
