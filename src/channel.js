let { YoutubeChannel } = require('./lib/structs')
let util = require('./lib/util')
let req = require('./lib/request')

let TABS = {
  home: 'EghmZWF0dXJlZA==',
  videos: 'EgZ2aWRlb3M=',
  playlists: 'EglwbGF5bGlzdHM=',
  community: 'Egljb21tdW5pdHk=',
  channels: 'EghjaGFubmVscw==',
  about: 'EgVhYm91dA==',
  search: 'EgZzZWFyY2g='
}

module.exports = async (channelId, opts = {}) => {
  if (typeof channelId !== 'string') throw Error('Invalid value')

  let body = await req.api('browse', { browseId: channelId, params: TABS.about })
  if (!body || !body.contents || !body.metadata) throw Error('Invalid channel')

  let chan = makeChannelObject(body)

  return util.removeEmpty(chan)
}

function makeChannelObject (data) {
  let header = data.header.c4TabbedHeaderRenderer
  let meta = data.metadata.channelMetadataRenderer
  let micro = data.microformat.microformatDataRenderer
  let tabs = data.contents.twoColumnBrowseResultsRenderer.tabs
  let about = tabs.find(x => x.tabRenderer.selected).tabRenderer
    .content.sectionListRenderer.contents[0].itemSectionRenderer
    .contents[0].channelAboutFullMetadataRenderer

  return new YoutubeChannel({
    id: header.channelId,
    legacy: meta.doubleclickTrackingUsername || util.between(meta.vanityChannelUrl, '/user/'),
    custom: util.between(meta.vanityChannelUrl, '/c/'),
    verified: !!header.badges?.some(x => x.metadataBadgeRenderer.style === 'BADGE_STYLE_TYPE_VERIFIED'),
    title: micro.title,
    description: util.text(about.description),
    views: util.num(about.viewCountText),
    subscribers: util.num(header.subscriberCountText),
    date: util.date(about.joinedDateText),
    tags: micro.tags,
    avatar: header.avatar.thumbnails,
    banner: header.banner ? [...header.banner.thumbnails, ...header.tvBanner.thumbnails, ...header.mobileBanner.thumbnails] : null
  })
}
