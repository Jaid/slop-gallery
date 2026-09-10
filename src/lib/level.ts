import type {LevelId} from '#src/data/levels.ts'

export type GalleryLevel = LevelId

// Vite validates and replaces this with a literal; direct Bun imports default to the museum.
export const galleryLevel = (import.meta.env.GAME_LEVEL ?? 'gallery') as GalleryLevel
export const isKnottingham = galleryLevel === 'knottingham'
export const galleryTitle = isKnottingham ? 'Knottingham' : 'Slop Gallery'

// Keep existing local saves across level-ID renames.
export const galleryStorageKey = isKnottingham ? 'knot-gallery' : 'slop-gallery'
