import optis from 'optis'
import readPermalink from 'read-permalink'

/**
 * Environment randomization (which plant grows in which pot, for example) is never drawn from `Math.random()`. Every roll mixes the seed of the game state with the fixed ID of the thing being rolled, so a result only depends on these two values and never on when or in which order something asks for it.
 */
export const maximumSeed = 0xFF_FF_FF_FF

/** An unsigned 32-bit integer, given as a number or as a string of decimal digits; anything else is `undefined`. */
export function parseSeed(value: unknown): number | undefined {
  const text = typeof value === 'number' ? String(value) : value
  if (typeof text !== 'string' || !/^\d{1,10}$/.test(text)) {
    return
  }
  const seed = Number(text)
  return seed <= maximumSeed ? seed : undefined
}

export const isSeed = (value: unknown): value is number => typeof value === 'number' && parseSeed(value) === value

const seedSchema = optis({
  normalizations: {
    seed: parseSeed,
  },
})

/** Reads the `?seed` override; an invalid value counts as missing. */
export function readSeedOverride(input: URL | string = typeof location === 'undefined' ? '' : location.href): number | undefined {
  return readPermalink(input, {schema: seedSchema}).seed
}

/** The `?seed` of this page, which replaces the seed of every game state for the session instead of rolling a new one. */
export const seedOverride = readSeedOverride()

/** A seed for a new game state: the `?seed` override if there is one, otherwise a random one. */
export function rollSeed(override = seedOverride) {
  if (override !== undefined) {
    return override
  }
  const [seed] = crypto.getRandomValues(new Uint32Array(1))
  return seed
}

/** The seed the environment is built from: the `?seed` override wins over the seed stored in the game state. */
export function effectiveSeed(stored: number, override = seedOverride) {
  return override ?? stored
}

/** A stable number in [0, 1) for the thing with the given `id` in the environment of `seed`. */
export function environmentRoll(seed: number, id: string) {
  let hash = mix(seed ^ 0x9E_37_79_B9)
  for (const character of id) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 0x01_00_01_93)
  }
  return mix(hash) / 2 ** 32
}

/** A stable choice among `items` for the thing with the given `id` in the environment of `seed`. */
export function environmentPick<T>(seed: number, id: string, items: ReadonlyArray<T>): T {
  if (!items.length) {
    throw new Error(`Nothing to pick from for ${id}.`)
  }
  return items[Math.floor(environmentRoll(seed, id) * items.length)]
}

/** A stable choice of `count` different items among `items` for the thing with the given `id` in the environment of `seed`, in the order of `items`. */
export function environmentSample<T>(seed: number, id: string, items: ReadonlyArray<T>, count: number): Array<T> {
  if (!Number.isInteger(count) || count < 0 || count > items.length) {
    throw new Error(`Cannot pick ${count} of ${items.length} items for ${id}.`)
  }
  const rolls = items.map((_, index) => environmentRoll(seed, `${id}:${index}`))
  const picked = new Set(rolls.keys().toArray().toSorted((a, b) => rolls[a] - rolls[b]).slice(0, count))
  return items.filter((_, index) => picked.has(index))
}

/** A stable choice among the `[item, weight]` pairs for the thing with the given `id` in the environment of `seed`, each item as likely as its share of the weights. */
export function environmentWeightedPick<T>(seed: number, id: string, items: ReadonlyArray<readonly [T, number]>): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0)
  if (!(total > 0) || items.some(([, weight]) => !(weight >= 0) || !Number.isFinite(weight))) {
    throw new Error(`Nothing to pick from for ${id}: it needs finite, non-negative weights that add up to more than zero.`)
  }
  let remaining = environmentRoll(seed, id) * total
  for (const [item, weight] of items) {
    remaining -= weight
    if (remaining < 0) {
      return item
    }
  }
  // Rounding can leave a sliver past the last weight.
  return items.findLast(([, weight]) => weight > 0)![0]
}

/** MurmurHash3’s finalizer, which spreads every input bit over the whole 32-bit result. */
function mix(hash: number) {
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85_EB_CA_6B)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xC2_B2_AE_35)
  hash ^= hash >>> 16
  return hash >>> 0
}
