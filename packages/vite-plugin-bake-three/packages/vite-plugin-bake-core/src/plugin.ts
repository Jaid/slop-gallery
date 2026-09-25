import type {Candidate} from './candidates.ts'
import type {BakeAdapter, BakeDiagnostic, BakeOptions, NativeType, SnapshotCodec} from './types.ts'
import type {Plugin, ResolvedConfig} from 'vite'

import {createHash} from 'node:crypto'
import {relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {gzipSync} from 'node:zlib'

import MagicString from 'magic-string'

import {deferredDefinition, definitionCandidate} from './candidates.ts'
import Recipe, {describeExpression} from './Recipe.ts'
import SnapshotWriter from './SnapshotWriter.ts'
import SourceGraph from './SourceGraph.ts'

const sourceFile = /\.[cm]?[jt]sx?$/u
const normalize = (id: string) => id.replaceAll('\\', '/')
const matches = (filter: ((id: string) => boolean) | RegExp | undefined, id: string) => {
  if (!filter) {
    return false
  }
  if (typeof filter === 'function') {
    return filter(id)
  }
  filter.lastIndex = 0
  return filter.test(id)
}
type Artifact = {
  bytes: Uint8Array
  codecs: Map<string, SnapshotCodec>
  compressed: boolean
  constructors: Map<string, NativeType>
  reference?: string
}

/** Build-only partial evaluation with explicit, reusable native capabilities. */
export default function createBakePlugin(adapter: BakeAdapter, options: BakeOptions = {}): Plugin {
  const prefix = `virtual:bake-${adapter.name}:`
  const resolvedPrefix = `\0${prefix}`
  const runtime = normalize(fileURLToPath(new URL('runtime.ts', import.meta.url)))
  const artifacts = new Map<string, Artifact>
  const diagnostics: Array<BakeDiagnostic> = []
  let config: ResolvedConfig
  let graph: SourceGraph
  const diagnostic = (value: BakeDiagnostic) => {
    diagnostics.push(value)
    options.onDiagnostic?.(value)
  }
  return {
    name: `bake-${adapter.name}`,
    apply: 'build',
    enforce: 'pre',
    configResolved(value) {
      config = value
    },
    buildStart() {
      artifacts.clear()
      diagnostics.length = 0
      graph = new SourceGraph(async (source, importer) => {
        const resolved = await this.resolve(source, importer, {skipSelf: true})
        return resolved && !resolved.external ? normalize(resolved.id) : undefined
      })
    },
    // A fresh dependency slice on each watch build prevents stale imported configuration.
    shouldTransformCachedModule() {
      return true
    },
    resolveId(id) {
      if (id.startsWith(prefix)) {
        return {
          id: `\0${id}`,
          moduleSideEffects: false,
        }
      }
    },
    load(id) {
      if (!id.startsWith(resolvedPrefix)) {
        return
      }
      const hash = id.slice(resolvedPrefix.length)
      const artifact = artifacts.get(hash)
      if (!artifact) {
        this.error(`Missing baked artifact: ${hash}`)
      }
      artifact.reference ??= this.emitFile({
        type: 'asset',
        name: `baked-${adapter.name}-${hash}.bin`,
        source: artifact.bytes,
      })
      const imports: Array<string> = [`import {loadSnapshot} from ${JSON.stringify(runtime)}`]
      const constructors: Array<string> = []
      for (const [index, type] of [...artifact.constructors.values()].entries()) {
        imports.push(`import {${type.name} as C${index}} from ${JSON.stringify(type.module)}`)
        constructors.push(`${JSON.stringify(type.name)}:C${index}`)
      }
      const codecs: Array<string> = []
      for (const [index, codec] of [...artifact.codecs.values()].entries()) {
        imports.push(`import {${codec.exportName} as R${index}} from ${JSON.stringify(codec.module)}`)
        codecs.push(`${JSON.stringify(codec.name)}:R${index}`)
      }
      const placeholder = this.meta.rolldownVersion ? 'ROLLDOWN' : 'ROLLUP'
      return `${imports.join('\n')}\nexport default await loadSnapshot(import.meta.${placeholder}_FILE_URL_${artifact.reference},{${constructors.join(',')}},${artifact.compressed},{${codecs.join(',')}})\n`
    },
    async transform(code, rawId) {
      const id = normalize(rawId)
      if (config.build.ssr || !sourceFile.test(id) || id.includes('/node_modules/') || id.includes('\0') || id === runtime || id.includes('/vite-plugin-bake-core/')) {
        return
      }
      if (options.include ? !matches(options.include, id) : !id.startsWith(`${normalize(config.root)}/`)) {
        return
      }
      if (matches(options.exclude, id)) {
        return
      }
      const source = await graph.input(id, code)
      const candidates: Array<Candidate> = [...await adapter.candidates?.(source) ?? []]
      source.path.traverse({
        CallExpression(path) {
          candidates.push({
            path,
            expression: path.node,
            kind: 'expression',
          })
        },
        NewExpression(path) {
          candidates.push({
            path,
            expression: path.node,
            kind: 'expression',
          })
        },
        ClassDeclaration(path) {
          const candidate = definitionCandidate(path); if (candidate) {
            candidates.push(candidate)
          }
        },
        FunctionDeclaration(path) {
          const candidate = definitionCandidate(path); if (candidate) {
            candidates.push(candidate)
          }
        },
        VariableDeclarator(path) {
          const candidate = definitionCandidate(path); if (candidate) {
            candidates.push(candidate)
          }
        },
      })
      candidates.sort((a, b) => (a.start ?? a.path.node.start!) - (b.start ?? b.path.node.start!) || (b.end ?? b.path.node.end!) - (a.end ?? a.path.node.end!))
      const output = new MagicString(code)
      const imports = new Map<string, string>
      let replacedUntil = -1
      for (const candidate of candidates) {
        const {path} = candidate
        if ((candidate.start ?? path.node.start!) < replacedUntil) {
          continue
        }
        const recipe = new Recipe(graph, adapter, options.allowFreezingRandomness ?? false)
        const entry: BakeDiagnostic = {
          file: normalize(relative(config.root, id)),
          line: path.node.loc?.start.line ?? 0,
          expression: describeExpression(candidate.expression),
          status: 'skipped',
        }
        try {
          if (candidate.kind === 'expression') {
            const deferred = await deferredDefinition(path, graph, adapter)
            if (deferred) {
              const target = graph.source(deferred).id
              if ((options.include ? matches(options.include, target) : target.startsWith(`${normalize(config.root)}/`)) && !matches(options.exclude, target)) {
                continue
              }
            }
          }
          const evaluated = await recipe.evaluate(path, options.timeoutMs ?? 10_000, candidate.expression)
          const writer = new SnapshotWriter(adapter, options.maxBytes ?? 64 * 1024 * 1024, evaluated.isShared, evaluated.rootPrototype)
          const raw = writer.write(evaluated.value)
          if (!adapter.accepts(writer.resources)) {
            continue
          }
          if (raw.byteLength < (options.minimumBytes ?? 1024)) {
            entry.reason = 'Below minimumBytes.'
            diagnostic(entry)
            continue
          }
          const constructor = writer.needsRootConstructor ? evaluated.runtimeConstructor : undefined
          if (writer.needsRootConstructor && !constructor) {
            throw new Error('Custom factory result has no accessible constructor.')
          }
          const compressed = options.compress !== false
          const bytes = compressed ? gzipSync(raw, {level: 9}) : raw
          const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 24)
          artifacts.set(hash, artifacts.get(hash) ?? {
            bytes,
            constructors: writer.constructors,
            codecs: writer.codecs,
            compressed,
          })
          let factory = imports.get(hash)
          if (!factory) {
            factory = source.path.scope.generateUidIdentifier('bakedResource').name
            imports.set(hash, factory)
          }
          if (candidate.kind === 'custom') {
            for (const edit of candidate.edits!(factory)) {
              if (edit.start === edit.end) {
                output.appendLeft(edit.start, edit.text)
              } else {
                output.overwrite(edit.start, edit.end, edit.text)
              }
            }
          } else if (candidate.kind === 'class' && path.isClassDeclaration()) {
            const body = path.get('body')
            let hasConstructor = false
            for (const member of body.get('body')) {
              if (member.isClassProperty() && !member.node.static) {
                output.remove(member.node.start!, member.node.end!)
              } else if (member.isClassMethod({kind: 'constructor'})) {
                output.overwrite(member.node.start!, member.node.end!, `constructor() { return ${factory}(new.target) }`)
                hasConstructor = true
              }
            }
            if (!hasConstructor) {
              output.appendLeft(body.node.start! + 1, `constructor() { return ${factory}(new.target) }`)
            }
          } else if (candidate.kind === 'function') {
            output.overwrite(candidate.body!.node.start!, candidate.body!.node.end!, `{ return ${factory}() }`)
          } else {
            output.overwrite(path.node.start!, path.node.end!, `${factory}(${constructor ?? ''})`)
          }
          replacedUntil = candidate.end ?? path.node.end!
          for (const dependency of evaluated.dependencies) {
            this.addWatchFile(dependency)
          }
          diagnostic({
            ...entry,
            status: 'baked',
            bytes: bytes.byteLength,
            rawBytes: raw.byteLength,
            evaluationMs: evaluated.evaluationMs,
            resources: [...writer.resources],
          })
        } catch (error) {
          if (recipe.usesResource) {
            diagnostic({
              ...entry,
              reason: Error.isError(error) ? error.message : String(error),
            })
          }
        }
      }
      if (!imports.size) {
        return
      }
      output.prepend([...imports].map(([hash, name]) => `import ${name} from ${JSON.stringify(`${prefix}${hash}`)};\n`).join(''))
      return {
        code: output.toString(),
        map: output.generateMap({
          source: id,
          includeContent: true,
          hires: true,
        }),
      }
    },
    generateBundle(_outputOptions, bundle) {
      const retained = new Set(Object.values(bundle).flatMap(output => (output.type === 'chunk' ? Object.keys(output.modules).filter(id => id.startsWith(resolvedPrefix)).map(id => id.slice(resolvedPrefix.length)) : [])))
      for (const [hash, artifact] of artifacts) {
        if (!retained.has(hash) && artifact.reference) {
          delete bundle[this.getFileName(artifact.reference)]
        }
      }
      const baked = diagnostics.filter(item => item.status === 'baked')
      if (options.report !== false) {
        this.emitFile({
          type: 'asset',
          fileName: `bake-${adapter.name}.json`,
          source: JSON.stringify({
            recipes: baked.length,
            artifacts: retained.size,
            diagnostics,
          }, null, 2),
        })
      }
      if (baked.length) {
        const bytes = [...retained].reduce((sum, hash) => sum + artifacts.get(hash)!.bytes.byteLength, 0)
        config.logger.info(`[bake-${adapter.name}] ${baked.length} recipes, ${retained.size} retained artifacts, ${(bytes / 1024).toFixed(1)} KiB`)
      }
    },
  }
}
