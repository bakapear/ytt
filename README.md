# YouTubeTools

This package provides youtube functions without needing an API key for any of them. Useful for things!

### How to use
```js
ytt.format('https://www.youtube.com/watch?v=wOLiEu7275E') // gets id from video or playlist (sync)
ytt.valid('blablablala') // checks if video or playlist is accessable
ytt.query('duck do quack') // gets basic video/playlist/channel info of query
ytt.query('duck do quack', { filter: 'video' }) // above but finds videos only
ytt.query('duck do quack', { filter: 'channel' }) // above but finds videos only
ytt.query('duck do quack', { filter: 'playlist' }) // above but finds playlists only
ytt.query('duck do quack', { num: 35 }) // gets basic video/channel/playlist info of query, searching max 35 items (default is first page only ~20)
ytt.video('wOLiEu7275E') // get basic video info
ytt.video('wOLiEu7275E', 'bzuYs7YFtH4') // above but multiple in array (up to 50)
ytt.video(['wOLiEu7275E']) // creates playlist and gets basic video info
ytt.video(['wOLiEu7275E', 'bzuYs7YFtH4']) // above but mutliple videos in playlist (up to 50)
ytt.playlist('PLCxjFBEyIgt1FmIYPZrodi19Vv_Z8K9LJ') // get playlist info with all videos
ytt.playlist('PLCxjFBEyIgt1FmIYPZrodi19Vv_Z8K9LJ', true) // get playlist info with max 100 videos (faster)
ytt.download('wOLiEu7275E') // get full video info (deciphered stream urls in all formats)
```