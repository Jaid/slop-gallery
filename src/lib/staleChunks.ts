/** when the page last reloaded for a chunk that failed to load, in the tab’s session storage */
const reloadKey = 'slop-gallery-stale-chunk-reload'
/** what the page that reloaded leaves the next one to report, in the tab’s session storage, see {@link takeStaleChunkReload} */
const reportKey = 'slop-gallery-stale-chunk-report'
/** milliseconds after such a reload within which another failure no longer reloads, so a chunk that is missing for good cannot loop */
const cooldown = 30_000

/** a reload for a stale chunk, as the page that reloaded saw it */
export type StaleChunkReload = {
  /** when it reloaded, in Unix milliseconds */
  at: number
  /** the path of the chunk that failed to load, if known */
  chunk?: string
  /** the telemetry session the reload ended, if any */
  sessionId?: string
}

/** The session a reload ends, set by the telemetry, which this module must not import: it loads the world, whose chunks may be the stale ones. */
export const staleChunkReloads: {sessionId?: string} = {}

const readLastReload = () => {
  try {
    return Number(sessionStorage.getItem(reloadKey))
  } catch {
    return 0
  }
}
/** The path of the chunk in a failed dynamic import’s message, like “Failed to fetch dynamically imported module: https://…/assets/Forge-abc.js”, which names one of the build’s own files and nothing else. */
const chunkPath = (error: unknown) => {
  const url = Error.isError(error) ? /\bhttps?:\/\/\S+/u.exec(error.message)?.[0] : undefined
  return url ? URL.parse(url)?.pathname : undefined
}

/** The reload for a stale chunk that led to this page, once: it is gone after the first call. */
export function takeStaleChunkReload(): StaleChunkReload | undefined {
  try {
    const report = sessionStorage.getItem(reportKey)
    sessionStorage.removeItem(reportKey)
    return report ? JSON.parse(report) as StaleChunkReload : undefined
  } catch {}
}

// Every file of a build is named by its content hash, and a deploy only serves its own. A page still running the previous build finds the chunks it loads on demand gone, like a room or a Knot material, so it reloads into the current build.
if (import.meta.env.PROD) {
  globalThis.addEventListener('vite:preloadError', event => {
    const now = Date.now()
    if (now - readLastReload() < cooldown) {
      return
    }
    // Vite hands the failed import’s error over as the event’s payload.
    const chunk = chunkPath((event as Event & {payload?: unknown}).payload)
    const report: StaleChunkReload = {
      at: now,
      ...chunk ? {chunk} : {},
      ...staleChunkReloads.sessionId ? {sessionId: staleChunkReloads.sessionId} : {},
    }
    try {
      sessionStorage.setItem(reloadKey, String(now))
      sessionStorage.setItem(reportKey, JSON.stringify(report))
    } catch {}
    event.preventDefault()
    location.reload()
  })
}
