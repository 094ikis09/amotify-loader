import * as path from 'upath'
import { URLSearchParams } from 'url'
import { writeStyles } from '@amotify/loader-shared'

import type { Compiler, NormalModule, Module } from 'webpack'
import type { Resolver, ResolveContext } from 'enhanced-resolve'
import type { Options } from '@amotify/loader-shared'

// Can't use require.resolve() for this, it doesn't work with resolve.symlinks
let amotifyBase: string
async function getAmotifyBase (base: string, context: ResolveContext, resolver: Resolver) {
    if (!getAmotifyBase.promise) {
        let resolve: (v: any) => void
        getAmotifyBase.promise = new Promise((_resolve) => resolve = _resolve)
        resolver.resolve({}, base, 'amotify/package.json', context, (err, amotifyPath) => {
            if (amotifyPath) {
                amotifyBase = path.dirname(amotifyPath as string)
            }
            resolve(true)
        })
    }
    return getAmotifyBase.promise
}
getAmotifyBase.promise = null as Promise<any> | null

function isSubdir (root: string, test: string) {
    const relative = path.relative(root, test)
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

export class AmotifyPlugin {
    options: Required<Options>

    constructor (options: Options) {
        this.options = {
            autoImport: true,
            styles: true,
            stylesTimeout: 10000,
            ...options,
        }
    }

    apply (compiler: Compiler) {
        if (this.options.autoImport) {
            compiler.options.module.rules.unshift({
                resourceQuery: query => {
                    if (!query) return false
                    const qs = new URLSearchParams(query)
                    return qs.has('vue') && (
                        qs.get('type') === 'template' ||
                        (qs.get('type') === 'script' && qs.has('setup'))
                    )
                },
                use: { loader: require.resolve('./scriptLoader') },
            })
        }

        if (
            this.options.styles === 'none' ||
            this.options.styles === 'expose'
        ) {
            compiler.options.module.rules.push({
                enforce: 'pre',
                test: /\.css$/,
                include: /node_modules[/\\]amotify[/\\]/,
                issuer: /node_modules[/\\]amotify[/\\]/,
                loader: 'null-loader',
            })
        } else if (this.options.styles === 'sass') {
            compiler.hooks.normalModuleFactory.tap('amotify-loader', factory => {
                factory.hooks.beforeResolve.tap('amotify-loader', resolveData => {
                    if (
                        resolveData.request.endsWith('.css') &&
                        isSubdir(path.dirname(require.resolve('amotify/package.json')), resolveData.context)
                    ) {
                        const match = resolveData.request.match(/.*!(.+\.css)$/)
                        if (match) {
                            resolveData.request = match[1].replace(/\.css$/, '.sass')
                        } else {
                            resolveData.request = resolveData.request.replace(/\.css$/, '.sass')
                        }
                    }
                })
            })
        }

        if (this.options.styles === 'expose') {
            const files = new Set<string>()
            let resolve: (v: boolean) => void
            let promise: Promise<boolean> | null
            let timeout: NodeJS.Timeout

            const blockingModules = new Set<string>()
            const pendingModules = new Map<string, Module>()
            compiler.hooks.compilation.tap('amotify-loader', (compilation, params) => {
                compilation.hooks.buildModule.tap('amotify-loader', (module) => {
                    pendingModules.set((module as NormalModule).request, module)
                })
                compilation.hooks.succeedModule.tap('amotify-loader', (module) => {
                    pendingModules.delete((module as NormalModule).request)
                    if (
                        resolve &&
                        !Array.from(pendingModules.keys()).filter(k => !blockingModules.has(k)).length
                    ) {
                        resolve(false)
                    }
                })
            })

            const logger = compiler.getInfrastructureLogger('amotify-loader')
            const awaitResolve = async (id?: string) => {
                if (id) {
                    blockingModules.add(id)
                }

                if (!promise) {
                    promise = new Promise((_resolve) => resolve = _resolve)

                    clearTimeout(timeout)
                    timeout = setTimeout(() => {
                        logger.error('styles fallback timeout hit', {
                            blockingModules: Array.from(blockingModules.values()),
                            pendingModules: Array.from(pendingModules.values(), module => (module as NormalModule).resource),
                        })
                        resolve(false)
                    }, this.options.stylesTimeout)

                    if (!Array.from(pendingModules.keys()).filter(k => !blockingModules.has(k)).length) {
                        resolve(false)
                    }

                    let start = files.size
                    await promise
                    clearTimeout(timeout)
                    blockingModules.clear()

                    if (files.size > start) {
                        await writeStyles(files)
                    }
                    promise = null
                }

                return promise
            }

            compiler.options.module.rules.push({
                enforce: 'pre',
                test: /\.s[ac]ss$/,
                loader: require.resolve('./styleLoader'),
                options: { awaitResolve },
            })

            compiler.options.resolve.plugins = compiler.options.resolve.plugins || []
            compiler.options.resolve.plugins.push({
                apply (resolver) {
                    resolver
                        .getHook('resolve')
                        .tapAsync('amotify-loader', async (request, context, callback) => {
                            if (request.path && !amotifyBase && request.request !== 'amotify/package.json') {
                                await getAmotifyBase(request.path, context, resolver)
                            }

                            if (!(
                                request.path &&
                                request.request?.endsWith('.css') &&
                                isSubdir(amotifyBase, request.path)
                            )) {
                                return callback()
                            }

                            resolver.resolve(
                                {},
                                request.path,
                                request.request.replace(/\.css$/, '.sass'),
                                context,
                                (err, resolution) => {
                                    if (resolution && !files.has(resolution)) {
                                        awaitResolve()
                                        files.add(resolution)
                                    }
                                    return callback()
                                }
                            )
                        })
                }
            })
        }
    }
}