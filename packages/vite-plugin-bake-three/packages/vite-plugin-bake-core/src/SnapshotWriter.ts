import type {Atom, BakeAdapter, NativeType, Snapshot, SnapshotCodec, SnapshotNode} from './types.ts'

import {types} from 'node:util'

import {NotBakeableError} from './types.ts'

/** Object-graph serialization, not Three.toJSON(): stores the final buffers, never constructor recipes. */
export default class SnapshotWriter {
  readonly codecs = new Map<string, SnapshotCodec>
  readonly constructors = new Map<string, NativeType>
  needsRootConstructor = false
  readonly resources = new Set<string>
  private readonly nodes: Array<SnapshotNode> = []
  private readonly payload: Array<Uint8Array> = []
  private payloadLength = 0
  private readonly seen = new Map<object, number>

  constructor(
    private readonly adapter: BakeAdapter,
    private readonly maxBytes: number,
    private readonly isShared: (value: object) => boolean,
    private readonly rootPrototype?: object,
  ) {}

  write(value: unknown) {
    const snapshot: Snapshot = {
      root: this.atom(value),
      nodes: this.nodes,
    }
    const metadata = (new TextEncoder).encode(JSON.stringify(snapshot))
    const start = Math.ceil((12 + metadata.byteLength) / 8) * 8
    if (start + this.payloadLength > this.maxBytes) {
      throw new NotBakeableError('Artifact exceeds maxBytes.')
    }
    const bytes = new Uint8Array(start + this.payloadLength)
    bytes.set((new TextEncoder).encode('BAKE0001'))
    new DataView(bytes.buffer).setUint32(8, metadata.byteLength, true)
    bytes.set(metadata, 12)
    let offset = start
    for (const part of this.payload) {
      bytes.set(part, offset)
      offset += part.byteLength
    }
    return bytes
  }

  private atom(value: unknown): Atom {
    if (value === undefined) {
      return {special: 'undefined'}
    }
    if (typeof value === 'number') {
      if (Number.isNaN(value)) {
        return {special: 'nan'}
      }
      if (value === Infinity) {
        return {special: 'infinity'}
      }
      if (value === -Infinity) {
        return {special: '-infinity'}
      }
      if (Object.is(value, -0)) {
        return {special: '-0'}
      }
      return value
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
      return value
    }
    if (typeof value !== 'object') {
      throw new NotBakeableError(`Cannot serialize ${typeof value} values or captured callbacks.`)
    }
    if (this.isShared(value)) {
      throw new NotBakeableError('Result aliases state created outside the recipe.')
    }
    const previous = this.seen.get(value)
    if (previous !== undefined) {
      return {ref: previous}
    }
    const ref = this.nodes.length
    this.seen.set(value, ref)
    this.nodes.push({
      kind: 'object',
      properties: [],
    })
    this.nodes[ref] = this.object(value)
    return {ref}
  }

  private object(value: object): SnapshotNode {
    if (!Object.isExtensible(value)) {
      throw new NotBakeableError('Sealed and frozen output objects are not supported.')
    }
    if (types.isAnyArrayBuffer(value)) {
      if (types.isSharedArrayBuffer(value)) {
        throw new NotBakeableError('SharedArrayBuffer is not an owned resource.')
      }
      if (value.resizable) {
        throw new NotBakeableError('Resizable output buffers are not supported.')
      }
      const data = new Uint8Array(value)
      const offset = this.payloadLength
      this.payloadLength += data.byteLength
      if (this.payloadLength > this.maxBytes) {
        throw new NotBakeableError('Artifact exceeds maxBytes.')
      }
      this.payload.push(new Uint8Array(data))
      return {
        kind: 'buffer',
        offset,
        length: data.byteLength,
      }
    }
    if (ArrayBuffer.isView(value)) {
      if (!['BigInt64Array', 'BigUint64Array', 'DataView', 'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array'].includes(value.constructor.name)) {
        throw new NotBakeableError('Custom typed-array subclasses are not supported.')
      }
      return {
        kind: 'view',
        type: value.constructor.name,
        buffer: this.atom(value.buffer),
        offset: value.byteOffset,
        length: types.isDataView(value) ? value.byteLength : (value as unknown as {length: number}).length,
      }
    }
    if (Array.isArray(value)) {
      if (!Array.isArray(Object.getPrototypeOf(value))) {
        throw new NotBakeableError('Custom array subclasses are not supported.')
      }
      if (Object.keys(value).length !== value.length) {
        throw new NotBakeableError('Sparse arrays or arrays with custom properties are not supported.')
      }
      return {
        kind: 'array',
        values: value.map(item => this.atom(item)),
      }
    }
    if (types.isMap(value) || types.isSet(value)) {
      const prototype = Object.getPrototypeOf(value) as object
      if (Reflect.ownKeys(value).length || Object.getPrototypeOf(Object.getPrototypeOf(prototype)) !== null) {
        throw new NotBakeableError('Custom collection subclasses or properties are not supported.')
      }
    }
    if (types.isMap(value)) {
      return {
        kind: 'map',
        entries: [...value].map(([key, item]) => [this.atom(key), this.atom(item)]),
      }
    }
    if (types.isSet(value)) {
      return {
        kind: 'set',
        values: [...value].map(item => this.atom(item)),
      }
    }
    const canvas = this.adapter.readCanvas?.(value)
    if (canvas) {
      return {
        kind: 'canvas',
        width: canvas.width,
        height: canvas.height,
        pixels: this.atom(canvas.data),
      }
    }
    const codec = this.adapter.codecs?.find(candidate => candidate.test(value))
    if (codec) {
      this.codecs.set(codec.name, codec)
      this.resources.add(codec.resource)
      return {
        kind: 'codec',
        codec: codec.name,
        data: this.atom(codec.encode(value)),
      }
    }
    const prototype = Object.getPrototypeOf(value) as object | null
    const native = this.adapter.types.find(type => type.prototype === prototype)
    const root = this.rootPrototype === prototype
    // Cross-realm plain objects have their own Object.prototype.
    const plain = prototype === null || Object.getPrototypeOf(prototype) === null
    if (!native && !root && !plain) {
      throw new NotBakeableError(`Unsupported prototype: ${value.constructor.name}.`)
    }
    if (root && !native) {
      this.needsRootConstructor = true
    }
    let base = native
    if (root && !base) {
      base = this.adapter.types.find(type => type.resource && type.prototype.isPrototypeOf(value))
    }
    if (native) {
      this.constructors.set(native.name, native)
    }
    if (base?.allocate) {
      const allocation = this.adapter.types.find(type => type.name === base.allocate)!
      this.constructors.set(allocation.name, allocation)
    }
    if (base?.resource) {
      this.resources.add(base.resource)
    }
    const omitted = new Set(base?.omit)
    const properties: Array<[string, Atom]> = []
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        throw new NotBakeableError('Symbol properties are not serializable.')
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (omitted.has(key)) {
        continue
      }
      if (!('value' in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) {
        throw new NotBakeableError(`Unsupported descriptor: ${key}.`)
      }
      properties.push([key, this.atom(descriptor.value)])
    }
    return {
      kind: 'object',
      prototype: root && !native ? '$root' : native?.name ?? (prototype === null ? '$null' : undefined),
      allocate: base?.allocate,
      allocationArguments: base?.allocationArguments?.map(argument => this.atom(argument)),
      properties,
      resource: base?.resource,
      ownsCanvas: this.adapter.ownsCanvas?.(value) || undefined,
    }
  }
}
