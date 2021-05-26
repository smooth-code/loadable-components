const nodePath = require('path')
const fs = require('fs')
const makeDir = require('make-dir')

const name = '@loadable/webpack-plugin'

class LoadablePlugin {
  constructor({
    filename = 'loadable-stats.json',
    path,
    writeToDisk,
    outputAsset = true,
    chunkLoadingGlobal = '__LOADABLE_LOADED_CHUNKS__',
    stats,
  } = {}) {
    this.opts = {
      filename,
      writeToDisk,
      outputAsset,
      path,
      chunkLoadingGlobal,
      stats,
    }

    // The Webpack compiler instance
    this.compiler = null
  }

  handleEmit = compilation => {
    const stats = compilation.getStats().toJson(
      this.opts.stats || {
        all: false,
        assets: true,
        cachedAssets: true,
        chunks: false,
        chunkGroups: true,
        chunkGroupChildren: true,
        hash: true,
        ids: true,
        outputPath: true,
        publicPath: true,
      },
    )

    stats.generator = 'loadable-components'

    // we don't need all chunk information, only a type
    stats.chunks = [...compilation.chunks].map(chunk => {
      return {
        id: chunk.id,
        files: [...chunk.files],
      }
    })

    const result = JSON.stringify(stats, null, 2)

    if (this.opts.writeToDisk) {
      this.writeAssetsFile(result)
    }

    if (this.opts.outputAsset) {
      return {
        source() {
          return result
        },
        size() {
          return result.length
        },
      }
    }

    return null
  }

  /**
   * Write Assets Manifest file
   * @method writeAssetsFile
   */
  writeAssetsFile = manifest => {
    const outputFolder =
      this.opts.writeToDisk.filename || this.compiler.options.output.path

    const outputFile = nodePath.resolve(outputFolder, this.opts.filename)

    try {
      if (!fs.existsSync(outputFolder)) {
        makeDir.sync(outputFolder)
      }
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err
      }
    }

    fs.writeFileSync(outputFile, manifest)
  }

  apply(compiler) {
    this.compiler = compiler

    const version = 'jsonpFunction' in compiler.options.output ? 4 : 5

    // Add a custom chunk loading callback
    if (version === 4) {
      compiler.options.output.jsonpFunction = this.opts.chunkLoadingGlobal
    } else {
      compiler.options.output.chunkLoadingGlobal = this.opts.chunkLoadingGlobal
    }

    if (this.opts.outputAsset || this.opts.writeToDisk) {
      if (version === 4) {
        // webpack 4
        compiler.hooks.emit.tap(name, compilation => {
          const asset = this.handleEmit(compilation)
          if (asset) {
            compilation.assets[this.opts.filename] = asset
          }
        })
      } else {
        // webpack 5
        compiler.hooks.make.tap(name, compilation => {
          compilation.hooks.processAssets.tap(
            {
              name,
              stage:
                compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
            },
            () => {
              const asset = this.handleEmit(compilation)
              if (asset) {
                compilation.emitAsset(this.opts.filename, asset)
              }
            },
          )
        })
      }
    }
  }
}

module.exports = LoadablePlugin
module.exports.default = LoadablePlugin
