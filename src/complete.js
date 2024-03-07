import { text } from './lib/request.js'
let URL = 'https://suggestqueries.google.com/complete/search'

export default async (query, lang = 'en') => {
  if (typeof query !== 'string') throw Error('Invalid value')

  let body = await text(URL, { client: 'youtube', q: query, hl: lang, ds: 'yt', xssi: 't' })
  return JSON.parse(body.slice(5))[1].map(x => x[0])
}
