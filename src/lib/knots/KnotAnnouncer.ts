import type {KnotEntry} from './types.ts'

import {knotAnnouncementPaths} from './announcements.ts'

export type AnnouncementAudio = {
  play: (url: string, signal: AbortSignal, title: string) => Promise<void>
  resolve: (id: string) => string | undefined
}

/** Latest inspection wins. Recordings are remembered only after playback finishes. */
export class KnotAnnouncer {
  private controller?: AbortController
  constructor(private readonly audio: AnnouncementAudio, readonly announcedCreators = new Set<string>, readonly announcedItems = new Set<string>) {}

  hasAnnounced(item: KnotEntry) {
    return this.announcedItems.has(knotAnnouncementPaths(item).item)
  }

  async announce(item: KnotEntry) {
    if (this.hasAnnounced(item)) {
      return
    }
    this.stop()
    const controller = new AbortController
    this.controller = controller
    const {signal} = controller
    const paths = knotAnnouncementPaths(item)
    try {
      const creator = this.audio.resolve(paths.creator)
      if (creator && !this.announcedCreators.has(paths.creator)) {
        await this.audio.play(creator, signal, item.modelTitle)
        if (signal.aborted) {
          return
        }
        this.announcedCreators.add(paths.creator)
      }
      const recording = this.audio.resolve(paths.item)
      if (!signal.aborted && recording) {
        await this.audio.play(recording, signal, item.title)
        if (!signal.aborted) {
          this.announcedItems.add(paths.item)
        }
      }
    } finally {
      if (this.controller === controller) {
        this.controller = undefined
      }
    }
  }

  stop() {
    this.controller?.abort()
    this.controller = undefined
  }
}
