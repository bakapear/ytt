let { YouTubeComment } = require('./lib/structs')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (videoId, commentId) => {
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
