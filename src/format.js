let util = require('./lib/util')

module.exports = value => {
  if (typeof value !== 'string') throw util.error(`Invalid string value: '${value}'`)
  value = value.trim()
  let match = value.match(/^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?.*?(?:v|list)=(.*?)(?:&|$)|^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?(?:(?!=).)*\/(.*)$/i)
  if (match) {
    match = match.filter(x => x)
    value = match[match.length - 1]
  }
  if (value.match(/^([^"&?/ ]*)$/)) {
    if (value.length === 11) return { type: 'video', value }
    if (value.length === 34 || value.length === 26 || value.length === 18) return { type: 'playlist', value }
  }
  return { type: 'query', value }
}
