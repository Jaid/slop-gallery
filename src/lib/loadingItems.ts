/** lists the IDs of what a source is still loading */
export type LoadingSource = () => Iterable<string>

const sources = new Set<LoadingSource>
/** how many loads of each item started with {@link startLoading} are still running */
const running = new Map<string, number>

/** Lists what the source is still loading in {@link loadingItems} until the returned function stops listing it. */
export function trackLoadingItems(source: LoadingSource) {
  sources.add(source)
  return () => {
    sources.delete(source)
  }
}

/** Lists the item as loading until the returned function ends its load. */
export function startLoading(id: string) {
  running.set(id, (running.get(id) ?? 0) + 1)
  let ended = false
  return () => {
    if (ended) {
      return
    }
    ended = true
    const left = running.get(id)! - 1
    if (left) {
      running.set(id, left)
    } else {
      running.delete(id)
    }
  }
}

/** Lists the item as loading until the promise settles. */
export function trackLoadingPromise<T>(id: string, promise: Promise<T>) {
  promise.finally(startLoading(id)).catch(() => {})
  return promise
}

/** the IDs of everything still loading that would leave something out of the next frame, like artworks, pipelines, objects to stream in, shadow maps and Knot materials; captures wait for none to be left */
export function loadingItems() {
  const items = new Set(running.keys())
  for (const source of sources) {
    for (const id of source()) {
      items.add(id)
    }
  }
  return [...items]
}
