import type {LevelId} from '#src/data/levels.ts'

import levels from '#src/data/levels.ts'

export type GalleryLevel = LevelId

// Vite validates and replaces this with a literal; direct Bun imports default to the museum.
export const galleryLevel = (import.meta.env.GAME_LEVEL ?? 'gallery') as GalleryLevel
export const isGallery = galleryLevel === 'gallery'
export const isKnottingham = galleryLevel === 'knottingham'
export const isSoundboard = galleryLevel === 'soundboard'
const level = levels[galleryLevel]
export const galleryTitle = level.title
export const galleryStorageKey = level.storageKey
export const galleryTagline = level.tagline
export const galleryEnterLabel = level.enterLabel
export const gallerySupportsMap = level.supportsMap
