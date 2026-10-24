import optis from 'optis'
import readPermalink from 'read-permalink'

export type KeyValueStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

const enabledValues = new Set<unknown>([true, '', 'true'])
const temporarySchema = optis({
  defaults: {
    temporary: false,
  },
  normalizations: {
    temporary(value: unknown) {
      return enabledValues.has(value)
    },
  },
})

/** Read the `?temporary` flag; a bare `?temporary` counts as enabled. */
export function readTemporary(input: URL | string = typeof location === 'undefined' ? '' : location.href): boolean {
  return readPermalink(input, {schema: temporarySchema}).temporary
}

/** whether this page was opened with `?temporary`, read once at startup: nothing is read from or written to browser storage, everything lives only as long as the page */
export const isTemporary = readTemporary()

class MemoryStorage implements KeyValueStorage {
  private readonly items = new Map<string, string>

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  removeItem(key: string) {
    this.items.delete(key)
  }

  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}
const memoryLocal = new MemoryStorage
const memorySession = new MemoryStorage

/** `localStorage`, or with `?temporary` a store that forgets everything with the page. Resolved on every call, so blocked storage throws at the caller. */
export function localStore(): KeyValueStorage {
  return isTemporary ? memoryLocal : localStorage
}

/** `sessionStorage`, or with `?temporary` a store that forgets everything with the page. Resolved on every call, so blocked storage throws at the caller. */
export function sessionStore(): KeyValueStorage {
  return isTemporary ? memorySession : sessionStorage
}
