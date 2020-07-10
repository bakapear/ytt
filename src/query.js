let dp = require('despair')
let util = require('./lib/util')
let builder = require('./lib/builder')
let filters = { video: 'EgIQAQ==', channel: 'EgIQAg==', playlist: 'EgIQAw==', short: 'EgIYAQ==', long: 'EgIYAg==' }

module.exports = async function (query, opts = {}) {
  if (!query) throw util.error(`Invalid query: '${query}'`)
  let data = await getQueryData(query, filters[opts.filter])
  let search = builder.makeQueryObject(data)
  let min = Number(opts.min)
  let max = Number(opts.max)
  if (!isNaN(min)) while (search.items.continuation && search.items.length < min) await search.items.more()
  if (!isNaN(max)) if (search.items.length > max) search.items.length = max
  return search
}

async function getQueryData (query, filter, retries = 5) {
  if (retries <= 0) throw util.error('Failed to fetch the YouTube page properly!')
  let body = await dp('results', {
    base: util.base,
    headers: { 'Accept-Language': 'en-US' },
    query: { search_query: query, sp: filter }
  }).text()
  body = util.parse(body)
  try { body = JSON.parse(body) } catch (e) { return getQueryData(query, filter, --retries) }
  let content = body.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents[0]
  if (body.content && content.promotedSparklesTextSearchRenderer) return getQueryData(query, filter, --retries)
  return body
}
