/* eslint-disable react/no-danger */
import path from 'path'
import fs from 'fs'
import uniq from 'lodash/uniq'
import uniqBy from 'lodash/uniqBy'
import flatMap from 'lodash/flatMap'
import React from 'react'
import { invariant, getRequiredChunkKey } from './sharedInternals'
import ChunkExtractorManager from './ChunkExtractorManager'
import { smartRequire, joinURLPath } from './util'

const EXTENSION_SCRIPT_TYPES = {
  '.js': 'script',
  '.mjs': 'script',
  '.css': 'style',
}

function extensionToScriptType(extension) {
  return EXTENSION_SCRIPT_TYPES[extension] || null
}

/**
 * some files can be references with extra query arguments which have to be removed
 * @param name
 * @returns {*}
 */
function cleanFileName(name) {
  return name.split('?')[0]
}

function getFileScriptType(fileName) {
  return extensionToScriptType(
    cleanFileName(path.extname(fileName)).toLowerCase(),
  )
}

function isScriptFile(fileName) {
  return getFileScriptType(fileName) === 'script'
}

function getAssets(chunks, getAsset) {
  return uniqBy(
    flatMap(chunks, chunk => getAsset(chunk)),
    'url',
  )
}

function handleExtraProps(asset, extraProps) {
  return typeof extraProps === 'function' ? extraProps(asset) : extraProps
}

function extraPropsToString(asset, extraProps) {
  return Object.entries(handleExtraProps(asset, extraProps)).reduce(
    (acc, [key, value]) => `${acc} ${key}="${value}"`,
    '',
  )
}

function getSriHtmlAttributes(asset) {
  if (!asset.integrity) {
    return ''
  }
  return ` integrity="${asset.integrity}"`
}

function assetToScriptTag(asset, extraProps) {
  return `<script async data-chunk="${asset.chunk}" src="${
    asset.url
  }"${getSriHtmlAttributes(asset)}${extraPropsToString(
    asset,
    extraProps,
  )}></script>`
}

function assetToScriptElement(asset, extraProps) {
  return (
    <script
      key={asset.url}
      async
      data-chunk={asset.chunk}
      src={asset.url}
      {...handleExtraProps(asset, extraProps)}
    />
  )
}

function assetToStyleString(asset, { inputFileSystem }) {
  return new Promise((resolve, reject) => {
    inputFileSystem.readFile(asset.path, 'utf8', (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(data)
    })
  })
}

function assetToStyleTag(asset, extraProps) {
  return `<link data-chunk="${asset.chunk}" rel="stylesheet" href="${
    asset.url
  }"${getSriHtmlAttributes(asset)}${extraPropsToString(asset, extraProps)}>`
}

function assetToStyleTagInline(asset, extraProps, { inputFileSystem }) {
  return new Promise((resolve, reject) => {
    inputFileSystem.readFile(asset.path, 'utf8', (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(
        `<style type="text/css" data-chunk="${asset.chunk}"${extraPropsToString(
          asset,
          extraProps,
        )}>
${data}
</style>`,
      )
    })
  })
}

function assetToStyleElement(asset, extraProps) {
  return (
    <link
      key={asset.url}
      data-chunk={asset.chunk}
      rel="stylesheet"
      href={asset.url}
      {...handleExtraProps(asset, extraProps)}
    />
  )
}

function assetToStyleElementInline(asset, extraProps, { inputFileSystem }) {
  return new Promise((resolve, reject) => {
    inputFileSystem.readFile(asset.path, 'utf8', (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(
        <style
          key={asset.url}
          data-chunk={asset.chunk}
          dangerouslySetInnerHTML={{ __html: data }}
          {...handleExtraProps(asset, extraProps)}
        />,
      )
    })
  })
}

const LINK_ASSET_HINTS = {
  mainAsset: 'data-chunk',
  childAsset: 'data-parent-chunk',
}

function assetToLinkTag(asset, extraProps) {
  const hint = LINK_ASSET_HINTS[asset.type]
  return `<link ${hint}="${asset.chunk}" rel="${asset.linkType}" as="${
    asset.scriptType
  }" href="${asset.url}"${getSriHtmlAttributes(asset)}${extraPropsToString(
    asset,
    extraProps,
  )}>`
}

function assetToLinkElement(asset, extraProps) {
  const hint = LINK_ASSET_HINTS[asset.type]
  const props = {
    key: asset.url,
    [hint]: asset.chunk,
    rel: asset.linkType,
    as: asset.scriptType,
    href: asset.url,
    ...handleExtraProps(asset, extraProps),
  }
  return <link {...props} />
}

function joinTags(tags) {
  return tags.join('\n')
}

const HOT_UPDATE_REGEXP = /\.hot-update\.js$/

function isValidChunkAsset(chunkAsset) {
  return chunkAsset.scriptType && !HOT_UPDATE_REGEXP.test(chunkAsset.filename)
}

function checkIfChunkIncludesJs(chunkInfo) {
  return chunkInfo.files.some(file => isScriptFile(file))
}

