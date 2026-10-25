import type {CameraBookmark, SpawnBookmark} from '#src/lib/gallery/types.ts'

/** named player poses for `?spawn` and for T in `?development`, see `src/lib/gallery/bookmarks.ts` */
export const spawnBookmarks: Array<SpawnBookmark> = []

/** named camera views for `?spawn` and `scripts/snap.ts --bookmark`, see `src/lib/gallery/bookmarks.ts` */
export const cameraBookmarks: Array<CameraBookmark> = []
