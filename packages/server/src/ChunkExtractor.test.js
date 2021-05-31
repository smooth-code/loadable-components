/* eslint-disable import/no-extraneous-dependencies */
import 'regenerator-runtime/runtime'
import path from 'path'
import stats from '../__fixtures__/stats.json'
import ChunkExtractor from './ChunkExtractor'

const targetPath = path.resolve(
  __dirname,
  '../../../examples/server-side-rendering/public/dist/node',
)

describe('ChunkExtrator', () => {
  let extractor

  beforeEach(() => {
    extractor = new ChunkExtractor({
      stats,
      outputPath: targetPath,
    })
  })

  describe('#resolvePublicUrl', () => {
    it('should default to using stats.publicPath', () => {
      expect(extractor.resolvePublicUrl('main.js')).toEqual(
        '/dist/node/main.js',
      )
    })

    it('should use publicPath from ChunkExtractor options', () => {
      const testExtractor = new ChunkExtractor({
        stats,
        publicPath: 'https://cdn.example.org/v1.1.0/',
        outputPath: path.resolve(__dirname, '../__fixtures__'),
      })

      expect(testExtractor.resolvePublicUrl('main.js')).toEqual(
        'https://cdn.example.org/v1.1.0/main.js',
      )
    })
  })

  describe('#stats', () => {
    it('should load stats from file', () => {
      extractor = new ChunkExtractor({
        statsFile: path.resolve(__dirname, '../__fixtures__/stats.json'),
      })

      expect(extractor.stats).toBe(stats)
    })
  })

  describe('#addChunk', () => {
    it('should reference chunk', () => {
      extractor.addChunk('foo')
      expect(extractor.chunks).toEqual(['foo'])
    })

    it('should be uniq', () => {
      extractor.addChunk('a')
      extractor.addChunk('b')
      extractor.addChunk('b')
      expect(extractor.chunks).toEqual(['a', 'b'])
    })
  })

  describe('#getScriptTags', () => {
    it('should return main script tag without chunk', () => {
      expect(extractor.getScriptTags()).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\"></script>"
      `)
    })

    it('should return main script tag without chunk with namespaced required chunks id', () => {
      const testExtractor = new ChunkExtractor({
        namespace: 'testapp',
        stats,
        outputPath: path.resolve(__dirname, '../__fixtures__'),
      })
      expect(testExtractor.getScriptTags()).toMatchInlineSnapshot(`
        "<script id=\\"testapp__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[]</script><script id=\\"testapp__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\"></script>"
      `)
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getScriptTags()).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[\\"letters-A\\"]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[\\"letters-A\\"]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\"></script>
        <script async data-chunk=\\"letters-A\\" src=\\"/dist/node/letters-A.js\\"></script>"
      `)
    })

    // no longer matching anything
    it.skip('should allow for query params in chunk names', () => {
      extractor.addChunk('letters-E')
      expect(extractor.getScriptTags()).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[4]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[\\"letters-E\\"]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\"></script>
        <script async data-chunk=\\"letters-E\\" src=\\"/dist/node/letters-E.js\\"></script>"
      `)
    })

    it('should add extra props if specified - object argument', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getScriptTags({ nonce: 'testnonce' }))
        .toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\" nonce=\\"testnonce\\">[\\"letters-A\\"]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\" nonce=\\"testnonce\\">{\\"namedChunks\\":[\\"letters-A\\"]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\" nonce=\\"testnonce\\"></script>
        <script async data-chunk=\\"letters-A\\" src=\\"/dist/node/letters-A.js\\" nonce=\\"testnonce\\"></script>"
      `)
    })

    it('should add extra props if specified - function argument', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getScriptTags(asset => {
          return { nonce: asset ? asset.chunk : 'anonymous' }
        }),
      ).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\" nonce=\\"anonymous\\">[\\"letters-A\\"]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\" nonce=\\"anonymous\\">{\\"namedChunks\\":[\\"letters-A\\"]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\" nonce=\\"main\\"></script>
        <script async data-chunk=\\"letters-A\\" src=\\"/dist/node/letters-A.js\\" nonce=\\"letters-A\\"></script>"
      `)
    })
  })

  describe('#getScriptTagsByChunks', () => {
    it('should return main script tag without chunk', () => {
      expect(extractor.getScriptTagsByChunks()).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\"></script>"
      `)
    })

    it('should return main script tag without chunk with namespaced required chunks id', () => {
      const testExtractor = new ChunkExtractor({
        namespace: 'testapp',
        stats,
        outputPath: path.resolve(__dirname, '../__fixtures__'),
      })
      expect(testExtractor.getScriptTagsByChunks()).toMatchInlineSnapshot(`
        "<script id=\\"testapp__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[]</script><script id=\\"testapp__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\"></script>"
      `)
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getScriptTagsByChunks()).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[\\"letters-A\\"]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[\\"letters-A\\"]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\"></script>
        <script async data-chunk=\\"letters-A\\" src=\\"/dist/node/letters-A.js\\"></script>"
      `)
    })

    it('should return only the specified chunks', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getScriptTagsByChunks({ includedChunks: 'letters-A' }))
        .toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\">[\\"letters-A\\"]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\">{\\"namedChunks\\":[\\"letters-A\\"]}</script>
        <script async data-chunk=\\"letters-A\\" src=\\"/dist/node/letters-A.js\\"></script>"
      `)
    })

    it('should add extra props if specified - object argument', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getScriptTagsByChunks({ extraProps: { nonce: 'testnonce' } }),
      ).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\" nonce=\\"testnonce\\">[\\"letters-A\\"]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\" nonce=\\"testnonce\\">{\\"namedChunks\\":[\\"letters-A\\"]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\" nonce=\\"testnonce\\"></script>
        <script async data-chunk=\\"letters-A\\" src=\\"/dist/node/letters-A.js\\" nonce=\\"testnonce\\"></script>"
      `)
    })

    it('should add extra props if specified - function argument', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getScriptTagsByChunks({
          extraProps: asset => {
            return { nonce: asset ? asset.chunk : 'anonymous' }
          },
        }),
      ).toMatchInlineSnapshot(`
        "<script id=\\"__LOADABLE_REQUIRED_CHUNKS__\\" type=\\"application/json\\" nonce=\\"anonymous\\">[\\"letters-A\\"]</script><script id=\\"__LOADABLE_REQUIRED_CHUNKS___ext\\" type=\\"application/json\\" nonce=\\"anonymous\\">{\\"namedChunks\\":[\\"letters-A\\"]}</script>
        <script async data-chunk=\\"main\\" src=\\"/dist/node/main.js\\" nonce=\\"main\\"></script>
        <script async data-chunk=\\"letters-A\\" src=\\"/dist/node/letters-A.js\\" nonce=\\"letters-A\\"></script>"
      `)
    })
  })

  describe('#getScriptElements', () => {
    it('should return main script tag without chunk with namespaced id for loadable chunks', () => {
      const testExtractor = new ChunkExtractor({
        namespace: 'testapp',
        stats,
        outputPath: path.resolve(__dirname, '../__fixtures__'),
      })
      expect(testExtractor.getScriptElements()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[]",
              }
            }
            id="testapp__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[]}",
              }
            }
            id="testapp__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
        ]
      `)
    })

    it('should return main script tag without chunk', () => {
      expect(extractor.getScriptElements()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
        ]
      `)
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getScriptElements()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-A\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-A\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-A"
            src="/dist/node/letters-A.js"
          />,
        ]
      `)
    })

    // params not working
    it.skip('should allow for query params in chunk names', () => {
      extractor.addChunk('letters-E')
      expect(extractor.getScriptElements()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-E\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-E\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-E"
            src="/dist/node/letters-E.js?param"
          />,
        ]
      `)
    })

    it('should add extra props if specified - object argument', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getScriptElements({ nonce: 'testnonce' }))
        .toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-A\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            nonce="testnonce"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-A\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            nonce="testnonce"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            nonce="testnonce"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-A"
            nonce="testnonce"
            src="/dist/node/letters-A.js"
          />,
        ]
      `)
    })

    it('should add extra props if specified - function argument', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getScriptElements(asset => {
          return { nonce: asset ? asset.chunk : 'anonymous' }
        }),
      ).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-A\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            nonce="anonymous"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-A\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            nonce="anonymous"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            nonce="main"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-A"
            nonce="letters-A"
            src="/dist/node/letters-A.js"
          />,
        ]
      `)
    })

    it('should use publicPath from options', () => {
      const testExtractor = new ChunkExtractor({
        stats,
        publicPath: 'https://cdn.example.org/v1.1.0/',
        outputPath: path.resolve(__dirname, '../__fixtures__'),
      })

      expect(testExtractor.getScriptElements()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="https://cdn.example.org/v1.1.0/main.js"
          />,
        ]
      `)
    })
  })

  describe('#getScriptElementsByChunks', () => {
    it('should return main script tag without chunk with namespaced id for loadable chunks', () => {
      const testExtractor = new ChunkExtractor({
        namespace: 'testapp',
        stats,
        outputPath: path.resolve(__dirname, '../__fixtures__'),
      })
      expect(testExtractor.getScriptElementsByChunks()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[]",
              }
            }
            id="testapp__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[]}",
              }
            }
            id="testapp__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
        ]
      `)
    })

    it('should return main script tag without chunk', () => {
      expect(extractor.getScriptElementsByChunks()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
        ]
      `)
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getScriptElementsByChunks()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-A\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-A\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-A"
            src="/dist/node/letters-A.js"
          />,
        ]
      `)
    })

    it('should return the specified chunks', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getScriptElementsByChunks({ includedChunks: 'letters-A' }),
      ).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-A\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-A\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="letters-A"
            src="/dist/node/letters-A.js"
          />,
        ]
      `)
    })

    // params not working
    it.skip('should allow for query params in chunk names', () => {
      extractor.addChunk('letters-E')
      expect(extractor.getScriptElementsByChunks()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-E\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-E\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-E"
            src="/dist/node/letters-E.js?param"
          />,
        ]
      `)
    })

    it('should add extra props if specified - object argument', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getScriptElementsByChunks({
          extraProps: { nonce: 'testnonce' },
        }),
      ).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-A\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            nonce="testnonce"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-A\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            nonce="testnonce"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            nonce="testnonce"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-A"
            nonce="testnonce"
            src="/dist/node/letters-A.js"
          />,
        ]
      `)
    })

    it('should add extra props if specified - function argument', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getScriptElementsByChunks({
          extraProps: asset => {
            return { nonce: asset ? asset.chunk : 'anonymous' }
          },
        }),
      ).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[\\"letters-A\\"]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            nonce="anonymous"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[\\"letters-A\\"]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            nonce="anonymous"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            nonce="main"
            src="/dist/node/main.js"
          />,
          <script
            async={true}
            data-chunk="letters-A"
            nonce="letters-A"
            src="/dist/node/letters-A.js"
          />,
        ]
      `)
    })

    it('should use publicPath from options', () => {
      const testExtractor = new ChunkExtractor({
        stats,
        publicPath: 'https://cdn.example.org/v1.1.0/',
        outputPath: path.resolve(__dirname, '../__fixtures__'),
      })

      expect(testExtractor.getScriptElementsByChunks()).toMatchInlineSnapshot(`
        Array [
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "[]",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS__"
            type="application/json"
          />,
          <script
            dangerouslySetInnerHTML={
              Object {
                "__html": "{\\"namedChunks\\":[]}",
              }
            }
            id="__LOADABLE_REQUIRED_CHUNKS___ext"
            type="application/json"
          />,
          <script
            async={true}
            data-chunk="main"
            src="https://cdn.example.org/v1.1.0/main.js"
          />,
        ]
      `)
    })
  })

  describe('#getStyleTags', () => {
    it('should return main style tag without chunk', () => {
      expect(extractor.getStyleTags()).toMatchInlineSnapshot(
        `"<link data-chunk=\\"main\\" rel=\\"stylesheet\\" href=\\"/dist/node/main.css\\">"`,
      )
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getStyleTags()).toMatchInlineSnapshot(`
                "<link data-chunk=\\"main\\" rel=\\"stylesheet\\" href=\\"/dist/node/main.css\\">
                <link data-chunk=\\"letters-A\\" rel=\\"stylesheet\\" href=\\"/dist/node/letters-A.css\\">"
            `)
    })

    it.skip('should allow for query params in chunk names', () => {
      extractor.addChunk('letters-E')
      expect(extractor.getStyleTags()).toMatchInlineSnapshot(`
                "<link data-chunk=\\"main\\" rel=\\"stylesheet\\" href=\\"/dist/node/main.css\\">
                <link data-chunk=\\"letters-E\\" rel=\\"stylesheet\\" href=\\"/dist/node/letters-E.css?param\\">"
            `)
    })

    it('should add extraProps if specified - object argument', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getStyleTags({ nonce: 'testnonce' }))
        .toMatchInlineSnapshot(`
                "<link data-chunk=\\"main\\" rel=\\"stylesheet\\" href=\\"/dist/node/main.css\\" nonce=\\"testnonce\\">
                <link data-chunk=\\"letters-A\\" rel=\\"stylesheet\\" href=\\"/dist/node/letters-A.css\\" nonce=\\"testnonce\\">"
            `)
    })

    it('should add extraProps if specified - function argument', () => {
      extractor.addChunk('letters-A')
      expect(
        extractor.getStyleTags(asset => ({
          nonce: asset ? asset.chunk : 'anonymous',
        })),
      ).toMatchInlineSnapshot(`
                "<link data-chunk=\\"main\\" rel=\\"stylesheet\\" href=\\"/dist/node/main.css\\" nonce=\\"main\\">
                <link data-chunk=\\"letters-A\\" rel=\\"stylesheet\\" href=\\"/dist/node/letters-A.css\\" nonce=\\"letters-A\\">"
            `)
    })
  })

  describe('#getInlineStyleTags', () => {
    it('should return inline style tags as a promise', async () => {
      extractor.addChunk('letters-A')
      const data = await extractor.getInlineStyleTags()
      expect(data).toMatchInlineSnapshot(`
        "<style type=\\"text/css\\" data-chunk=\\"main\\">
        /* Main CSS */
        h1 {
            color: cyan;
        }

        </style>
        <style type=\\"text/css\\" data-chunk=\\"letters-A\\">
        /* A CSS */
        body {
            background: pink;
        }

        </style>"
      `)
    })

    it('should add extraProps if specified - object argument', async () => {
      extractor.addChunk('letters-A')
      const data = await extractor.getInlineStyleTags({ nonce: 'testnonce' })
      expect(data).toMatchInlineSnapshot(`
        "<style type=\\"text/css\\" data-chunk=\\"main\\" nonce=\\"testnonce\\">
        /* Main CSS */
        h1 {
            color: cyan;
        }

        </style>
        <style type=\\"text/css\\" data-chunk=\\"letters-A\\" nonce=\\"testnonce\\">
        /* A CSS */
        body {
            background: pink;
        }

        </style>"
      `)
    })

    it('should add extraProps if specified - function argument', async () => {
      extractor.addChunk('letters-A')
      const data = await extractor.getInlineStyleTags(asset => ({
        nonce: asset.chunk,
      }))
      expect(data).toMatchInlineSnapshot(`
        "<style type=\\"text/css\\" data-chunk=\\"main\\" nonce=\\"main\\">
        /* Main CSS */
        h1 {
            color: cyan;
        }

        </style>
        <style type=\\"text/css\\" data-chunk=\\"letters-A\\" nonce=\\"letters-A\\">
        /* A CSS */
        body {
            background: pink;
        }

        </style>"
      `)
    })
  })

  describe('#getStyleElements', () => {
    it('should return main style tag without chunk', () => {
      expect(extractor.getStyleElements()).toMatchInlineSnapshot(`
                Array [
                  <link
                    data-chunk="main"
                    href="/dist/node/main.css"
                    rel="stylesheet"
                  />,
                ]
            `)
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getStyleElements()).toMatchInlineSnapshot(`
                Array [
                  <link
                    data-chunk="main"
                    href="/dist/node/main.css"
                    rel="stylesheet"
                  />,
                  <link
                    data-chunk="letters-A"
                    href="/dist/node/letters-A.css"
                    rel="stylesheet"
                  />,
                ]
            `)
    })

    it.skip('should allow for query params in chunk names', () => {
      extractor.addChunk('letters-E')
      expect(extractor.getStyleElements()).toMatchInlineSnapshot(`
                Array [
                  <link
                    data-chunk="main"
                    href="/dist/node/main.css"
                    rel="stylesheet"
                  />,
                  <link
                    data-chunk="letters-E"
                    href="/dist/node/letters-E.css?param"
                    rel="stylesheet"
                  />,
                ]
            `)
    })

    it('should add extraProps if specified - object argument', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getStyleElements({ nonce: 'testnonce' }))
        .toMatchInlineSnapshot(`
                Array [
                  <link
                    data-chunk="main"
                    href="/dist/node/main.css"
                    nonce="testnonce"
                    rel="stylesheet"
                  />,
                  <link
                    data-chunk="letters-A"
                    href="/dist/node/letters-A.css"
                    nonce="testnonce"
                    rel="stylesheet"
                  />,
                ]
            `)
    })

    it('should add extraProps if specified - function argument', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getStyleElements(asset => ({ nonce: asset.chunk })))
        .toMatchInlineSnapshot(`
                Array [
                  <link
                    data-chunk="main"
                    href="/dist/node/main.css"
                    nonce="main"
                    rel="stylesheet"
                  />,
                  <link
                    data-chunk="letters-A"
                    href="/dist/node/letters-A.css"
                    nonce="letters-A"
                    rel="stylesheet"
                  />,
                ]
            `)
    })
  })

  describe('#getInlineStyleElements', () => {
    it('should return inline style elements as a promise', async () => {
      extractor.addChunk('letters-A')
      const data = await extractor.getInlineStyleElements()
      expect(data).toMatchInlineSnapshot(`
        Array [
          <style
            dangerouslySetInnerHTML={
              Object {
                "__html": "/* Main CSS */
        h1 {
            color: cyan;
        }
        ",
              }
            }
            data-chunk="main"
          />,
          <style
            dangerouslySetInnerHTML={
              Object {
                "__html": "/* A CSS */
        body {
            background: pink;
        }
        ",
              }
            }
            data-chunk="letters-A"
          />,
        ]
      `)
    })
  })

  describe('#getCssString', () => {
    it('should return a string of the referenced css files as a promise', async () => {
      extractor.addChunk('letters-A')
      const data = await extractor.getCssString()
      expect(data).toMatchInlineSnapshot(`
        "/* Main CSS */
        h1 {
            color: cyan;
        }

        /* A CSS */
        body {
            background: pink;
        }
        "
      `)
    })

    it('should work with custom fs', async () => {
      extractor.inputFileSystem = {
        readFile: jest.fn((file, encoding, callback) =>
          callback(null, 'foo\n'),
        ),
      }
      extractor.addChunk('letters-A')
      const data = await extractor.getCssString()
      expect(extractor.inputFileSystem.readFile).toHaveBeenCalledTimes(2)
      expect(data).toMatchInlineSnapshot(`
        "foo

        foo
        "
      `)
    })
  })

  describe('#getLinkTags', () => {
    it('should return main script tag without chunk', () => {
      expect(extractor.getLinkTags()).toMatchInlineSnapshot(`
                "<link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/main.css\\">
                <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/main.js\\">
                <link data-parent-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-C.js\\">
                <link data-parent-chunk=\\"main\\" rel=\\"prefetch\\" as=\\"script\\" href=\\"/dist/node/letters-D.js\\">"
            `)
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getLinkTags()).toMatchInlineSnapshot(`
        "<link data-chunk=\\"letters-A\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/letters-A.css\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/main.css\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/main.js\\">
        <link data-chunk=\\"letters-A\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-A.js\\">
        <link data-parent-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-C.js\\">
        <link data-parent-chunk=\\"main\\" rel=\\"prefetch\\" as=\\"script\\" href=\\"/dist/node/letters-D.js\\">"
      `)
    })

    it.skip('should allow for query params in chunk names', () => {
      extractor.addChunk('letters-E')
      expect(extractor.getLinkTags()).toMatchInlineSnapshot(`
        "<link data-chunk=\\"letters-E\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/letters-E.css?param\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/main.css\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/main.js\\">
        <link data-chunk=\\"letters-E\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-E.js?param\\">
        <link data-parent-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-C.js\\">
        <link data-parent-chunk=\\"main\\" rel=\\"prefetch\\" as=\\"script\\" href=\\"/dist/node/letters-D.js\\">"
      `)
    })

    it('should add extraProps if specified - object argument', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getLinkTags({ nonce: 'testnonce' }))
        .toMatchInlineSnapshot(`
        "<link data-chunk=\\"letters-A\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/letters-A.css\\" nonce=\\"testnonce\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/main.css\\" nonce=\\"testnonce\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/main.js\\" nonce=\\"testnonce\\">
        <link data-chunk=\\"letters-A\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-A.js\\" nonce=\\"testnonce\\">
        <link data-parent-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-C.js\\" nonce=\\"testnonce\\">
        <link data-parent-chunk=\\"main\\" rel=\\"prefetch\\" as=\\"script\\" href=\\"/dist/node/letters-D.js\\" nonce=\\"testnonce\\">"
      `)
    })

    it('should add extraProps if specified - function argument', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getLinkTags(asset => ({ nonce: asset.chunk })))
        .toMatchInlineSnapshot(`
        "<link data-chunk=\\"letters-A\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/letters-A.css\\" nonce=\\"letters-A\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"style\\" href=\\"/dist/node/main.css\\" nonce=\\"main\\">
        <link data-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/main.js\\" nonce=\\"main\\">
        <link data-chunk=\\"letters-A\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-A.js\\" nonce=\\"letters-A\\">
        <link data-parent-chunk=\\"main\\" rel=\\"preload\\" as=\\"script\\" href=\\"/dist/node/letters-C.js\\" nonce=\\"main\\">
        <link data-parent-chunk=\\"main\\" rel=\\"prefetch\\" as=\\"script\\" href=\\"/dist/node/letters-D.js\\" nonce=\\"main\\">"
      `)
    })
  })

  describe('#getLinkElements', () => {
    it('should return main script tag without chunk', () => {
      expect(extractor.getLinkElements()).toMatchInlineSnapshot(`
                Array [
                  <link
                    as="style"
                    data-chunk="main"
                    href="/dist/node/main.css"
                    rel="preload"
                  />,
                  <link
                    as="script"
                    data-chunk="main"
                    href="/dist/node/main.js"
                    rel="preload"
                  />,
                  <link
                    as="script"
                    data-parent-chunk="main"
                    href="/dist/node/letters-C.js"
                    rel="preload"
                  />,
                  <link
                    as="script"
                    data-parent-chunk="main"
                    href="/dist/node/letters-D.js"
                    rel="prefetch"
                  />,
                ]
            `)
    })

    it('should return other chunks if referenced', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getLinkElements()).toMatchInlineSnapshot(`
        Array [
          <link
            as="style"
            data-chunk="letters-A"
            href="/dist/node/letters-A.css"
            rel="preload"
          />,
          <link
            as="style"
            data-chunk="main"
            href="/dist/node/main.css"
            rel="preload"
          />,
          <link
            as="script"
            data-chunk="main"
            href="/dist/node/main.js"
            rel="preload"
          />,
          <link
            as="script"
            data-chunk="letters-A"
            href="/dist/node/letters-A.js"
            rel="preload"
          />,
          <link
            as="script"
            data-parent-chunk="main"
            href="/dist/node/letters-C.js"
            rel="preload"
          />,
          <link
            as="script"
            data-parent-chunk="main"
            href="/dist/node/letters-D.js"
            rel="prefetch"
          />,
        ]
      `)
    })

    it.skip('should allow for query params in chunk names', () => {
      extractor.addChunk('letters-E')
      expect(extractor.getLinkElements()).toMatchInlineSnapshot(`
        Array [
          <link
            as="style"
            data-chunk="letters-E"
            href="/dist/node/letters-E.css?param"
            rel="preload"
          />,
          <link
            as="style"
            data-chunk="main"
            href="/dist/node/main.css"
            rel="preload"
          />,
          <link
            as="script"
            data-chunk="main"
            href="/dist/node/main.js"
            rel="preload"
          />,
          <link
            as="script"
            data-chunk="letters-E"
            href="/dist/node/letters-E.js?param"
            rel="preload"
          />,
          <link
            as="script"
            data-parent-chunk="main"
            href="/dist/node/letters-C.js"
            rel="preload"
          />,
          <link
            as="script"
            data-parent-chunk="main"
            href="/dist/node/letters-D.js"
            rel="prefetch"
          />,
        ]
      `)
    })

    it('should add extraProps if specified', () => {
      extractor.addChunk('letters-A')
      expect(extractor.getLinkElements({ nonce: 'testnonce' }))
        .toMatchInlineSnapshot(`
        Array [
          <link
            as="style"
            data-chunk="letters-A"
            href="/dist/node/letters-A.css"
            nonce="testnonce"
            rel="preload"
          />,
          <link
            as="style"
            data-chunk="main"
            href="/dist/node/main.css"
            nonce="testnonce"
            rel="preload"
          />,
          <link
            as="script"
            data-chunk="main"
            href="/dist/node/main.js"
            nonce="testnonce"
            rel="preload"
          />,
          <link
            as="script"
            data-chunk="letters-A"
            href="/dist/node/letters-A.js"
            nonce="testnonce"
            rel="preload"
          />,
          <link
            as="script"
            data-parent-chunk="main"
            href="/dist/node/letters-C.js"
            nonce="testnonce"
            rel="preload"
          />,
          <link
            as="script"
            data-parent-chunk="main"
            href="/dist/node/letters-D.js"
            nonce="testnonce"
            rel="prefetch"
          />,
        ]
      `)
    })
  })

  describe('#requireEntryPoint', () => {
    it('should load the first entrypoint', () => {
      const x = extractor.requireEntrypoint()
      expect(x.hello).toBe('hello')
    })
  })
})
