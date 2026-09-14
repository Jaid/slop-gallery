import type {KnotCandidateData, KnotEntry} from './types.ts'

import {knotAnnouncementPaths, knotCandidateAnnouncementPath} from './announcements.ts'

export type AnnouncementAudio = {
  play: (url: string, signal: AbortSignal, title: string) => Promise<void>
  resolve: (id: string) => string | undefined
}

/** Latest announcement wins. Model and item recordings are remembered only after playback finishes. */
export default class KnotAnnouncer {
  private controller?: AbortController
  constructor(private readonly audio: AnnouncementAudio, readonly announcedModels = new Set<string>, readonly announcedItems = new Set<string>) {}

  async announce(item: KnotEntry, repeat = false) {
    if (!repeat && this.hasAnnounced(item)) {
      return
    }
    const paths = knotAnnouncementPaths(item)
    return this.play([
      ...this.announcedModels.has(paths.model) ? [] : [
        {
          id: paths.model,
          title: item.modelTitle,
          completed: this.announcedModels,
        },
      ],
      {
        id: paths.item,
        title: item.title,
        completed: this.announcedItems,
      },
    ])
  }

  /** Candidate surfaces explicitly replay the candidate name and do not mark any model as introduced. */
  announceCandidate(candidate: KnotCandidateData) {
    return this.play([
      {
        id: knotCandidateAnnouncementPath(candidate),
        title: candidate.title,
      },
    ])
  }

  /** Knot interaction introduces its author model once per session. */
  announceModel(item: KnotEntry) {
    const {model} = knotAnnouncementPaths(item)
    if (this.announcedModels.has(model)) {
      return
    }
    return this.play([
      {
        id: model,
        title: item.modelTitle,
        completed: this.announcedModels,
      },
    ])
  }

  hasAnnounced(item: KnotEntry) {
    return this.announcedItems.has(knotAnnouncementPaths(item).item)
  }

  hasAnnouncedModel(item: KnotEntry) {
    return this.announcedModels.has(knotAnnouncementPaths(item).model)
  }

  stop() {
    this.controller?.abort()
    this.controller = undefined
  }

  private async play(recordings: ReadonlyArray<{completed?: Set<string>
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
          recording.completed?.add(recording.id)
        }
      }
    } finally {
      if (this.controller === controller) {
        this.controller = undefined
      }
    }
  }
}
