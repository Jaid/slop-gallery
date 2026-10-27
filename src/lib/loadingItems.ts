import {pendingLoads} from './pendingLoads.ts'
import {pendingImages} from './useArtworkTexture.ts'

/** describes what a source is still loading, one short entry each, like “12 pipelines compiling”, and nothing once it is done */
export type LoadingSource = () => ReadonlyArray<string>

/** one entry for a count of things still loading, or none for 0 */
export const counted = (count: number, description: string) => (count > 0 ? [`${count} ${description}`] : [])

const sources = new Set<LoadingSource>([
  () => counted(pendingImages(), 'artworks decoding'),
  () => counted(pendingLoads(), 'background loads'),
])

/** Lists what the source is still loading in {@link loadingItems} until the returned function stops listing it. */
export function trackLoadingItems(source: LoadingSource) {
  sources.add(source)
  return () => {
    sources.delete(source)
  }
}

/** everything still loading that would leave something out of the next frame, like artworks, pipelines, objects to stream in and shadow maps; captures wait for it to be empty */
export function loadingItems() {
  return [...sources].flatMap(source => source())
}
