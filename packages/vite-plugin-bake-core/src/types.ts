import type {NodePath} from '@babel/traverse'
import type * as t from '@babel/types'

export type Atom = {ref: number} | {special: '-0' | '-infinity' | 'infinity' | 'nan' | 'undefined'} | boolean | number | string | null
export type SnapshotNode =
  | {
    allocate?: string
    allocationArguments?: Array<Atom>
    kind: 'object'
    ownsCanvas?: boolean
    properties: Array<[string, Atom]>
    prototype?: string
    resource?: string
  }
  | {
    buffer: Atom
    kind: 'view'
    length: number
    offset: number
    type: string
  }
  | {
    entries: Array<[Atom, Atom]>
    kind: 'map'
  }
  | {
    height: number
    kind: 'canvas'
    pixels: Atom
    width: number
  }
  | {
    kind: 'array'
    values: Array<Atom>
  }
  | {
    kind: 'buffer'
    length: number
    offset: number
  }
  | {
    kind: 'set'
    values: Array<Atom>
  }
export type Snapshot = {
  nodes: Array<SnapshotNode>
  root: Atom
}
export type NativeType = {
  /** Constructor used to establish fresh native identity before restoring properties. */
  allocate?: string
  allocationArguments?: ReadonlyArray<unknown>
  module: string
  name: string
  omit?: ReadonlyArray<string>
  prototype: object
  resource?: string
}
export type CanvasPixels = {
  data: Uint8Array
  height: number
  width: number
}
export type BakeAdapter = {
  accepts: (resources: ReadonlySet<string>) => boolean
  /** Lazily resolve optional, explicitly approved native modules. */
  loadModule?: (source: string) => Promise<Readonly<Record<string, unknown>> | undefined>
  /** These modules are trusted capabilities, not arbitrary application imports. */
  modules: ReadonlyMap<string, Readonly<Record<string, unknown>>>
  name: string
  ownsCanvas?: (value: object) => boolean
  readCanvas?: (value: object) => CanvasPixels | undefined
  roots: ReadonlySet<unknown>
  types: ReadonlyArray<NativeType>
}
export type BakeDiagnostic = {
  bytes?: number
  evaluationMs?: number
  expression: string
  file: string
  line: number
  rawBytes?: number
  reason?: string
  resources?: Array<string>
  status: 'baked' | 'skipped'
}
export type BakeOptions = {
  /** Gzip is decoded once at module load, never in a resource constructor. */
  compress?: boolean
  exclude?: ((id: string) => boolean) | RegExp
  /** Paths are normalized absolute filenames. Dependencies are still followed outside this filter. */
  include?: ((id: string) => boolean) | RegExp
  /** Maximum uncompressed size of one artifact. */
  maxBytes?: number
  /** Ignore small snapshots for which an extra request is unlikely to pay for itself. */
  minimumBytes?: number
  onDiagnostic?: (diagnostic: BakeDiagnostic) => void
  /** Emit a machine-readable report with successful recipes and skipped resource candidates. */
  report?: boolean
  /** Maximum execution time of one closed recipe, in milliseconds. */
  timeoutMs?: number
}
export type SourceModule = {
  ast: t.File
  code: string
  id: string
  path: NodePath<t.Program>
}
export type ResolveModule = (source: string, importer: string) => Promise<string | undefined>

export class NotBakeableError extends Error {
  override name = 'NotBakeableError'
}
