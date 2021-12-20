let req = require('./lib/request')
let URL = 'https://suggestqueries.google.com/complete/search'

module.exports = async (value, lang = 'en') => {
  if (typeof id !== 'string') throw Error('Invalid value')
  let body = await req.text(URL, { client: 'youtube', q: value, hl: lang, ds: 'yt', xssi: 't' })
  return JSON.parse(body.slice(5))[1].map(x => x[0])
}
