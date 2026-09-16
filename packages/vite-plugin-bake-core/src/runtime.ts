import type {Atom, Snapshot, SnapshotNode} from './types.ts'

export type RuntimeCodec = {
  allocate: () => object
  hydrate: (target: object, data: unknown) => void
}
export type RuntimeCodecs = Readonly<Record<string, RuntimeCodec>>
export type Constructors = Readonly<Record<string, Constructor>>
type Constructor = {
  new (...args: Array<unknown>): object
  prototype: object
}
type ObjectNode = Extract<SnapshotNode, {kind: 'object'}>
type TextureResource = {
  addEventListener: (event: 'dispose', listener: () => void) => void
  needsUpdate: boolean
  removeEventListener: (event: 'dispose', listener: () => void) => void
  source?: {data: unknown}
}
const typedArrays: Constructors = {
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  BigInt64Array,
  BigUint64Array,
} as unknown as Constructors
const textDecoder = new TextDecoder
const magic = 'BAKE0001'

/** Parse once; every invocation of the returned factory owns a fresh object graph. */
export function decodeSnapshot(bytes: Uint8Array, constructors: Constructors = {}, codecs: RuntimeCodecs = {}) {
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (textDecoder.decode(bytes.subarray(0, 8)) !== magic) {
    throw new Error('Invalid baked-resource artifact.')
  }
  const size = header.getUint32(8, true)
  const snapshot = JSON.parse(textDecoder.decode(bytes.subarray(12, 12 + size))) as Snapshot
  const payload = bytes.subarray(Math.ceil((12 + size) / 8) * 8)
  return (rootConstructor?: Constructor) => {
    const reader = new SnapshotReader(snapshot, payload, constructors, rootConstructor, codecs)
    const result = reader.read(snapshot.root)
    reader.finish()
    return result
  }
}

/** Top-level-await loading keeps original resource constructors synchronous. */
export async function loadSnapshot(url: string, constructors: Constructors = {}, compressed = true, codecs: RuntimeCodecs = {}) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load baked resource (${response.status}): ${url}`)
  }
  const decoded = compressed ? new Response(response.body!.pipeThrough(new DecompressionStream('gzip'))) : response
  return decodeSnapshot(new Uint8Array(await decoded.arrayBuffer()), constructors, codecs)
}

class SnapshotReader {
  private readonly canvases = new WeakSet<object>
  private readonly objects = new Map<number, object>
  private readonly pending: Array<() => void> = []

  constructor(
    private readonly snapshot: Snapshot,
    private readonly payload: Uint8Array,
    private readonly constructors: Constructors,
    private readonly rootConstructor?: Constructor,
    private readonly codecs: RuntimeCodecs = {},
  ) {}

  finish() {
    for (const hydrate of this.pending) {
      hydrate()
    }
  }

  read(atom: Atom): unknown {
    if (atom === null || typeof atom !== 'object') {
      return atom
    }
    if ('special' in atom) {
      switch (atom.special) {
        case 'undefined': { return undefined }
        case 'nan': { return Number.NaN }
        case 'infinity': { return Number.POSITIVE_INFINITY }
        case '-infinity': { return Number.NEGATIVE_INFINITY }
        case '-0': { return -0 }
      }
    }
    const previous = this.objects.get(atom.ref)
    if (previous) {
      return previous
    }
    const node = this.snapshot.nodes[atom.ref]
    const result = this.allocate(node)
    this.objects.set(atom.ref, result)
    switch (node.kind) {
      case 'codec': {
        const data = this.read(node.data)
        // All geometry attributes and graph back-references must exist before derived-resource hydration.
        this.pending.push(() => this.codecs[node.codec].hydrate(result, data))
        break
      }
      case 'array': {
        const array = result as Array<unknown>
        for (const value of node.values) {
          array.push(this.read(value))
        }
        break
      }
      case 'set': {
        const set = result as Set<unknown>
        for (const value of node.values) {
          set.add(this.read(value))
        }
        break
      }
      case 'map': {
        const map = result as Map<unknown, unknown>
        for (const [key, value] of node.entries) {
          map.set(this.read(key), this.read(value))
        }
        break
      }
      case 'object': {
        for (const [key, value] of node.properties) {
          Object.defineProperty(result, key, {
            value: this.read(value),
            writable: true,
            enumerable: true,
            configurable: true,
          })
        }
        if (node.resource === 'texture') {
          this.finishTexture(result as TextureResource, node.ownsCanvas === true)
        }
        break
      }
    }
    return result
  }

  private allocate(node: SnapshotNode): object {
    switch (node.kind) {
      case 'codec': { return this.codecs[node.codec].allocate() }
      case 'buffer': {
        // Fresh per invocation; views within this graph keep their original aliases.
        return this.payload.slice(node.offset, node.offset + node.length).buffer
      }
      case 'view': {
        const buffer = this.read(node.buffer) as ArrayBuffer
        if (node.type === 'DataView') {
          return new DataView(buffer, node.offset, node.length)
        }
        const ArrayType = typedArrays[node.type]
        return new ArrayType(buffer, node.offset, node.length)
      }
      case 'canvas': {
        const canvas = document.createElement('canvas')
        canvas.width = node.width
        canvas.height = node.height
        const context = canvas.getContext('2d', {colorSpace: 'srgb'})!
        const pixels = this.read(node.pixels) as Uint8Array<ArrayBuffer>
        context.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength), node.width, node.height), 0, 0)
        this.canvases.add(canvas)
        return canvas
      }
      case 'array': { return [] }
      case 'map': { return new Map }
      case 'set': { return new Set }
      case 'object': {
        const prototype = this.prototype(node)
        if (!node.allocate) {
          return Object.create(prototype) as object
        }
        const Native = this.constructors[node.allocate]
        const result = new Native(...(node.allocationArguments ?? []).map(argument => this.read(argument)))
        if (Object.getPrototypeOf(result) !== prototype) {
          Object.setPrototypeOf(result, prototype)
        }
        return result
      }
    }
  }

  private finishTexture(texture: TextureResource, ownsCanvas: boolean) {
    texture.needsUpdate = true
    const image = texture.source?.data
    if (ownsCanvas && image && typeof image === 'object' && this.canvases.has(image)) {
      const canvas = image as HTMLCanvasElement
      const release = () => {
        texture.removeEventListener('dispose', release)
        canvas.width = 0
        canvas.height = 0
      }
      texture.addEventListener('dispose', release)
    }
  }

  private prototype(node: ObjectNode): object | null {
    if (node.prototype === '$root') {
      if (!this.rootConstructor) {
        throw new Error('Missing constructor for a baked custom resource.')
      }
      return this.rootConstructor.prototype
    }
    if (node.prototype === '$null') {
      return null
    }
    return node.prototype ? this.constructors[node.prototype].prototype : Object.prototype
  }
}
