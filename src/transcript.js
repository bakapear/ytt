let { YoutubeTranscript } = require('./lib/structs')

let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (id) => {
  if (typeof id !== 'string') throw Error('Invalid value')

  let body = await req.api('get_transcript', { params: Buffer.from([10, id.length, ...Buffer.from(id)]).toString('base64') })
  if (!body || id.length !== 11) throw Error('Invalid video')
  if (!body.actions) throw Error('Video does not have a transcript')

  let trans = makeTranscriptObject(body)

  return util.removeEmpty(trans)
}

async function fetchTranscript (params) {
  let body = await req.api('get_transcript', { params })
  let trans = makeTranscriptObject(body)
  return util.removeEmpty(trans)
}

function makeTranscriptObject (data) {
  let main = data.actions[0].updateEngagementPanelAction.content.transcriptRenderer
  let trans = main.body.transcriptBodyRenderer.cueGroups
  let langs = main.footer.transcriptFooterRenderer.languageMenu.sortFilterSubMenuRenderer.subMenuItems

  let language = langs.splice(langs.findIndex(x => x.selected), 1)[0].title

  langs = langs.map(x => {
    return {
      language: x.title,
      transcript: async () => fetchTranscript(x.continuation.reloadContinuationData.continuation)
    }
  })
  if (!langs.length) langs = null

  let items = []
  for (let t of trans) {
    let cue = t.transcriptCueGroupRenderer.cues[0].transcriptCueRenderer
    items.push({
      text: util.text(cue.cue),
      duration: Number(cue.durationMs),
      offset: Number(cue.startOffsetMs)
    })
  }

  return new YoutubeTranscript({ language, langs, cues: items })
}
