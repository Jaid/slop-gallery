import type {KnotCandidateData, KnotEntry} from 'knot-materials/types.ts'
import type {AudioHandle, NarrationReference, Narrator} from 'use-narrator/core'

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
    ]
  }

  enqueueCandidate(candidate: KnotCandidateData, options: Options) {
    const path = knotCandidateAnnouncementPath(candidate)
    return this.narrator.push(this.announcement(path, candidate.title), {
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

  /** The bundled recording, or the browser’s voice where the build left it out (see VOICE_SAMPLES in vite.config.ts); never paid generation for a Knot’s title. */
  private announcement(path: string, title: string): NarrationReference {
    const audio = this.resolve(path)
    if (audio) {
      return {
        audio,
        title,
      }
    }
    return {
      text: title,
      title,
      synthesize: 'browser',
    }
  }

  private recording(path: string, title: string, options: Options) {
    return this.narrator.push(this.announcement(path, title), {
      id: options.id,
      signal: options.signal,
      once: path,
      repeat: options.repeat,
    })
  }
}
