import { LoaderDefinitionFunction } from 'webpack'

const styleImportRegexp = /@use ['"]amotify(\/lib)?\/styles(\/main(\.sass)?)?['"]/

export default (function AmotifyLoader (content, sourceMap) {
    if (!styleImportRegexp.test(content)) {
        this.callback(null, content, sourceMap)
    }

    this.async()
    const options = this.getOptions() as { awaitResolve(id?: string): Promise<void> }

    options.awaitResolve(this.request).then(() => {
        this.callback(null, content.replace(styleImportRegexp, '@use ".cache/amotify/styles.scss"'), sourceMap)
    })
} as LoaderDefinitionFunction)