class ChunkExtractor {
  constructor({
    statsFile,
    stats,
    entrypoints = ['main'],
    namespace = '',
    outputPath,
    publicPath,
    inputFileSystem = fs,
  } = {}) {
    this.namespace = namespace
    this.stats = stats || smartRequire(statsFile)
    this.publicPath = publicPath || this.stats.publicPath
    this.outputPath = outputPath || this.stats.outputPath
    this.statsFile = statsFile
    this.entrypoints = Array.isArray(entrypoints) ? entrypoints : [entrypoints]
    this.chunks = []
    this.inputFileSystem = inputFileSystem
  }

  resolvePublicUrl(filename) {
    return joinURLPath(this.publicPath, filename)
  }

  getChunkGroup(chunk) {
    const chunkGroup = this.stats.namedChunkGroups[chunk]
    invariant(chunkGroup, `cannot find ${chunk} in stats`)
    return chunkGroup
  }

  getChunkInfo(chunkId) {
    const chunkInfo = this.stats.chunks.find(chunk => chunk.id === chunkId)
    invariant(chunkInfo, `cannot find chunk (chunkId: ${chunkId}) in stats`)
    return chunkInfo
  }

  createChunkAsset({ filename, chunk, type, linkType }) {
    const resolvedFilename =
      typeof filename === 'object' && filename.name ? filename.name : filename

    return {
      filename: resolvedFilename,
      scriptType: getFileScriptType(resolvedFilename),
      chunk,
      url: this.resolvePublicUrl(resolvedFilename),
      path: path.join(this.outputPath, resolvedFilename),
      type,
      linkType,
    }
  }

  getChunkAssets(chunks) {
    const one = chunk => {
      const chunkGroup = this.getChunkGroup(chunk)
      return chunkGroup.assets
        .map(filename =>
          this.createChunkAsset({
            filename,
            chunk,
            type: 'mainAsset',
            linkType: 'preload',
          }),
        )
        .filter(isValidChunkAsset)
    }

    if (Array.isArray(chunks)) {
      return getAssets(chunks, one)
    }

    return one(chunks)
  }

  getChunkAssetsByType(scriptType, chunks) {
    const assets = this.getChunkAssets(chunks)
    if (scriptType) {
      return assets.filter(asset => asset.scriptType === scriptType)
    }
    return assets
  }

  getChunkChildAssets(chunks, type) {
    const one = chunk => {
      const chunkGroup = this.getChunkGroup(chunk)
      const assets = chunkGroup.childAssets[type] || []
      return assets
        .map(filename =>
          this.createChunkAsset({
            filename,
            chunk,
            type: 'childAsset',
            linkType: type,
          }),
        )
        .filter(isValidChunkAsset)
    }

    if (Array.isArray(chunks)) {
      return getAssets(chunks, one)
    }

    return one(chunks)
  }

  getChunkDependencies(chunks) {
    const one = chunk => {
      const chunkGroup = this.getChunkGroup(chunk)

      // ignore chunk that only contains css files.
      return chunkGroup.chunks.filter(chunkId => {
        const chunkInfo = this.getChunkInfo(chunkId)

        if (!chunkInfo) {
          return false
        }

        return checkIfChunkIncludesJs(chunkInfo)
      })
    }

    if (Array.isArray(chunks)) {
      return uniq(flatMap(chunks, one))
    }

    return one(chunks)
  }

  getRequiredChunksScriptContent() {
    return JSON.stringify(this.getChunkDependencies(this.chunks))
  }

  getRequiredChunksNamesScriptContent() {
    return JSON.stringify({
      namedChunks: this.chunks,
    })
  }

  getRequiredChunksScriptTag(extraProps) {
    const id = getRequiredChunkKey(this.namespace)
    const props = `type="application/json"${extraPropsToString(
      null,
      extraProps,
    )}`
    return [
      `<script id="${id}" ${props}>${this.getRequiredChunksScriptContent()}</script>`,
      `<script id="${id}_ext" ${props}>${this.getRequiredChunksNamesScriptContent()}</script>`,
    ].join('')
  }

  getRequiredChunksScriptElements(extraProps) {
    const id = getRequiredChunkKey(this.namespace)
    const props = {
      type: 'application/json',
      ...handleExtraProps(null, extraProps),
    }
    return [
      <script
        id={id}
        key={id}
        dangerouslySetInnerHTML={{
          __html: this.getRequiredChunksScriptContent(),
        }}
        {...props}
      />,
      <script
        id={`${id}_ext`}
        key={`${id}_ext`}
        dangerouslySetInnerHTML={{
          __html: this.getRequiredChunksNamesScriptContent(),
        }}
        {...props}
      />,
    ]
  }

  getFilteredChunks(includedChunks) {
    let chunks = [...this.entrypoints, ...this.chunks]
    if (includedChunks && includedChunks.length > 0) {
      chunks = chunks.filter(chunk => includedChunks.includes(chunk))
    }
    return chunks
  }

