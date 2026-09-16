import {types} from 'node:util'

import {NotBakeableError} from './types.ts'

const mutations = new Set(['add', 'set', 'delete', 'clear', 'fill', 'copyWithin', 'reverse', 'sort'])
const reflection = new Set(['constructor', '__proto__', 'caller', 'callee'])

/** Guards captured configuration; constructor-local data remains freely mutable. */
export default class ReadOnlyGraph {
  capture = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'function') {
        throw new NotBakeableError('Captured stateful function; use a locally constructed closure instead.')
      }
      return value
    }
    const prior = this.proxies.get(value)
    if (prior) {
      return prior
    }
    const special = types.isMap(value) || types.isSet(value) || ArrayBuffer.isView(value)
    const proxy = new Proxy(value, {
      set: () => this.fail(),
      deleteProperty: () => this.fail(),
      defineProperty: () => this.fail(),
      setPrototypeOf: () => this.fail(),
      get: (target, key): unknown => {
        // Array species is read internally by map/filter/slice, not by the recipe source.
        if (key === 'constructor' && Array.isArray(target)) {
          if (!Array.isArray(Object.getPrototypeOf(target))) {
            throw new NotBakeableError('Captured array subclasses are not supported.')
          }
          return Array
        }
        if (typeof key === 'string' && reflection.has(key)) {
          throw new NotBakeableError('Reflective access to captured state.')
        }
        const member: unknown = Reflect.get(target, key, target)
        if (typeof member === 'function') {
          if (special) {
            if (typeof key === 'string' && mutations.has(key)) {
              return () => this.fail()
            }
            if (key === 'get' || key === 'subarray') {
              return (...args: Array<unknown>) => this.capture(Reflect.apply(member, target, args))
            }
            // Map/set iterators can expose aliases; refuse rather than silently clone shared values.
            if (types.isMap(target) || types.isSet(target)) {
              if (key !== 'has') {
                throw new NotBakeableError('Captured collection iteration is not supported.')
              }
            }
            return member.bind(target)
          }
          return member.bind(proxy)
        }
        return this.capture(member)
      },
    })
    this.proxies.set(value, proxy)
    this.shared.add(value)
    this.shared.add(proxy)
    return proxy
  }
  isShared = (value: object) => this.shared.has(value)

  private readonly proxies = new WeakMap<object, object>

  private readonly shared = new WeakSet<object>

  private fail(): never {
    throw new NotBakeableError('Recipe attempts to mutate captured state.')
  }
}

const nativeProxies = new WeakMap<object, object>

/** Native constructors are capabilities, but their static/prototype state is not writable. */
export function protectNative(value: unknown): unknown {
  if (value === null || typeof value !== 'function' && typeof value !== 'object') {
    return value
  }
  const previous = nativeProxies.get(value)
  if (previous) {
    return previous
  }
  const proxy = new Proxy(value, {
    set() {
      throw new NotBakeableError('Cannot mutate a native capability.')
    },
    deleteProperty() {
      throw new NotBakeableError('Cannot mutate a native capability.')
    },
    defineProperty() {
      throw new NotBakeableError('Cannot mutate a native capability.')
    },
    setPrototypeOf() {
      throw new NotBakeableError('Cannot mutate a native capability.')
    },
    get(target, key): unknown {
      if (typeof key === 'string' && (reflection.has(key) || key === 'random')) {
        throw new NotBakeableError('Nondeterministic or reflective native access.')
      }
      // Class heritage needs the real prototype. Explicit source access is rejected by the AST pass.
      return key === 'prototype' ? Reflect.get(target, key) : protectNative(Reflect.get(target, key))
    },
  })
  nativeProxies.set(value, proxy)
  return proxy
}
