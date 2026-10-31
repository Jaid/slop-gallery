import {readStored, writeStored} from './browserStorage.ts'
import {parseSeed, rollSeed} from './environmentSeed.ts'

const storedSeed = parseSeed(readStored('seed'))

/** whether this visit continues the game of an earlier one, which stored its seed */
export const isContinuing = storedSeed !== undefined

/** the environment seed of this game: the one an earlier visit stored, or a new one, stored right away */
export const gameSeed = storedSeed ?? rollSeed()

if (!isContinuing) {
  writeStored('seed', String(gameSeed))
}

/** Forgets the seed and reloads the page, which starts a new game in a new environment. */
export function startNewGame() {
  writeStored('seed', null)
  location.reload()
}
