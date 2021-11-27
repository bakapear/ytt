let struct = require('../src/lib/structure')
let ytt = require('../')

let INVALID = [undefined, null, NaN, {}, []]
let NOMATCH = ['', 'toothpaste', 'cheeseknife', 'iiiiiiiiiii']

let TESTS = [
  {
    method: 'video',
    instance: struct.YoutubeVideo,
    valid: ['jNQXAC9IVRw', 'ytWz0qVvBZ0', '4D7u5KF7SP8', '--41OGPMurU', 'xiUhNx24iZs', 'dQw4w9WgXcQ', 'HOuc0kuKRV4']
  },
  {
    method: 'channel',
    instance: struct.YoutubeChannel,
    valid: ['UC4QobU6STFB0P71PMvOGN5A', 'UCH-_hzb2ILSCo9ftVSnrCIQ', 'UC_kRDKYrUlrbtrSiyu5Tflg', 'UCMMBGMjrrWcRZmG_lW4jC-Q', 'UCnGmBXByMLfahKc8KalRjew', 'UCuAXFkgsw1L7xaCfnd5JJOw', 'UCLUyroGnUO4uqLfA-r_qIHg']
  },
  {
    method: 'playlist',
    instance: struct.YoutubePlaylist,
    valid: ['PL0jp-uZ7a4g9FQWW5R_u0pz4yzV4RiOXu', 'PLNyF4u9mdcWp9u19YczK-aaQfsfj6QRWv', 'PLCEF5EEFA56A44606', 'PLmWYEDTNOGUL69D2wj9m2onBKV2s3uT5Y', 'PL6305F709EB481224', 'UUraDChjPs-r9FoNsmJufZZQ']
  },
  {
    method: 'search',
    instance: struct.YoutubeSearch,
    invalid: false,
    valid: ['duck', 'quack', 'meow', 'woof', 'cat']
  }
]

for (let test of TESTS) {
  describe(test.method, () => {
    describe('invalids', () => {
      it.each(INVALID)('%p', async value => {
        await expect(ytt[test.method](value)).rejects.toThrow('Invalid value')
      })
      if (test.invalid !== false) {
        it.each(NOMATCH)('%p', async value => {
          await expect(ytt[test.method](value)).rejects.toThrow('Invalid ' + test.method)
        })
      }
    })
    describe('valids', () => {
      it.each(test.valid)('%p', async value => {
        await expect(ytt[test.method](value)).resolves.toBeInstanceOf(test.instance)
      })
    })
  })
}