  getRequiredAndAssetsScriptTags(assets, extraProps) {
    const requiredScriptTag = this.getRequiredChunksScriptTag(extraProps)
    const assetsScriptTags = assets.map(asset =>
      assetToScriptTag(asset, extraProps),
    )
    return joinTags([requiredScriptTag, ...assetsScriptTags])
  }

  getRequiredAndAssetsScriptElements(assets, extraProps) {
    const requiredScriptElements = this.getRequiredChunksScriptElements(
      extraProps,
    )
    const assetsScriptElements = assets.map(asset =>
      assetToScriptElement(asset, extraProps),
    )
    return [...requiredScriptElements, ...assetsScriptElements]
  }

  // Public methods
  // -----------------

  // Collect

  addChunk(chunk) {
    if (this.chunks.indexOf(chunk) !== -1) return
    this.chunks.push(chunk)
  }

  collectChunks(app) {
    return <ChunkExtractorManager extractor={this}>{app}</ChunkExtractorManager>
  }

  // Utilities

  requireEntrypoint(entrypoint) {
    entrypoint = entrypoint || this.entrypoints[0]
    const assets = this.getChunkAssets(entrypoint)
    const mainAsset = assets.find(asset => asset.scriptType === 'script')
    invariant(mainAsset, 'asset not found')

    this.stats.assets
      .filter(({ name }) => isScriptFile(name))
      .forEach(({ name }) => {
        smartRequire(path.join(this.outputPath, cleanFileName(name)))
      })

    return smartRequire(cleanFileName(mainAsset.path))
  }

  // Main assets

  getMainAssets(scriptType) {
    const chunks = [...this.entrypoints, ...this.chunks]
    return this.getChunkAssetsByType(scriptType, chunks)
  }

  getMainAssetsByChunks({ scriptType, includedChunks = [] } = {}) {
    const chunks = this.getFilteredChunks(includedChunks)
    return this.getChunkAssetsByType(scriptType, chunks)
  }

  getScriptTags(extraProps = {}) {
    const mainAssets = this.getMainAssets('script')
    return this.getRequiredAndAssetsScriptTags(mainAssets, extraProps)
  }

  getScriptTagsByChunks({ extraProps = {}, includedChunks = [] } = {}) {
    const mainAssets = this.getMainAssetsByChunks({
      scriptType: 'script',
      includedChunks,
    })
    return this.getRequiredAndAssetsScriptTags(mainAssets, extraProps)
  }

  getScriptElements(extraProps = {}) {
    const mainAssets = this.getMainAssets('script')
    return this.getRequiredAndAssetsScriptElements(mainAssets, extraProps)
  }

  getScriptElementsByChunks({ extraProps = {}, includedChunks = [] } = {}) {
    const mainAssets = this.getMainAssetsByChunks({
      scriptType: 'script',
      includedChunks,
    })
    return this.getRequiredAndAssetsScriptElements(mainAssets, extraProps)
  }

  getCssString() {
    const mainAssets = this.getMainAssets('style')
    const promises = mainAssets.map(asset =>
      assetToStyleString(asset, this).then(data => data),
    )
    return Promise.all(promises).then(results => joinTags(results))
  }

  getStyleTags(extraProps = {}) {
    const mainAssets = this.getMainAssets('style')
    return joinTags(mainAssets.map(asset => assetToStyleTag(asset, extraProps)))
  }

  getInlineStyleTags(extraProps = {}) {
    const mainAssets = this.getMainAssets('style')
    const promises = mainAssets.map(asset =>
      assetToStyleTagInline(asset, extraProps, this).then(data => data),
    )
    return Promise.all(promises).then(results => joinTags(results))
  }

  getStyleElements(extraProps = {}) {
    const mainAssets = this.getMainAssets('style')
    return mainAssets.map(asset => assetToStyleElement(asset, extraProps))
  }

  getInlineStyleElements(extraProps = {}) {
    const mainAssets = this.getMainAssets('style')
    const promises = mainAssets.map(asset =>
      assetToStyleElementInline(asset, extraProps, this).then(data => data),
    )
    return Promise.all(promises).then(results => results)
  }

  // Pre assets

  getPreAssets() {
    const mainAssets = this.getMainAssets()
    const chunks = [...this.entrypoints, ...this.chunks]
    const preloadAssets = this.getChunkChildAssets(chunks, 'preload')
    const prefetchAssets = this.getChunkChildAssets(chunks, 'prefetch')
    return [...mainAssets, ...preloadAssets, ...prefetchAssets].sort(a =>
      a.scriptType === 'style' ? -1 : 0,
    )
  }

  getLinkTags(extraProps = {}) {
    const assets = this.getPreAssets()
    const linkTags = assets.map(asset => assetToLinkTag(asset, extraProps))
    return joinTags(linkTags)
  }

  getLinkElements(extraProps = {}) {
    const assets = this.getPreAssets()
    return assets.map(asset => assetToLinkElement(asset, extraProps))
  }
}

export default ChunkExtractor
