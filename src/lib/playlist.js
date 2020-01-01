let got = require('got')
let util = require('./util.js')
let cheerio = require('cheerio')

module.exports = async function (id = '', skip = false) {
  let body = await got('playlist', {
    prefixUrl: util.base,
    headers: { 'accept-language': 'en-US' },
    searchParams: {
      disable_polymer: 1,
      list: id
    }
  }).text()
  let $ = cheerio.load(body)
  if (!$('.pl-header-title')[0]) return { error: 'No playlist id found: ' + id }
  let res = {
    type: 'playlist',
    id: id,
    url: util.base + '/playlist?list=' + id,
    name: $('.pl-header-title').text().trim(),
    description: $('.pl-header-description-text')[0] ? $('.pl-header-description-text').text().trim() : '',
    author: null,
    size: util.formatStat($('.pl-header-details>li:nth-child(2)').text().trim(), 'videos'),
    views: util.formatStat($('.pl-header-details>li:nth-child(3)').text().trim(), 'views'),
    thumbnail: util.getThumb($('.pl-header-thumb>img')[0].attribs['src']),
    duration: 0,
    time: '',
    items: []
  }
  if ($('.qualified-channel-title-text>a')[0]) {
    res.author = {
      name: $('.qualified-channel-title-text>a').text().trim(),
      img: $('.channel-header-profile-image')[0].attribs['src'],
      url: util.base + $('.qualified-channel-title-text>a')[0].attribs['href']
    }
  }
  let addAllVideos = async (next) => {
    let body = await got(util.base + next, { headers: { 'accept-language': 'en-US' } }).json()
    $('#pl-video-table>tbody').append(body.content_html)
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
        name: item.find('.pl-video-owner>a').text().trim(),
        url: util.base + item.find('.pl-video-owner>a')[0].attribs['href']
      }
      out.time = item.find('.timestamp').text().trim()
    }
    out.duration = util.hmsToMs(out.time)
    res.duration += out.duration
    res.items.push(out)
  }
  res.time = util.msToHms(res.duration)
  return res
}
