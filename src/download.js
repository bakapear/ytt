let { YoutubeFormats } = require('./lib/structs')
let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (videoId) => {
  if (typeof videoId !== 'string') throw Error('Invalid value')

  let body = await req.api('player', { videoId: videoId, context: { client: { clientName: '3', clientVersion: '16.50' } } })
  if (body.playabilityStatus.status !== 'OK') throw Error(body.playabilityStatus.reason)

  let formats = makeFormatsObject([...(body.streamingData.formats || []), ...(body.streamingData.adaptiveFormats || [])])

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
