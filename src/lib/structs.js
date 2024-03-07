import { next } from './util.js'

export function YouTubeSearch (data) {
  this.query = data.query
  this.suggested = data.suggested
  this.corrected = data.corrected
  this.size = data.size
  if (data.results) next.call(this, data, 'results')
}

export function YouTubeVideo (data) {
  this.id = data.id
  this.index = data.index
  this.unlisted = data.unlisted
  this.private = data.private
  this.deleted = data.deleted
  this.live = data.live
  this.stream = data.stream
  this.premiere = data.premiere
  this.title = data.title
  this.description = data.description
  this.duration = data.duration
  this.views = data.views
  this.viewers = data.viewers
  this.date = data.date
  this.likes = data.likes
  this.dislikes = data.dislikes
  this.category = data.category
  this.tags = data.tags
  this.labels = data.labels
  this.comments = data.comments
  if (data.chapters) this.chapters = data.chapters.map(x => new YouTubeChapter(x))
  if (data.channel) this.channel = new YouTubeChannel(data.channel)
  if (data.game) this.game = new YouTubeChannel(data.game)
  if (data.topic) this.topic = new YouTubeChannel(data.topic)
  if (data.songs) this.songs = data.songs.map(x => new YouTubeSong(x))
  if (data.thumbnail) this.thumbnail = new YouTubeThumbnails(data.thumbnail)

  if (data.related) next.call(this, data, 'related')
}

export function YouTubeChannel (data) {
  this.id = data.id
  this.legacy = data.legacy
  this.custom = data.custom
  this.verified = data.verified
  this.generated = data.generated
  this.title = data.title
  this.description = data.description
  this.size = data.size
  this.views = data.views
  this.subscribers = data.subscribers
  this.date = data.date
  this.tags = data.tags
  this.labels = data.labels
  this.year = data.year
  this.devs = data.devs
  if (data.avatar) this.avatar = new YouTubeThumbnails(data.avatar)
  if (data.banner) this.banner = new YouTubeThumbnails(data.banner)
}

export function YouTubePlaylist (data) {
  this.id = data.id
  this.unlisted = data.unlisted
  this.title = data.title
  this.description = data.description
  this.size = data.size
  this.views = data.views
  this.date = data.date
  if (data.channel) this.channel = new YouTubeChannel(data.channel)
  if (data.thumbnail) this.thumbnail = new YouTubeThumbnails(data.thumbnail)

  if (data.videos) next.call(this, data, 'videos')
}

export function YouTubeMix (data) {
  this.id = data.id
  this.title = data.title
  if (data.thumbnail) this.thumbnail = new YouTubeThumbnails(data.thumbnail)

  if (data.videos) next.call(this, data, 'videos') // TODO
}

export function YouTubeFormats (data) {
  // TODO: add cool methods
  this.url = data[0].url
  this.formats = data.map(x => new YouTubeFormat(x))
}

export function YouTubeFormat (data) {
  this.itag = data.itag
  this.url = data.url
  this.mime = data.mime
  this.codecs = data.codecs
  this.quality = data.quality
  this.width = data.width
  this.height = data.height
  this.bitrate = data.bitrate
  this.samplerate = data.samplerate
  this.channels = data.channels
  this.size = data.size
  this.duration = data.duration
  this.fps = data.fps
}

export function YouTubeThumbnails (data) {
  // TODO: add cool methods
  this.url = data[0].url
  this.thumbnails = data.map(x => new YouTubeThumbnail(x))
}

export function YouTubeThumbnail (data) {
  this.url = data.url
  this.width = data.width
  this.height = data.height
}

export function YouTubeTranscript (data) {
  this.cues = data.cues.map(x => new YouTubeTranscriptCue(x))
  if (data.langs) this.langs = data.langs.map(x => new YouTubeTranscriptLanguage(x))
}

export function YouTubeTranscriptLanguage (data) {
  this.current = data.current
  this.title = data.title
  this.code = data.code
}

export function YouTubeTranscriptCue (data) {
  this.text = data.text
  this.duration = data.duration
  this.offset = data.offset
}

export function YouTubeComment (data) {
  this.id = data.id
  this.edited = data.edited
  this.hearted = data.hearted
  this.pinned = data.pinned
  this.owner = data.owner
  this.text = data.text
  this.likes = data.likes
  this.date = data.date
  this.replies = data.replies
  if (data.channel) this.channel = new YouTubeChannel(data.channel)
}

export function YouTubeChapter (data) {
  this.title = data.title
  this.offset = data.offset
  this.thumbnail = new YouTubeThumbnails(data.thumbnail)
}

export function YouTubeSong (data) {
  this.title = data.title
  this.artist = data.artist
  this.album = data.album
  this.license = data.license
  if (data.video) this.video = new YouTubeVideo(data.video)
  if (data.channel) this.channel = new YouTubeChannel(data.channel)
}
