import type {KnotEntry} from './types.ts'

import {knotAnnouncementPaths} from './announcements.ts'

export type AnnouncementAudio = {
  play: (url: string, signal: AbortSignal, title: string) => Promise<void>
  resolve: (id: string) => string | undefined
}

/** Latest inspection wins. Recordings are remembered only after playback finishes. */
export default class KnotAnnouncer {
  private controller?: AbortController
  constructor(private readonly audio: AnnouncementAudio, readonly announcedCreators = new Set<string>, readonly announcedItems = new Set<string>) {}

  async announce(item: KnotEntry, repeat = false) {
    if (!repeat && this.hasAnnounced(item)) {
      return
    }
    const paths = knotAnnouncementPaths(item)
    return this.play([
      ...this.announcedCreators.has(paths.creator) ? [] : [
        {
          id: paths.creator,
          title: item.modelTitle,
          completed: this.announcedCreators,
        },
      ],
      {
        id: paths.item,
        title: item.title,
        completed: this.announcedItems,
      },
    ])
  }

  /** Billboards explicitly replay each displayed model version, never item titles. */
  announceCreators(items: ReadonlyArray<KnotEntry>) {
    const creators = new Map(items.map(item => {
      const id = knotAnnouncementPaths(item).creator
      return [
        id, {
          id,
          title: item.modelTitle,
          completed: this.announcedCreators,
        },
      ]
    }))
    return this.play([...creators.values()])
  }

  hasAnnounced(item: KnotEntry) {
    return this.announcedItems.has(knotAnnouncementPaths(item).item)
  }

  stop() {
    this.controller?.abort()
    this.controller = undefined
  }

  private async play(recordings: ReadonlyArray<{completed: Set<string>
    id: string
    title: string}>) {
    this.stop()
    const controller = new AbortController
    this.controller = controller
    const {signal} = controller
    try {
      for (const recording of recordings) {
        if (signal.aborted) {
          return
        }
        const url = this.audio.resolve(recording.id)
        if (url) {
          await this.audio.play(url, signal, recording.title)
          if (!signal.aborted) {
            recording.completed.add(recording.id)
          }
        }
      }
    } finally {
      if (this.controller === controller) {
        this.controller = undefined
      }
    }
  }
}
