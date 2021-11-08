function YoutubePlaylist (data) {
  this.id = data.id
  this.type = data.type
  this.title = data.title
  this.description = data.description
  this.stats = {
    views: data.views,
    videos: data.size,
    date: data.date
  }
  this.thumbnail = data.thumbnail
  this.author = data.author
  this.items = data.items
  if (data.items) more.call(this, data)
}

function YoutubeChannel (data) {
  this.id = data.id
  this.vanity = data.vanity
  this.title = data.title
  this.description = data.description
  this.stats = {
    views: data.views,
    videos: data.size,
    subscribers: data.subscribers,
    date: data.date
  }
  this.thumbnail = data.thumbnail
  this.banner = data.banner
}

function YoutubeVideo (data) {
  this.id = data.id
  this.index = data.index
  this.type = data.type
  this.title = data.title
  this.description = data.description
  this.stats = {
    views: data.views,
    duration: data.duration || 0,
    date: data.date,
    likes: data.likes,
    dislikes: data.dislikes
  }
  this.thumbnail = data.thumbnail
  this.author = data.author
}

function YoutubeQuery (data) {
  this.query = data.query
  this.stats = {
    results: data.results,
    corrected: data.corrected
  }
  this.items = data.items
  if (data.items) more.call(this, data)
}

function YoutubeThumbnail (data) {
  this.url = data.url

  thumb.call(this, data)
}

function YoutubeFormat (data) {
  this.itag = data.itag
  this.url = data.url
  this.mime = data.mime
  this.codecs = data.codecs
  this.quality = data.quality
  this.stats = {
    width: data.width,
    height: data.height,
    bitrate: data.bitrate,
    samplerate: data.samplerate,
    channels: data.channels,
    size: data.size,
    duration: data.duration,
    fps: data.fps
  }
}

function YoutubeFormats (data) {
  let arr = data.map(x => new YoutubeFormat(x))
  return arr
}

function more (data) {
  Object.defineProperty(this.items, 'more', {
    enumerable: false,
    value: async () => {
      if (!this.items.continuation) return false
      let data = await this.fetch(this.items.continuation)
      this.items.continuation = data.continuation
      if (data.items) this.items.push(...data.items)
      return true
    }
  })
  if (data.continuation) Object.defineProperty(this.items, 'continuation', { enumerable: false, writable: true, value: data.continuation })
  if (data.fetch) Object.defineProperty(this, 'fetch', { enumerable: false, value: data.fetch })
}

function thumb (data) {
  this.url = this.url.substr(0, this.url.indexOf('='))
  if (this.url.slice(0, 2) === '//') this.url = 'https:' + this.url
}

module.exports = { YoutubePlaylist, YoutubeChannel, YoutubeVideo, YoutubeQuery, YoutubeThumbnail, YoutubeFormats }
