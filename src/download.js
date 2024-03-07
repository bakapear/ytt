import { YouTubeFormats } from './lib/structs.js'
import { removeEmpty } from './lib/util.js'
import { api } from './lib/request.js'

export default async (videoId) => {
  if (typeof videoId !== 'string') throw Error('Invalid value')

  let body = await api('player', { videoId, context: { client: { clientName: '3', clientVersion: '16.50' } } })
  if (body.playabilityStatus.status !== 'OK') throw Error(body.playabilityStatus.reason)

  let formats = makeFormatsObject([...(body.streamingData.formats || []), ...(body.streamingData.adaptiveFormats || [])])

  return removeEmpty(formats)
}

function makeFormatsObject (data) {
  let regex = /(?<=codecs=").*(?=")/

  return new YouTubeFormats(data.map(format => {
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
