import type World from './base/World.ts'
import type {WorldId} from './index.ts'

import {currentWorldId} from './index.ts'

/** every world’s module, each in chunks of its own */
const loaders: Record<WorldId, () => Promise<{default: World}>> = {
  gallery: () => import('./gallery/index.ts'),
  knottingham: () => import('./knottingham/index.ts'),
  sandbox: () => import('./sandbox/index.ts'),
}
/**
 * The world this page shows, as its URL chose it. Only that world’s module downloads, and every importer waits until it has loaded.
 *
 * World modules must never import this one, not even through their dependencies: they would wait for themselves.
 */
const {default: world} = await loaders[currentWorldId]()

export default world
