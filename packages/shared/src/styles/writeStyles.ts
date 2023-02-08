import { writeFile } from 'fs/promises'
import * as findCacheDir from 'find-cache-dir'
import * as path from 'upath'

export const cacheDir = findCacheDir({
    name: 'amotify',
    create: true,
    thunk: true
})!

function normalize (p: string) {
    p = path.normalize(p)
    return /^[a-z]:\//i.test(p) ? '/' + p : p
}

export function writeStyles (files: Set<string>) {
    return writeFile(
        cacheDir('styles.scss'),
        [
            'amotify/lib/styles/main.sass',
            'amotify/dist/_component-variables.sass',
            ...[...files.values()].sort()
        ].map(v => `@forward '${normalize(v)}';`).join('\n'),
        'utf8'
    )
}