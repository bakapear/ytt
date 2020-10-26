# YouTubeTools

This package provides youtube functions without needing an API key for any of them.

## Methods
```js
ytt.format('cool video with ducks') 
// { type: 'query', value: 'cool video with ducks' }
ytt.format('https://www.youtube.com/playlist?list=PLCxjFBEyIgt1FmIYPZrodi19Vv_Z8K9LJ') 
// { type: 'playlist', value: 'PLCxjFBEyIgt1FmIYPZrodi19Vv_Z8K9LJ' }
ytt.format('YdzEQmuZw6M')
// { type: 'video', value: 'YdzEQmuZw6M' }

await ytt.valid('woof')
// Error: Not an ID: 'woof'
await ytt.valid('iZ0hyEBxj1Q')
// true
await ytt.valid('iiiiiiiiiii')
// false

await ytt.video('lLeLDDmhbFw')
// YoutubeVideo
await ytt.channel('UC6zqgjyGaf_b6nd3rqR7MUA') || await ytt.channel('proxbomb')
// YoutubeChannel
await ytt.playlist('PLToKALUfVcJDbcWImpZ-IQxaTkUtbprAh')
// YoutubePlaylist
await ytt.query('funny duck compilation')
// YoutubeQuery

await ytt.download('VIjSkkmhCTM')
// { info: YoutubeVideo, formats: YoutubeFormats }
```

### Options and Paging
```js
await ytt.playlist('PLYqMopOHwQ8hm6tCpbJavL_izixM76SyX', { min: 400 }) 
// gets a minimum of 400 videos from a playlist (can be more)
await ytt.playlist('PLYqMopOHwQ8hm6tCpbJavL_izixM76SyX', { min: 200, max: 200 }) 
// gets exactly 200 videos from a playlist
await ytt.playlist('PLYqMopOHwQ8hm6tCpbJavL_izixM76SyX', { full: true }) 
// gets all videos from playlist (only available for playlist & ignores min/max options)

let playlist = await ytt.playlist('PLYqMopOHwQ8hm6tCpbJavL_izixM76SyX')
console.log(playlist.items.length) // 100
if(playlist.items.continuation) await playlist.items.more()
console.log(playlist.items.length) // 200

await ytt.query('duck noises', { filter: 'video', max: 5 })
// gets a maximum of 5 query results filtered by video

let search = await ytt.query('ducks making very weird noises', { min: 50 })
console.log(search.items.length) // 66
if(search.items.continuation) await search.items.more()
console.log(search.items.length) // 82
```

See [structure.js](src/lib/structure.js) for the object definitions.
