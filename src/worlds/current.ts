import type World from './base/World.ts'

import {currentWorldId} from './index.ts'

/**
 * The world this page shows, as its URL chose it. Only that world’s module downloads, and every importer waits until it has loaded.
 *
 * World modules must never import this one, not even through their dependencies: they would wait for themselves.
 */
const load = async (): Promise<World> => {
  const {default: selected} = currentWorldId === 'knottingham' ? await import('./knottingham/index.ts') : await import('./gallery/index.ts')
  return selected
}
const world = await load()

export default world
