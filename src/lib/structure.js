function YoutubeSearch (data) {
  this.query = data.query
  this.corrected = data.corrected
  this.size = data.size

  if (data.results) more.call(this, data, 'results')
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
  if (data.channel) this.channel = new YoutubeChannel(data.channel)
  if (data.thumbnail) this.thumbnail = new YoutubeThumbnails(data.thumbnail)

  if (data.comments) more.call(this, data, 'comments')
}

function YoutubeChannel (data) {
  this.id = data.id
  this.legacy = data.legacy
  this.custom = data.custom
  this.verified = data.verified
  this.title = data.title
  this.description = data.description
  this.views = data.views
  this.size = data.size
  this.subscribers = data.subscribers
  this.date = data.date
  this.tags = data.tags
  if (data.avatar) this.avatar = new YoutubeThumbnails(data.avatar)
  if (data.banner) this.banner = new YoutubeThumbnails(data.banner)

  // TODO: all of the things below
  if (data.videos) more.call(this, data, 'videos')
  if (data.playlists) more.call(this, data, 'playlists')
  if (data.posts) more.call(this, data, 'posts')
  if (data.channels) more.call(this, data, 'channels')
  if (data.search) { /* search function here */ }
}

function YoutubePlaylist (data) {
  this.id = data.id
  this.type = data.type
  this.title = data.title
  this.description = data.description
  this.views = data.views
  this.size = data.size
  this.date = data.date
  if (data.channel) this.channel = new YoutubeChannel(data.channel)
  if (data.thumbnail) this.thumbnail = new YoutubeThumbnails(data.thumbnail)

  if (data.videos) more.call(this, data, 'videos')
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
  this.lang = data.lang
  this.cues = data.cues.map(x => new YoutubeTranscriptCue(x))
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
  if (data.channel) this.channel = new YoutubeChannel(data.channel)

  if (data.replies) more.call(this, data, 'replies')
}

function more (data, prop) {
  this[prop] = []
  if (!data[prop]) data[prop] = {}
  Object.defineProperties(this[prop], {
    continuation: { enumerable: false, writable: true, value: data[prop].continuation },
    fetch: { enumerable: false, value: data[prop].fetch },
    more: {
      enumerable: false,
      value: async () => {
        if (!this[prop].continuation) return false
        let res = await this[prop].fetch(this[prop].continuation)
        this[prop].continuation = res.continuation
        this[prop].push(...res.items)
        return true
      }
    }
  })
}

module.exports = { YoutubeSearch, YoutubeVideo, YoutubeChannel, YoutubePlaylist, YoutubeFormats, YoutubeTranscript, YoutubeComment }
