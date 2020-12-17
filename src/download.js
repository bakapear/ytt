let dp = require('despair')
let util = require('./lib/util')
let builder = require('./lib/builder')
let valid = require('./valid')

module.exports = async function (id) {
  if (!await valid(id, 'video')) throw util.error(`Invalid video ID: '${id}'`)
  let player = await getPlayerData(id)
  let data = await getVideoData(id, player.sts)
  let formats = Object.values(data.streamingData.adaptiveFormats)
  if (data.streamingData.formats) formats.push(...Object.values(data.streamingData.formats))
  return builder.makeVideoInfoObject(data, decipherFormats(formats, player.fn))
}

async function getPlayerData (id) {
  let video = await dp('watch', {
    base: util.base,
    query: {
      v: id,
      hl: 'en',
      bpctr: Math.ceil(Date.now() / 1000)
    }
  }).text()
  video = JSON.parse(util.between(video, /window\.ytplayer.*?=.*?{};.*?ytcfg\.set\(/s, '})', 1))
  let player = await dp(video.PLAYER_JS_URL, { base: util.base }).text()
  return {
    sts: video.STS,
    fn: getCipherFunction(player)
  }
}

function getCipherFunction (str) {
  let keys = ['a=a.split("")', '};', 'var ', '(', '=']
  let js = util.between(str, `${keys[0]};${keys[2]}`)
  let top = util.between(js, keys[0], keys[1], 1, -28)
  let fn = keys[2] + util.between(top, keys[0], keys[3], 10, 1).split('.')[0] + keys[4]
  let side = util.between(js, fn, keys[1], 2, -fn.length)
  return eval(side + top) // eslint-disable-line no-eval
}

async function getVideoData (id, sts, detail) {
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
  body = parseData(body)
  return body.player_response
}

function parseData (data) {
  let res = {}
  let part = (typeof data === 'object') ? Object.entries(data) : data.split('&').map(x => x.split('='))
  for (let i = 0; i < part.length; i++) {
    let key = part[i][0]
    let val = part[i][1]
    if (key === 'player_response') val = JSON.parse(decodeURIComponent(val))
    if (typeof val === 'object') val = parseData(val)
    res[key] = val
  }
  return res
}

function decipherFormats (data, fn) {
  data = Object.values(data)
  for (let i = 0; i < data.length; i++) {
    let item = data[i]
    if (item.mimeType) item.mimeType = item.mimeType.replace(/\+/g, ' ')
    if (item.signatureCipher) {
      let cipher = parseData(item.signatureCipher)
      delete item.signatureCipher
      item.url = `${decodeURIComponent(cipher.url)}&${cipher.sp}=${fn(decodeURIComponent(cipher.s))}`
    }
  }
  return data
}
