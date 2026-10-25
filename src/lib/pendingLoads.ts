const sources = new Set<() => number>
let promises = 0

/** Counts background work beyond images and pipelines, like knot materials warming up, until the returned function stops counting it. */
export function trackPendingLoads(source: () => number) {
  sources.add(source)
  return () => {
    sources.delete(source)
  }
}

/** Counts a promise as one pending load until it settles. */
export function trackPendingPromise<T>(promise: Promise<T>) {
  promises++
  promise.finally(() => {
    promises--
  }).catch(() => {})
  return promise
}

/** background work that captures wait for, see {@link trackPendingLoads} and {@link trackPendingPromise} */
export function pendingLoads() {
  let count = promises
  for (const source of sources) {
    count += source()
  }
  return count
}
