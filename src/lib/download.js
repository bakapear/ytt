let dp = require('despair')
let util = require('./util.js')

module.exports = async function (id = '') {
  let info = await getPlayerData(id)
  let data = await getVideoData(id, info.sts)
  return formatResponse(data, info.fn)
}

function decodeStr (str) {
  if (str) return str.replace(/\+/g, ' ')
}

function formatResponse (data, fn) {
  let details = data.player_response.videoDetails
  let res = {
    error: decodeStr(data.player_response.playabilityStatus.reason),
    videoId: details.videoId,
    channelId: details.channelId,
    title: decodeStr(details.title),
    description: decodeStr(details.shortDescription),
    author: decodeStr(details.author),
    keywords: details.keywords ? details.keywords.map(x => decodeStr(x)) : [],
    viewCount: details.viewCount,
    isPrivate: details.isPrivate,
    isLiveContent: details.isLiveContent,
    allowRatings: details.allowRatings,
    isOwnerViewing: details.isOwnerViewing,
    averageRating: details.averageRating,
    thumbnails: details.thumbnail.thumbnails,
    duration: details.lengthSeconds * 1000,
    formats: data.player_response.streamingData ? data.player_response.streamingData.formats : []
  }
  if (!res.error) delete res.error
  res.formats = res.formats.map(x => {
    if (x.s) x.url += `&${x.sp}=` + fn(x.s)
    x.mimeType = decodeStr(x.mimeType)
    let res = {
      itag: x.itag,
      format: x.mimeType.split(';')[0].split('/')[1],
      type: x.width && x.audioQuality ? 'video/audio' : x.width ? 'video' : x.audioQuality ? 'audio' : null,
      codecs: x.mimeType.match(/codecs="(.*?)"/)[1].split(',').map(x => x.trim())
    }
    if (x.contentLength) res.size = x.contentLength
    if (x.approxDurationMs) res.duration = x.approxDurationMs
    if (res.type.indexOf('video') >= 0) {
      if (x.qualityLabel) res.quality = x.qualityLabel
      if (x.width && x.height) res.dimension = `${x.width}x${x.height}`
      if (x.bitrate) res.bitrate = x.bitrate.toString()
    }
    if (res.type.indexOf('audio') >= 0) {
      if (x.audioSampleRate) res.samplerate = x.audioSampleRate
    }
    res.url = x.url
    return res
  })
  return res
}

async function getPlayerData (id) {
  let url = await getPlayerUrl(id)
  let body = await dp(url).text()
  return {
    sts: util.sub(body, ',sts:', 5, ','),
    fn: findCipherFunctions(body)
  }
}

async function getPlayerUrl (id, retries = 3) {
  let body = await dp('https://youtube.com/watch', {
    query: {
      v: id,
      hl: 'en',
      bpctr: Math.ceil(Date.now() / 1000)
    }
  }).text()
  let url = util.base + util.sub(body, '/s/player/', 0, 'base.js', 7)
  if (url.indexOf('/s/player/') < 0) {
    if (retries < 0) throw new Error('Could not retrieve player url!')
    url = await getPlayerUrl(id, --retries)
  }
  return url
}

function findCipherFunctions (js) {
  js = js.substr(js.indexOf('a=a.split("");var') + 1)
  let top = util.sub(js, 'a=a.split("")', -15, '};', 1)
  let side = util.sub(js, `var ${util.sub(top, 'a=a.split("")', 14, '(').split('.')[0]}`, 0, '};', 2)
  return eval(side + top) // eslint-disable-line no-eval
}

async function getVideoData (id, sts, detail) {
  if (sts === 'f') sts = ''
  let data = await getVideoInfo(id, sts, detail)
  data = parseData(data)
  if (data.status !== 'ok') throw new Error(decodeStr(data.reason))
  if (!detail && !data.player_response.streamingData) data = await getVideoData(id, sts, true)
  return data
}

async function getVideoInfo (id, sts, detail) {
  let body = await dp('get_video_info', {
    base: util.base,
    query: {
      video_id: id,
      eurl: 'https://youtube.googleapis.com/v/' + id,
      ps: 'default',
      gl: 'US',
      hl: 'en',
      el: detail ? 'detailpage' : 'embedded',
      sts: sts
    }
  }).text()
  return body
}

function parseData (str) {
  let data = {}
  str.split('&').forEach(x => {
    let key = x.substr(0, x.indexOf('='))
    let value = x.substr(x.indexOf('=') + 1)
    value = decodeURIComponent(value)
    if (key === 'player_response') value = JSON.parse(value)
    if (value.constructor === String) {
      if (value.indexOf('&') >= 0 && key !== 'url' && key !== 'shortDescription') value = parseData(value)
      else if (value.indexOf(',') >= 0) value = value.split(',')
      else if (value === 'true') value = true
      else if (value === 'false') value = false
      else if (!isNaN(value)) value = Number(value)
    }
    data[key] = value
  })
  if (data && data.player_response && data.player_response.streamingData) {
    if (data.player_response.streamingData && data.player_response.streamingData.adaptiveFormats) {
      data.player_response.streamingData.formats.push(...data.player_response.streamingData.adaptiveFormats)
    }
    data.player_response.streamingData.formats = data.player_response.streamingData.formats.map(x => {
      if (x.cipher) {
        let data = parseData(x.cipher)
        delete x.cipher
        return { ...x, ...data }
      }
      return x
    })
  }
  return data
}
