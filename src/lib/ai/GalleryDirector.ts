import type {Portrait} from '../gallery/types.ts'
import type {AiSettings} from './settings.ts'

import Narrator from '../audio/Narrator.ts'
import {chime, loadBlob, notify} from '../gallery/actions.ts'
import {compositeImages, fitGeneratedImage} from '../gallery/ImageImporter.ts'
import {useGallery} from '../gallery/store.ts'
import {telemetry} from '../telemetry/index.ts'

export default class GalleryDirector {
  readonly narrator: Narrator
  private controller = new AbortController
  private flavors = new Map<string, symbol>
  private merges = new Map<string, symbol>

  constructor(private settings: AiSettings, private key: string) {
    this.narrator = new Narrator(settings, key)
  }

  dispose() {
    this.controller.abort()
    this.narrator.dispose()
    for (const [id, token] of this.merges) {
      this.releaseMerge(id, token)
    }
    for (const [id, token] of this.flavors) {
      if (useGallery.getState().portraits.some(p => p.id === id && p.flavorJob === token)) {
        useGallery.getState().update(id, {
          pending: false,
          flavorJob: undefined,
        })
      }
    }
    this.flavors.clear()
  }

  async flavor(portrait: Portrait) {
    if (this.controller.signal.aborted) {
      return
    }
    if (!this.settings.ai || !this.key) {
      this.narrator.ready(portrait.id)
      return
    }
    const token = Symbol(portrait.id)
    this.flavors.set(portrait.id, token)
    const source = portrait.source
    const current = () => !this.controller.signal.aborted && this.flavors.get(portrait.id) === token && useGallery.getState().portraits.some(p => p.id === portrait.id && p.source === source && p.pending && p.flavorJob === token)
    useGallery.getState().update(portrait.id, {
      pending: true,
      flavorJob: token,
    })
    try {
      const update = (partial: Partial<Portrait>) => {
        if (!current()) {
          return
        }
        const patch: Partial<Portrait> = {}
        if (typeof partial.title === 'string' && partial.title.trim()) {
          patch.title = partial.title.slice(0, 300)
        }
        if (typeof partial.creator === 'string' && partial.creator.trim()) {
          patch.creator = partial.creator.slice(0, 200)
        }
        if (typeof partial.description === 'string' && partial.description.trim()) {
          patch.description = partial.description.slice(0, 5000)
        }
        if (typeof partial.year === 'number' && Number.isSafeInteger(partial.year)) {
          patch.year = partial.year
        }
        useGallery.getState().update(portrait.id, patch)
      }
      const generate = async () => this.generateFlavor(await loadBlob(source), update, AbortSignal.any([this.controller.signal, AbortSignal.timeout(90_000)]))
      update(await (telemetry ? telemetry.trace('gallery.ai.flavor', generate, {model: this.settings.text_model}) : generate()))
    } catch {
      if (current()) {
        notify('The curator is unavailable. Your artwork is safe; you can edit its label in Collection.')
      }
    } finally {
      if (current()) {
        useGallery.getState().update(portrait.id, {
          pending: false,
          flavorJob: undefined,
        })
        this.narrator.ready(portrait.id)
      }
      if (this.flavors.get(portrait.id) === token) {
        this.flavors.delete(portrait.id)
        if (useGallery.getState().portraits.some(p => p.id === portrait.id && p.flavorJob === token)) {
          useGallery.getState().update(portrait.id, {flavorJob: undefined})
        }
      }
    }
  }

  protected async generateFlavor(image: Blob, onPartial: (partial: Partial<Portrait>) => void, signal: AbortSignal): Promise<Partial<Portrait>> {
    const {default: FlavorGenerator} = await import('./FlavorGenerator.ts')
    const effort = ['none', 'minimal', 'low', 'medium', 'high'].includes(this.settings.text_model_effort) ? this.settings.text_model_effort : 'low'
    return new FlavorGenerator(this.key, this.settings.text_model, effort as 'low').generate(image, onPartial, signal)
  }
  protected async generateMerge(first: Portrait['source'], second: Portrait['source'], signal: AbortSignal, aspect: number) {
    if (!this.settings.ai || !this.key) {
      return compositeImages(first, second)
    }
    const {default: MergeGenerator} = await import('./MergeGenerator.ts')
    const [hanging, thrown] = await Promise.all([loadBlob(first), loadBlob(second)])
    const result = await new MergeGenerator(this.key, this.settings.image_model).generate(hanging, thrown, signal)
    return fitGeneratedImage(result, aspect)
  }

  async merge(first: string, second: string) {
    if (this.controller.signal.aborted) {
      return
    }
    const s = useGallery.getState()
    const a = s.portraits.find(p => p.id === first)
    const b = s.portraits.find(p => p.id === second)
    if (!a?.hung || !b || b.hung || first === second || a.merging || b.reserved || this.merges.has(first) || this.merges.has(second)) {
      return
    }
    const token = Symbol('merge')
    this.merges.set(first, token)
    this.merges.set(second, token)
    s.update(first, {
      merging: true,
      mergeJob: token,
      pending: false,
    })
    s.update(second, {
      reserved: true,
      mergeJob: token,
      pending: false,
    })
    const current = () => {
      const portraits = useGallery.getState().portraits
      return !this.controller.signal.aborted && portraits.some(p => p.id === first && p.source === a.source && p.merging && p.mergeJob === token) && portraits.some(p => p.id === second && p.source === b.source && p.reserved && p.mergeJob === token)
    }
    notify(this.settings.ai && this.key ? 'The alchemy is underway. Both originals stay safe until it succeeds.' : 'A local collage is taking shape. No AI and no upload.')
    try {
      const generate = () => this.generateMerge(a.source, b.source, AbortSignal.any([this.controller.signal, AbortSignal.timeout(120_000)]), a.width / a.height)
      const merged = await (telemetry ? telemetry.trace('gallery.merge', generate, {mode: this.settings.ai && this.key ? 'ai' : 'local'}) : generate())
      if (!current()) {
        return
      }
      const result: Portrait = {
        ...a,
        source: merged,
        narration: undefined,
        merging: false,
        mergeJob: undefined,
        flavorJob: undefined,
        pending: false,
        imported: true,
        title: 'An unexpected collaboration',
        creator: 'You · accidental alchemist',
        year: (new Date).getFullYear(),
        description: `“${a.title}” met “${b.title}”. Neither had planned to share a frame. ${this.settings.ai && this.key ? 'An AI-assisted collaboration.' : 'A locally made cut-paper collage, joined with a little gold.'}`.slice(0, 5000),
      }
      const state = useGallery.getState()
      state.commit(state.portraits.filter(p => p.id !== second).map(p => p.id === first ? result : p))
      chime(900)
      notify('Something wonderfully unexpected. Undo will bring both originals back.')
      void this.flavor(result).catch(() => notify('The label could not be prepared.'))
    } catch {
      if (current()) {
        notify('The fusion did not finish. Both originals are still here. Check the image model or try again.')
      }
    } finally {
      // One original may have been removed mid-request. Release the survivor as well.
      this.releaseMerge(first, token)
      this.releaseMerge(second, token)
      if (!this.controller.signal.aborted) {
        this.narrator.ready(first)
      }
    }
  }

  private releaseMerge(id: string, token: symbol) {
    if (this.merges.get(id) !== token) {
      return
    }
    this.merges.delete(id)
    if (useGallery.getState().portraits.some(p => p.id === id && p.mergeJob === token)) {
      useGallery.getState().update(id, {
        merging: false,
        reserved: false,
        mergeJob: undefined,
      })
    }
  }
}
