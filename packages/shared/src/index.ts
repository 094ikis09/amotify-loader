export interface Options {
    autoImport?: importPluginOptions,
    styles?: true | 'none' | 'expose' | 'sass',
    /** @internal Only for testing */
    stylesTimeout?: number
}

export type importPluginOptions =
    | boolean

export { generateImports } from './imports/generateImports'
export { cacheDir, writeStyles } from './styles/writeStyles'