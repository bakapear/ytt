let dp = require('despair')
let hy = require('honesty')
let util = require('./util.js')

let banned = ['.spell-correction', '.search-refinements', '.branded-page-module-title-text']

let filters = {
  video: 'EgIQAQ%3D%3D',
  channel: 'EgIQAg%3D%3D',
  playlist: 'EgIQAw%3D%3D'
}

module.exports = async function (query = '', opts = {}) {
  let filter = filters[opts.filter] || null
  let res = {
    type: 'query',
    url: util.base + '/results?search_query=' + encodeURIComponent(query) + (filter ? '&sp=' + filter : ''),
    filter: filter,
    value: query,
    items: []
  }
  let repeat = async (sp = '') => {
    let body = await dp('results', {
      base: util.base,
      headers: { 'accept-language': 'en-US' },
      query: {
        disable_polymer: 1,
        search_query: query,
        sp: sp
      }
    }).text()
    let $ = hy(body)
    let list = $('.item-section>li')
    if (list.text().indexOf('No results for') >= 0) return res
    for (let i = 0; i < list.length; i++) {
      let item = $(list[i])
      if (banned.some(x => item.find(x)[0])) continue
      let type = 'video'
      switch (item.find('.accessible-description').text(true)) {
        case '- Playlist': {
          type = 'playlist'
          break
        }
        case '- Channel': {
          type = 'channel'
          break
        }
      }
      let out = {
        type: type,
        id: null,
        url: util.base + item.find('.yt-lockup-title>a')[0].attribs['href'],
        name: item.find('.yt-lockup-title>a')[0].attribs['title'],
        description: item.find('.yt-lockup-description').text(true),
        author: null,
        size: null,
        views: null,
        thumbnail: null,
        duration: 0,
        time: '0:00'
      }
      switch (out.type) {
        case 'video': {
          delete out.size
          out.id = item.find('.yt-lockup')[0].attribs['data-context-item-id']
          out.time = item.find('.video-time').text(true)
          out.duration = util.hmsToMs(out.time)
          out.author = {
            name: item.find('.yt-lockup-byline>a').text(true),
            url: util.base + item.find('.yt-lockup-byline>a')[0].attribs['href']
          }
          out.views = util.formatStat($(item.find('.yt-lockup-meta-info>li')[1]).text(true), 'views')
          break
        }
        case 'channel': {
          delete out.id
          delete out.author
          delete out.views
          delete out.duration
          delete out.time
          out.size = util.formatStat(item.find('.yt-lockup-meta-info>li').text(true), 'videos')
          break
        }
        case 'playlist': {
          delete out.description
          delete out.views
          delete out.duration
          delete out.time
          if (!item.find('.yt-lockup-byline>a')[0]) continue
          out.author = {
            name: item.find('.yt-lockup-byline>a').text(true),
            url: util.base + item.find('.yt-lockup-byline>a')[0].attribs['href']
          }
          out.id = out.url.substr(out.url.indexOf('&list=') + 6)
          out.url = util.base + '/playlist?list=' + out.id
          out.size = util.formatStat(item.find('.formatted-video-count-label').text(true), 'videos')
          break
        }
      }
      let img = item.find('.yt-thumb-simple>img')[0].attribs
      if (img['data-thumb']) out.thumbnail = util.getThumb(img['data-thumb'])
      else out.thumbnail = util.getThumb(img['src'])
      if (out.thumbnail.startsWith('//')) out.thumbnail = 'https:' + out.thumbnail
      res.items.push(out)
    }
    let more = $('.search-pager')[0]
    if (more && opts.num && res.items.length < opts.num) {
      let pages = more.children
      let url = pages[pages.length - 2].attribs['href']
      if (url) await repeat(decodeURIComponent(url.substr(url.indexOf('&sp=') + 4)))
    }
  }
  await repeat(filter)
  if (opts.num && res.items.length >= opts.num) res.items.length = opts.num
  return res
}
