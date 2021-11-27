let { YoutubeTranscript } = require('./lib/structure')

let util = require('./lib/util')
let req = require('./lib/request')

module.exports = async (id, opts) => {
  if (typeof id !== 'string') throw Error('Invalid value')
  // TODO: find way to add lang params
  let body = await req.api('get_transcript', { params: Buffer.from(Buffer.from([10, 11]) + id).toString('base64') })
  if (!body || id.length !== 11) throw Error('Invalid video')
  if (!body.actions) throw Error('Video does not have a transcript')

  let trans = makeTranscriptObject(body)

  return util.removeEmpty(trans)
}

function makeTranscriptObject (data) {
  let main = data.actions[0].updateEngagementPanelAction.content.transcriptRenderer
  let trans = main.body.transcriptBodyRenderer.cueGroups
  let lang = main.footer.transcriptFooterRenderer.languageMenu.sortFilterSubMenuRenderer.subMenuItems[0].title

  let items = []
  for (let t of trans) {
    let cue = t.transcriptCueGroupRenderer.cues[0].transcriptCueRenderer
    items.push({
      text: util.text(cue.cue),
      duration: Number(cue.durationMs),
      offset: Number(cue.startOffsetMs)
    })
  }

  return new YoutubeTranscript({ lang, cues: items })
}
