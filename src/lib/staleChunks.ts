/** when the page last reloaded for a chunk that failed to load, in the tab’s session storage */
const reloadKey = 'slop-gallery-stale-chunk-reload'
/** milliseconds after such a reload within which another failure no longer reloads, so a chunk that is missing for good cannot loop */
const cooldown = 30_000
const readLastReload = () => {
  try {
    return Number(sessionStorage.getItem(reloadKey))
  } catch {
    return 0
  }
}
// Every file of a build is named by its content hash, and a deploy only serves its own. A page still running the previous build finds the chunks it loads on demand gone, like a room or a Knot material, so it reloads into the current build.
if (import.meta.env.PROD) {
  globalThis.addEventListener('vite:preloadError', event => {
    if (Date.now() - readLastReload() < cooldown) {
      return
    }
    try {
      sessionStorage.setItem(reloadKey, String(Date.now()))
    } catch {}
    event.preventDefault()
    location.reload()
  })
}
