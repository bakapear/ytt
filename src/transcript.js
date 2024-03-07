import { YouTubeTranscript } from './lib/structs.js'
import { removeEmpty, text, stb } from './lib/util.js'
import { api } from './lib/request.js'

export default async (videoId, lang) => {
  if (typeof videoId !== 'string') throw Error('Invalid value')

  let body = await api('get_transcript', { params: genToken(videoId, lang) })
  if (!body || videoId.length !== 11) throw Error('Invalid video')
  if (!body.actions) throw Error('Video does not have a transcript in that language')

  let trans = makeTranscriptObject(body)

  return removeEmpty(trans)
}

function makeTranscriptObject (data) {
  let main = data.actions[0].updateEngagementPanelAction.content.transcriptRenderer
  let trans = main.body.transcriptBodyRenderer.cueGroups
  let langs = main.footer.transcriptFooterRenderer.languageMenu.sortFilterSubMenuRenderer.subMenuItems

  langs = langs.map(x => {
    return {
      current: x.selected,
      title: x.title,
      code: langs.length > 1 ? getLangFromToken(x.continuation.reloadContinuationData.continuation) : null
    }
  })
  if (!langs.length) langs = null

  let items = []
  for (let t of trans) {
    let cue = t.transcriptCueGroupRenderer.cues[0].transcriptCueRenderer
    items.push({
      text: text(cue.cue),
      duration: Number(cue.durationMs),
      offset: Number(cue.startOffsetMs)
    })
  }

  return new YouTubeTranscript({ langs, cues: items })
}

function getLangFromToken (token) {
  let raw = Buffer.from(token, 'base64').slice(15).toString()
  raw = Buffer.from(raw, 'base64')
  let o = 3 + raw[1]
  return raw.slice(o + 1, o + 1 + raw[o]).toString() + (raw[1] ? '-auto' : '')
}

function genToken (id, lang) {
  let a = [10, ...stb(id)]
  if (lang) {
    if (lang.endsWith('-auto')) {
      lang = lang.slice(0, -5)
      a.push(18, ...stb('asr'))
    }
    let b = Buffer.from([10, 0, 18, ...stb(lang), 26, 0])
    a.push(18, ...stb(b.toString('base64')))
  }
  return Buffer.from(a).toString('base64')
}
