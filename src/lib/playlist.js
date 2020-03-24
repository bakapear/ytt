let dp = require('despair')
let hy = require('honesty')
let util = require('./util.js')

module.exports = async function (id = '', skip = false) {
  let body = await dp('playlist', {
    base: util.base,
    headers: { 'accept-language': 'en-US' },
    query: {
      disable_polymer: 1,
      list: id
    }
  }).text()
  body = body.replace(/<div class="more-menu-wrapper">/g, '')
  let $ = hy(body)
  if (!$('.pl-header-title')[0]) return { error: 'No playlist id found: ' + id }
  let details = $('.pl-header-details>li')
  let res = {
    type: 'playlist',
    id: id,
    url: util.base + '/playlist?list=' + id,
    name: $('.pl-header-title').text(true),
    description: $('.pl-header-description-text')[0] ? $('.pl-header-description-text').text(true) : '',
    author: null,
    size: util.formatStat($(details[1]).text(true), 'videos'),
    views: util.formatStat($(details[2]).text(true), 'views'),
    thumbnail: util.getThumb($('.pl-header-thumb>img')[0].attribs['src']),
    duration: 0,
    time: '',
    items: []
  }
  if ($('.qualified-channel-title-text>a')[0]) {
    res.author = {
      name: $('.qualified-channel-title-text>a').text(true),
      img: $('.channel-header-profile-image')[0].attribs['src'],
      url: util.base + $('.qualified-channel-title-text>a')[0].attribs['href']
    }
  }
  let addAllVideos = async (next) => {
    let body = await dp(util.base + next, { headers: { 'accept-language': 'en-US' } }).json()
    if (body.reload === 'now') {
      await addAllVideos(next)
      return
    }
    $('#pl-video-table>tbody').append(body.content_html.replace(/<div class="more-menu-wrapper">/g, ''))
    let more = body.load_more_widget_html
    if (more) await addAllVideos(util.sub(more, '/browse_ajax', 0, '"', 0))
  }
  let more = $('.load-more-button')[0]
  if (more && !skip) await addAllVideos(more.attribs['data-uix-load-more-href'])
  let items = $('#pl-video-table>tbody>tr')
  for (let i = 0; i < items.length; i++) {
    let item = $(items[i])
    let unavailable = !item.find('.timestamp')[0]
    let out = {
      type: 'video',
      index: i + 1,
      id: item[0].attribs['data-video-id'],
      url: util.base + item.find('.pl-video-title>a')[0].attribs['href'],
      name: item[0].attribs['data-title'],
      author: null,
      thumbnail: util.getThumb(item.find('.yt-thumb-clip>img')[0].attribs['data-thumb']),
      duration: 0,
      time: '0:00'
    }
    if (!unavailable) {
      out.author = {
        name: item.find('.pl-video-owner>a').text(true),
        url: util.base + item.find('.pl-video-owner>a')[0].attribs['href']
      }
      out.time = item.find('.timestamp').text(true)
    }
    out.duration = util.hmsToMs(out.time)
    res.duration += out.duration
    res.items.push(out)
  }
  res.time = util.msToHms(res.duration)
  return res
}
