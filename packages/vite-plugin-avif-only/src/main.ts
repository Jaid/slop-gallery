import type {AvifOptions} from './AvifCache.ts'
import type {Plugin, ResolvedConfig, ViteDevServer} from 'vite'

import {createHash} from 'node:crypto'
import {dirname, isAbsolute, relative, resolve} from 'node:path'

import {parse} from '@babel/parser'
import fs from 'fs-extra'
import MagicString from 'magic-string'
import {isFileServingAllowed, normalizePath} from 'vite'

import {AvifCache} from './AvifCache.ts'

export type AvifOnlyOptions = AvifOptions & {cacheDir?: string}
type Ast = {[key: string]: unknown
  end: number
  start: number
  type: string}
const isNode = (value: unknown): value is Ast => !!value && typeof value === 'object' && 'type' in value && typeof value.type === 'string'
const clean = (url: string) => {
  const query = url.indexOf('?')
  const fragment = url.indexOf('#', 1)
  return url.slice(0, Math.min(query === -1 ? url.length : query, fragment === -1 ? url.length : fragment))
}
const isJxl = (url: string) => /\.jxl(?:[#?]|$)/iu.test(url) && !url.startsWith('//') && (!/^[a-z]+:/iu.test(url) || isAbsolute(url)) && !/[&?]raw(?:&|$)/u.test(url)
const avifUrl = (url: string) => url.replace(/\.jxl(?=[#?]|$)/iu, '.avif')

/** JXL source assets, AVIF browser URLs. No client-side decoder or format detection. */
export default function avifOnly(options: AvifOnlyOptions = {}): Plugin {
  let config: ResolvedConfig
  let cache: AvifCache
  const building = () => config.command === 'build'
  async function sourceFor(url: string, importer: string, publicOnly = false) {
    let path: string
    try {
      path = decodeURIComponent(clean(url))
    } catch {
      return
    }
    if (path.startsWith('/') && config.publicDir) {
      const publicPath = resolve(config.publicDir, `.${path}`)
      if (!relative(config.publicDir, publicPath).startsWith('..') && await fs.pathExists(publicPath)) {
        return {
          path: publicPath,
          public: true,
        }
      }
    }
    if (publicOnly) {
      return
    }
    let file = resolve(dirname(clean(importer)), path)
    if (path.startsWith('/@fs/')) {
      file = path.slice(5)
    } else if (path.startsWith('/')) {
      file = resolve(config.root, `.${path}`)
    }
    if (await fs.pathExists(file)) {
      return {
        path: file,
        public: false,
      }
    }
  }
  async function replacement(url: string, importer: string, kind: 'import' | 'public' | 'url') {
    if (!isJxl(url)) {
      return
    }
    if (kind === 'import' && !url.startsWith('.') && !url.startsWith('/')) {
      return
    }
    const source = await sourceFor(url, importer, kind === 'public')
    if (!source) {
      return
    }
    if (source.public && (kind === 'public' || !building())) {
      return config.base + avifUrl(url).replace(/^\//u, '')
    }
    if (!building() && kind !== 'import') {
      return avifUrl(url)
    }
    const output = await cache.convert(source.path)
    let path = normalizePath(relative(dirname(clean(importer)), output))
    if (!path.startsWith('.')) {
      path = `./${path}`
    }
    return path + url.slice(clean(url).length)
  }
  async function transformCode(code: string, id: string, watch: (file: string) => void) {
    if (!/\.jxl/iu.test(code)) {
      return
    }
    const ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: [/\.[cm]?tsx?(?:\?|$)/u.test(id) ? 'typescript' : null, /\.[jt]sx(?:\?|$)/u.test(id) ? 'jsx' : null].filter(value => value !== null) as Array<'jsx' | 'typescript'>,
    })
    const matches: Array<{kind: 'import' | 'public' | 'url'
      node: Ast
      value: string}> = []
    const visit = (node: unknown, parent?: Ast) => {
      if (!isNode(node)) {
        return
      }
      let value = node.type === 'StringLiteral' && typeof node.value === 'string' ? node.value : undefined
      if (node.type === 'TemplateLiteral' && Array.isArray(node.expressions) && !node.expressions.length && Array.isArray(node.quasis)) {
        const quasi: unknown = node.quasis[0]
        if (isNode(quasi) && quasi.value && typeof quasi.value === 'object' && 'cooked' in quasi.value && typeof quasi.value.cooked === 'string') {
          value = quasi.value.cooked
        }
      }
      if (value && isJxl(value)) {
        const importing = parent && ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(parent.type) && parent.source === node
        const args = parent?.arguments
        const url = parent?.type === 'NewExpression' && isNode(parent.callee) && parent.callee.name === 'URL' && Array.isArray(args) && args[0] === node && isNode(args[1]) && code.slice(args[1].start, args[1].end) === 'import.meta.url'
        if (importing || url || value.startsWith('/')) {
          let kind: 'import' | 'public' | 'url' = 'public'
          if (importing) {
            kind = 'import'
          } else if (url) {
            kind = 'url'
          }
          matches.push({
            node,
            value,
            kind,
          })
        }
      }
      for (const property of Object.values(node)) {
        if (Array.isArray(property)) {
          for (const child of property) {
            visit(child, node)
          }
        } else {
          visit(property, node)
        }
      }
    }
    visit(ast)
    const result = new MagicString(code)
    for (const {node, value, kind} of matches) {
      const target = await replacement(value, id, kind)
      if (!target) {
        continue
      }
      const source = await sourceFor(value, id, kind === 'public')
      if (source) {
        watch(source.path)
      }
      result.overwrite(node.start, node.end, JSON.stringify(target))
    }
    if (result.hasChanged()) {
      return {
        code: result.toString(),
        map: result.generateMap({
          hires: true,
          source: id,
        }),
      }
    }
  }
  async function rewriteMarkup(code: string, id: string, html = false) {
    const pattern = html ? /\b(?:href|poster|src)\s*=\s*(["'])([^"']+\.jxl(?:[#?][^"']*)?)\1/giu : /url\(\s*(["']?)([^"')]+\.jxl(?:[#?][^"')]*)?)\1\s*\)/giu
    const result = new MagicString(code)
    for (const match of code.matchAll(pattern)) {
      const value = match[2]
      const lookup = html && value.startsWith(config.base) ? `/${value.slice(config.base.length)}` : value
      const target = await replacement(lookup, id, lookup.startsWith('/') ? 'public' : 'url')
      if (!target) {
        continue
      }
      const start = match.index + match[0].indexOf(value)
      result.overwrite(start, start + value.length, target)
    }
    return {
      code: result.toString(),
      map: result.generateMap({
        hires: true,
        source: id,
      }),
    }
  }
  async function serve(server: ViteDevServer, url: string) {
    const base = config.base.startsWith('/') ? config.base : new URL(config.base, 'http://vite.local/').pathname
    const pathname = clean(url)
    if (!pathname.startsWith(base) || !/\.avif$/iu.test(pathname)) {
      return
    }
    const request = `/${pathname.slice(base.length)}`
    const source = await sourceFor(request.replace(/\.avif$/iu, '.jxl'), resolve(config.root, 'index.html'))
    if (!source) {
      return
    }
    const real = await fs.realpath(source.path)
    if (!isFileServingAllowed(real, server)) {
      return
    }
    return cache.convert(real)
  }
  return {
    name: 'avif-only',
    enforce: 'pre',
    config() {
      return {assetsInclude: ['**/*.jxl']}
    },
    configResolved(resolved) {
      config = resolved
      cache = new AvifCache(resolve(config.root, options.cacheDir ?? 'temp/vite-plugin-avif-only/cache'), options)
    },
    async resolveId(source, importer) {
      if (!isJxl(source)) {
        return
      }
      const resolved = await this.resolve(source, importer, {skipSelf: true})
      if (!resolved || resolved.external || !await fs.pathExists(clean(resolved.id))) {
        return
      }
      this.addWatchFile(clean(resolved.id))
      const output = await cache.convert(clean(resolved.id))
      return this.resolve(output + resolved.id.slice(clean(resolved.id).length), importer, {skipSelf: true})
    },
    async transform(code, id) {
      if (/\.[cm]?[jt]sx?(?:\?|$)/u.test(id) && !id.includes('/node_modules/')) {
        return transformCode(code, id, path => this.addWatchFile(path))
      }
      if (/\.css(?:\?|$)/u.test(id) && /\.jxl/iu.test(code)) {
        return rewriteMarkup(code, id)
      }
    },
    transformIndexHtml: {
      order: 'post',
      async handler(html, context) {
        const result = await rewriteMarkup(html, context.filename, true)
        return result.code
      },
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!['GET', 'HEAD'].includes(request.method ?? '') || !request.url) {
          return next()
        }
        void (async () => {
          try {
            const file = await serve(server, request.url!)
            if (!file) {
              return next()
            }
            const bytes = await fs.readFile(file)
            const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`
            response.setHeader('Content-Type', 'image/avif')
            response.setHeader('Cache-Control', 'no-cache')
            response.setHeader('X-Content-Type-Options', 'nosniff')
            response.setHeader('ETag', etag)
            if (request.headers['if-none-match'] === etag) {
              response.statusCode = 304
              response.end()
              return
            }
            response.setHeader('Content-Length', bytes.length)
            response.end(request.method === 'HEAD' ? undefined : bytes)
          } catch (error) {
            next(error)
          }
        })()
      })
    },
    generateBundle(_options, bundle) {
      if (Object.values(bundle).some(asset => asset.type === 'asset' && /\.jxl$/iu.test(asset.fileName))) {
        this.error('An unsupported JXL reference bypassed AVIF conversion. Use a static import or new URL with a string literal.')
      }
    },
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        // Runs after normal public copying and level-specific public-asset filters.
        const directory = isAbsolute(config.build.outDir) ? config.build.outDir : resolve(config.root, config.build.outDir)
        const paths = await Array.fromAsync(new Bun.Glob('**/*.jxl').scan(directory))
        await Promise.all(paths.map(async path => {
          const source = resolve(directory, path)
          await fs.copyFile(await cache.convert(source), source.replace(/\.jxl$/iu, '.avif'))
          await fs.remove(source)
        }))
      },
    },
  }
}
