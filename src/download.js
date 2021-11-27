let { YoutubeFormats } = require('./lib/structure')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (id, opts = {}) => {
  let player = await getPlayerData(id)
  if (!player) throw Error('Invalid video')
  let formats = await getFormats(id, player)

  formats = makeFormatsObject(formats)

  return util.removeEmpty(formats)
}

function makeFormatsObject (data) {
  let regex = /(?<=codecs=").*(?=")/

  return new YoutubeFormats(data.map(format => {
    let parts = format.mimeType.split(';')
    return {
      url: format.url,
      mime: parts[0],
      codecs: parts[1].match(regex)[0].split(', '),
      size: Number(format.contentLength),
      duration: Number(format.approxDurationMs),
      samplerate: Number(format.audioSampleRate) || null,
      quality: format.qualityLabel || format.audioQuality,
      channels: format.audioChannels
    }
  }))
}

async function getPlayerData (id) {
  let body = await req.text('watch', { v: id, bpctr: Math.ceil(Date.now() / 1000) }, true)
  let res = JSON.parse(util.between(body, /var\s+?ytInitialPlayerResponse.*?=/, '};', 1))
  if (id.length !== 11 || res.playabilityStatus.status === 'ERROR') return null
  let data = JSON.parse(util.between(body, /window\.ytplayer.*?=.*?{};.*?ytcfg\.set\(/s, '})', 1))
  let player = await req.text(data.PLAYER_JS_URL, {}, true)
  return { sts: data.STS, fn: getCipherFunction(player) }
}

async function getFormats (id, player) {
  let body = await req.api('player', { videoId: id, playbackContext: { contentPlaybackContext: { signatureTimestamp: player.sts } } })
  let formats = [...body.streamingData.formats, ...body.streamingData.adaptiveFormats]
  formats = formats.map(item => {
    if (item.signatureCipher) {
      let cipher = parseData(item.signatureCipher)
      delete item.signatureCipher
      item.url = `${decodeURIComponent(cipher.url)}&${cipher.sp}=${player.fn(decodeURIComponent(cipher.s))}`
    }
    return item
  })
  return formats
}

function parseData (data) {
  let res = {}
  let part = (typeof data === 'object') ? Object.entries(data) : data.split('&').map(x => x.split('='))
  for (let i = 0; i < part.length; i++) {
    let key = part[i][0]
    let val = part[i][1]
    if (typeof val === 'object') val = parseData(val)
    res[key] = val
  }
  return res
}

function getCipherFunction (str) {
  let keys = ['a=a.split("")', '};', 'var ', '(', '=']
  let js = util.between(str, keys[1])
  let top = util.between(js, keys[0], keys[1], 1, -28)
  let fn = keys[2] + util.between(top, keys[0], keys[3], 10, 1).split('.')[0] + keys[4]
  let side = util.between(js, fn, keys[1], 2, -fn.length)
  return eval(side + top) // eslint-disable-line no-eval
}
