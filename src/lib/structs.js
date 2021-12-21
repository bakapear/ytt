let { next } = require('./util')

function YoutubeSearch (data) {
  this.query = data.query
  this.suggested = data.suggested
  this.corrected = data.corrected
  this.size = data.size
  if (data.results) next.call(this, data, 'results')
}

function YoutubeVideo (data) {
  this.id = data.id
  this.index = data.index
  this.type = data.type
  this.live = data.live
  this.new = data.new
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
  this.comments = data.comments
  if (data.chapters) this.chapters = data.chapters.map(x => new YoutubeChapter(x))
  if (data.channel) this.channel = new YoutubeChannel(data.channel)
  if (data.thumbnail) this.thumbnail = new YoutubeThumbnails(data.thumbnail)

  if (data.related) next.call(this, data, 'related')
}

function YoutubeChannel (data) {
  this.id = data.id
  this.legacy = data.legacy
  this.custom = data.custom
  this.verified = data.verified
  this.title = data.title
  this.description = data.description
  this.size = data.size
  this.views = data.views
  this.subscribers = data.subscribers
  this.date = data.date
  this.tags = data.tags
  if (data.avatar) this.avatar = new YoutubeThumbnails(data.avatar)
  if (data.banner) this.banner = new YoutubeThumbnails(data.banner)

  // TODO: all of the things below
  if (data.videos) next.call(this, data, 'videos')
  if (data.playlists) next.call(this, data, 'playlists')
  if (data.posts) next.call(this, data, 'posts')
  if (data.channels) next.call(this, data, 'channels')
  if (data.search) { /* search function here */ }
}

function YoutubePlaylist (data) {
  this.id = data.id
  this.type = data.type
  this.title = data.title
  this.description = data.description
  this.size = data.size
  this.views = data.views
  this.date = data.date
  if (data.channel) this.channel = new YoutubeChannel(data.channel)
  if (data.thumbnail) this.thumbnail = new YoutubeThumbnails(data.thumbnail)

  if (data.videos) next.call(this, data, 'videos')
}

function YoutubeFormats (data) {
  // TODO: add cool methods
  this.url = data[0].url
  this.formats = data.map(x => new YoutubeFormat(x))
}

function YoutubeFormat (data) {
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

function YoutubeThumbnails (data) {
  // TODO: add cool methods
  this.url = data[0].url
  this.thumbnails = data.map(x => new YoutubeThumbnail(x))
}

function YoutubeThumbnail (data) {
  this.url = data.url
  this.width = data.width
  this.height = data.height
}

function YoutubeTranscript (data) {
  this.language = data.language
  this.cues = data.cues.map(x => new YoutubeTranscriptCue(x))
  if (data.langs) this.langs = data.langs
}

function YoutubeTranscriptCue (data) {
  this.text = data.text
  this.duration = data.duration
  this.offset = data.offset
}

function YoutubeComment (data) {
  this.id = data.id
  this.edited = data.edited
  this.hearted = data.hearted
  this.pinned = data.pinned
  this.owner = data.owner
  this.text = data.text
  this.likes = data.likes
  this.date = data.date
  this.replies = data.replies
  if (data.channel) this.channel = new YoutubeChannel(data.channel)
}

function YoutubeChapter (data) {
  this.title = data.title
  this.offset = data.offset
  this.thumbnail = new YoutubeThumbnails(data.thumbnail)
}

module.exports = { YoutubeSearch, YoutubeVideo, YoutubeChannel, YoutubePlaylist, YoutubeFormats, YoutubeTranscript, YoutubeComment }
