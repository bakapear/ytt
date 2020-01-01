module.exports = (id = '') => {
  let match = id.match(/^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?.*?(?:v|list)=(.*?)(?:&|$)|^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?(?:(?!=).)*\/(.*)$/i)
  if (match) id = match[1]
  if (id.match(/^([^"&?/ ]*)$/)) {
    if (id.length === 11) return { type: 'video', id: id }
    if (id.length === 34) return { type: 'playlist', id: id }
  }
  return null
}
