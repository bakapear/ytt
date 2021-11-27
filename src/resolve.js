let util = require('./lib/util')
let req = require('./lib/request')

// Explanation here: https://regex101.com/r/OJo8wb/1
let REGEX = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be|(?:be|be-nocookie)\.com)\/(?:(?<=\.be\/)([a-zA-Z0-9-_]{11}))?(?:(?:vi|v(?:ideo)?|e(?:mbed)?)\/([a-zA-Z0-9-_]{11}))?(?:(?=.*?[?&]v=([a-zA-Z0-9-_]{11}))|)(?:(?=.*?[?&]list=([a-zA-Z0-9-_]{2,35}))|)(?:(?=(?:c|user)\/([a-zA-Z0-9-_]+))|)(?:(?=channel\/([a-zA-Z0-9-_]+))|)/

module.exports = async (value, fast) => {
  if (typeof value !== 'string') throw Error('Invalid value')
  value = value.trim()
  let res = {}

  let match = value.match(REGEX)
  if (match) {
    res = {
      video: match[1] || match[2] || match[3],
      playlist: match[4],
      name: match[5],
      channel: match[6]
    }
  } else res.query = value

  if (!fast && (res.name || util.isEmpty(res, true))) {
    let last = value
    let i = 0
    while (last) {
      let body = await req.api('navigation/resolve_url', { url: value })
      if (!body) return null
      value = body.endpoint.urlEndpoint?.url
      if (!value) {
        let end = body.endpoint
        res = {
          video: end.watchEndpoint?.videoId,
          playlist: end.watchEndpoint?.playlistId,
          browse: end.browseEndpoint?.browseId,
          query: end.searchEndpoint?.query
        }
        if (res.browse) {
          if (res.browse.startsWith('UC')) res.channel = res.browse
          else res.playlist = res.browse.substr(2)
          delete res.browse
        }
        break
      }
      if (value === last || i++ === 5) return null
      last = value
    }
  }

  return util.removeEmpty(res)
}
