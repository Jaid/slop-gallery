/** the ids of every world, which also name their telemetry service */
export const worldIds = ['gallery', 'knottingham'] as const
export type WorldId = typeof worldIds[number]
/** what the loading screen and the menu show of a world before it has loaded */
export type WorldInfo = {
  enterLabel: string
  /** the prefix of every key the world stores in the browser */
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
} as const satisfies Record<WorldId, WorldInfo>

/** the world a URL without a `?world` and without Knottingham’s parameters opens */
export const defaultWorld = 'gallery' satisfies WorldId

/** the URL parameters only Knottingham reads, which open it without a `?world` */
export const knottinghamParameters = ['candidate', 'knot_id', 'model', 'shots', 'candidate_limit', 'candidate_order', 'rarity', 'rarity_filter'] as const

/**
 * The world a URL query opens: the one `?world` names, otherwise Knottingham if any of its own parameters is given, otherwise the gallery.
 *
 * Self-contained, so the loading screen can run its source before any script loads.
 */
export function selectWorld(search: string, parameters: ReadonlyArray<string> = knottinghamParameters): WorldId {
  const query = new URLSearchParams(search)
  const requested = query.get('world')
  if (requested === 'gallery' || requested === 'knottingham') {
    return requested
  }
  return parameters.some(parameter => query.has(parameter)) ? 'knottingham' : 'gallery'
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
