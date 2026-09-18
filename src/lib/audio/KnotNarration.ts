import type {KnotCandidateData, KnotEntry} from 'knot-materials/types.ts'
import type {AudioHandle, Narrator} from 'use-narrator/core'

import {knotAnnouncementPaths, knotCandidateAnnouncementPath} from 'knot-materials/announcements.ts'

type Options = {
  id: string
  repeat?: boolean
  signal?: AbortSignal
}

/** Knot-specific announcement selection only. Playback, deduplication and completion memory belong to Narrator. */
export default class KnotNarration {
  constructor(private readonly narrator: Narrator, private readonly resolve: (id: string) => string | undefined) {}

  enqueue(item: KnotEntry, options: Options): Array<AudioHandle> {
    const paths = knotAnnouncementPaths(item)
    return [
      this.recording(paths.model, item.modelTitle, {
        ...options,
        repeat: false,
      }),
      this.recording(paths.item, item.title, options),
    ].filter((handle): handle is AudioHandle => handle !== undefined)
  }

  enqueueCandidate(candidate: KnotCandidateData, options: Options) {
    const path = knotCandidateAnnouncementPath(candidate)
    const audio = this.resolve(path)
    if (!audio) {
      return
    }
    return this.narrator.push({
      audio,
      title: candidate.title,
    }, {
      id: options.id,
      signal: options.signal,
      key: path,
    })
  }

  enqueueModel(item: KnotEntry, options: Options) {
    return this.recording(knotAnnouncementPaths(item).model, item.modelTitle, {
      ...options,
      repeat: false,
    })
  }

  private recording(path: string, title: string, options: Options) {
    const audio = this.resolve(path)
    // Missing bundled narration stays silent: never start paid generation for a knot title.
    if (!audio) {
      return
    }
    return this.narrator.push({
      audio,
      title,
    }, {
      id: options.id,
      signal: options.signal,
      once: path,
      repeat: options.repeat,
    })
  }
}
