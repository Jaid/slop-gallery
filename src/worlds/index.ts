/** the ids of every world, which also name their telemetry service */
export const worldIds = ['gallery', 'knottingham', 'sandbox'] as const
export type WorldId = typeof worldIds[number]
/** what the loading screen and the menu show of a world before it has loaded */
export type WorldInfo = {
  enterLabel: string
  /** the prefix of every key the world stores in the browser, so that worlds never share a game */
  storageKey: string
  tagline: string
  title: string
  /** image behind the loading screen’s title, relative to the public directory */
  wallpaper?: string
}

export const worlds = {
  gallery: {
    title: 'Slop Gallery',
    storageKey: 'slop-gallery',
    tagline: 'Good taste. Questionable art.',
    enterLabel: 'Enter gallery',
    wallpaper: 'assets/wallpaper.jxl',
  },
  knottingham: {
    title: 'Knottingham',
    storageKey: 'knot-gallery',
    tagline: 'Light, motion and impossible materials.',
    enterLabel: 'Enter Knottingham',
  },
  sandbox: {
    title: 'Sandbox',
    storageKey: 'sandbox',
    tagline: 'One empty room to try things in.',
    enterLabel: 'Enter sandbox',
  },
} as const satisfies Record<WorldId, WorldInfo>

/** the world a URL without a `?world` and without any world’s own parameters opens */
export const defaultWorld = 'gallery' satisfies WorldId

/** the URL parameters only one world reads, by that world, which open it without a `?world`: Knottingham’s, like `?shots`, and the Sandbox’s `?item` */
export const worldParameters = {
  knottingham: ['candidate', 'knot_id', 'model', 'shots', 'candidate_limit', 'candidate_order', 'rarity', 'rarity_filter'],
  sandbox: ['item'],
} as const satisfies Partial<Record<WorldId, ReadonlyArray<string>>>

/**
 * The world a URL query opens: the one `?world` names, otherwise the first whose own parameters, from `parameters`, it gives any of, otherwise the gallery.
 *
 * Self-contained, so the loading screen can run its source before any script loads.
 */
export function selectWorld(search: string, parameters: Partial<Record<WorldId, ReadonlyArray<string>>> = worldParameters): WorldId {
  const query = new URLSearchParams(search)
  // The world ids once more, as the loading screen runs this function without the module around it.
  const known: ReadonlyArray<WorldId> = ['gallery', 'knottingham', 'sandbox']
  const requested = known.find(id => id === query.get('world'))
  if (requested) {
    return requested
  }
  return known.find(id => parameters[id]?.some(parameter => query.has(parameter))) ?? 'gallery'
}

/** Read the world a URL opens, see {@link selectWorld}. */
export function readWorld(input: URL | string = typeof location === 'undefined' ? '' : location.href): WorldId {
  const url = new URL(input, 'http://localhost/')
  return selectWorld(url.search)
}

/** the world this page opens, read once at startup */
export const currentWorldId = readWorld()

/** the loading screen’s and the menu’s view of the world this page opens */
export const currentWorldInfo: WorldInfo = worlds[currentWorldId]
