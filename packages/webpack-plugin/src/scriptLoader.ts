import { LoaderDefinitionFunction } from 'webpack'
import { generateImports } from '@amotify/loader-shared'

export default (function AmotifyLoader (content, sourceMap) {
    if (this.data?.skip) {
        return content
    }

    this.async()
    this.cacheable()

    const { code: imports, source } = generateImports(content)

    this.callback(null, source + imports, sourceMap)
} as LoaderDefinitionFunction)

export const pitch = (function AmotifyLoaderPitch (remainingRequest, precedingRequest, data) {
    if (this.loaders.some(loader => loader.path.endsWith('vue-loader/dist/pitcher.js'))) {
        data!.skip = true
    }
} as LoaderDefinitionFunction)