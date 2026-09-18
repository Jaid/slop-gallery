import type {AiSettings} from '../ai/settings.ts'
import type {Portrait} from '../gallery/types.ts'
import type {AudioHandle, Narrator} from 'use-narrator/core'

import {SpeechCache} from 'use-narrator/core'

import NarrationGenerator from '../ai/NarrationGenerator.ts'
import {notify} from '../gallery/actions.ts'
import {useGallery} from '../gallery/store.ts'
import {intro} from './intro.ts'
import {narrator} from './narration.ts'

type Story = Pick<Portrait, 'description' | 'id' | 'title'> & Partial<Pick<Portrait, 'merging' | 'narration' | 'pending' | 'source'>>
type Request = {
  controller: AbortController
  handle?: AudioHandle
  story?: Story
}
function storyFor(id: string): Story | undefined {
  return id === intro.id ? intro : useGallery.getState().portraits.find(p => p.id === id)
}
const transcriptFor = (story: Story) => `${story.title.replace(/[!.?]$/, '')}. ${story.description.trim()}${/[!.?]$/.test(story.description.trim()) ? '' : '.'}`
function waitForStory(id: string, signal: AbortSignal): Promise<Story> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    const abort = () => {
      unsubscribe()
      signal.removeEventListener('abort', abort)
      reject(signal.reason)
    }
    const check = () => {
      const story = storyFor(id)
      if (!story) {
        unsubscribe()
        signal.removeEventListener('abort', abort)
        reject(new Error('The artwork no longer exists.'))
      } else if (!story.pending && !story.merging) {
        unsubscribe()
        signal.removeEventListener('abort', abort)
        resolve(story)
      }
    }
    unsubscribe = useGallery.subscribe(check)
    signal.addEventListener('abort', abort, {once: true})
    if (signal.aborted) {
      abort()
    } else {
      check()
    }
  })
}

/** Portrait-specific label readiness and generation policy; no audio elements, UI state or playback scheduling. */
export default class PortraitNarration {
  private cache: SpeechCache
  private lifetime = new AbortController
  private requests = new Map<string, Request>
  private unsubscribe: () => void

  constructor(private readonly settings: AiSettings, private readonly key: string, private readonly target: Narrator = narrator) {
    const generator = new NarrationGenerator(key, settings.audio_model, settings.narrator_voice)
    this.cache = new SpeechCache((speech, signal) => generator.generate(speech.text, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(90_000)]),
      character: settings.narrator_character,
    }))
    this.unsubscribe = useGallery.subscribe(() => {
      for (const [id, request] of this.requests) {
        const current = storyFor(id)
        const previous = request.story
        if (!current || previous && (current.title !== previous.title || current.description !== previous.description || current.source !== previous.source || current.narration !== previous.narration || current.pending || current.merging)) {
          request.controller.abort('Artwork changed')
        }
      }
    })
  }

  dispose() {
    this.unsubscribe()
    this.stop()
    this.lifetime.abort()
    this.cache.dispose()
  }

  enqueue(id: string): AudioHandle | undefined {
    const story = storyFor(id)
    if (!story || !useGallery.getState().sound || this.lifetime.signal.aborted) {
      return
    }
    const existing = this.requests.get(id)
    if (existing?.handle && !existing.controller.signal.aborted && this.target.queue.has(existing.handle.id)) {
      return existing.handle
    }
    const request: Request = {controller: new AbortController}
    this.requests.set(id, request)
    const handle = this.target.push(async signal => {
      const ready = await waitForStory(id, signal)
      signal.throwIfAborted()
      request.story = ready
      const text = transcriptFor(ready)
      return ready.narration ? {
        audio: ready.narration,
        title: ready.title,
        text,
      } : {
        text,
        title: ready.title,
        rate: 0.91,
        synthesize: this.settings.ai && this.key ? this.cache.synthesize : 'browser' as const,
      }
    }, {
      id,
      title: story.title,
      key: `portrait:${id}`,
      signal: AbortSignal.any([this.lifetime.signal, request.controller.signal]),
    })
    request.handle = handle
    void handle.finished.then(() => {
      if (this.requests.get(id) === request) {
        this.requests.delete(id)
      }
    })
    if (story.pending || story.merging) {
      notify('The narrator is waiting for the ink to dry…')
    }
    return handle
  }

  /** Waiting jobs observe label completion directly. This hook is only for optional eager generation. */
  ready(id: string) {
    const story = storyFor(id)
    if (!story || !this.settings.eager_audio || !this.settings.ai || !this.key || !useGallery.getState().sound || story.narration || story.pending || story.merging || this.lifetime.signal.aborted) {
      return
    }
    void this.cache.synthesize({
      text: transcriptFor(story),
      rate: 0.91,
    }, this.lifetime.signal).catch(() => {
      if (!this.lifetime.signal.aborted) {
        notify('The story could not be prepared.')
      }
    })
  }

  stop() {
    for (const request of this.requests.values()) {
      request.controller.abort()
    }
    this.requests.clear()
  }
}
