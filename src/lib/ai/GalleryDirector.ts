import type Fusion from '../gallery/fusion/Fusion.ts'
import type {FusionSpec} from '../gallery/fusion/Fusion.ts'
import type {SizedImage} from '../gallery/ImageImporter.ts'
import type {Portrait, ThrownItem, ThrownOrb} from '../gallery/types.ts'
import type {AiSettings} from './settings.ts'
import type {Span} from 'victoria-browser-client'

import PortraitNarration from '../audio/PortraitNarration.ts'
import {loadBlob, notify} from '../gallery/actions.ts'
import {openFusion} from '../gallery/fusion/fusions.ts'
import {compositeImages, encodeGeneratedImage, imageSize, tintImage} from '../gallery/ImageImporter.ts'
import {validateImage} from '../gallery/imagePolicy.ts'
import {useGallery} from '../gallery/store.ts'
import {telemetry} from '../telemetry/index.ts'
import {tieredModel} from './settings.ts'

export default class GalleryDirector {
  readonly narrator: PortraitNarration
  private controller = new AbortController
  private flavors = new Map<string, symbol>
  /** the fusions showing this director’s merges */
  private fusions = new Set<Fusion>
  private merges = new Map<string, symbol>
  constructor(private settings: AiSettings, private key: string) {
    this.narrator = new PortraitNarration(settings, key)
  }

  dispose() {
    this.controller.abort()
    this.narrator.dispose()
    // Everything they hold snaps back before the merges let go of the works.
    for (const fusion of this.fusions) {
      fusion.abort()
    }
    this.fusions.clear()
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
      update(await (telemetry ? telemetry.wrap('gallery.ai.flavor', generate, {attributes: {model: tieredModel(this.settings.text_model, this.settings.ai_tier)}}) : generate()))
    } catch {
      if (current()) {
        notify('The curator is unavailable. Your artwork is safe.')
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
    const effort = ['high', 'low', 'medium', 'minimal', 'none'].includes(this.settings.text_model_effort) ? this.settings.text_model_effort : 'low'
    const flavorGenerator = new FlavorGenerator(this.key, tieredModel(this.settings.text_model, this.settings.ai_tier), effort as 'low')
    return flavorGenerator.generate(image, onPartial, signal)
  }
  /** Merges the hung work `first` with `second` into a new image, asking the image model for the shape `aspect` (width divided by height) of the hung work. */
  protected async generateMerge(first: Portrait['source'], second: Portrait['source'], signal: AbortSignal, aspect: number): Promise<SizedImage> {
    if (!this.settings.ai || !this.key) {
      return compositeImages(first, second)
    }
    const {default: MergeGenerator} = await import('./MergeGenerator.ts')
    const [hanging, thrown] = await Promise.all([loadBlob(first), loadBlob(second)])
    const mergeGenerator = new MergeGenerator(this.key, this.settings.image_model)
    const result = await mergeGenerator.generate(hanging, thrown, {
      aspect,
      signal,
    })
    return encodeGeneratedImage(result)
  }
  /** Reworks the hung work `work` by the orb’s prompt into a new image, asking the image model for the shape `aspect` (width divided by height) of the hung work. */
  protected async generateOrbMerge(work: Portrait['source'], orb: ThrownOrb, signal: AbortSignal, aspect: number): Promise<SizedImage> {
    if (!this.settings.ai || !this.key) {
      return tintImage(work, orb.color)
    }
    const {default: MergeGenerator} = await import('./MergeGenerator.ts')
    const mergeGenerator = new MergeGenerator(this.key, this.settings.image_model)
    const result = await mergeGenerator.generateFromOrb(await loadBlob(work), orb.prompt, {
      aspect,
      signal,
    })
    return encodeGeneratedImage(result)
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
    const fusion = this.startFusion({
      work: a,
      partner: {
        kind: 'portrait',
        id: second,
      },
      ingredients: [a.source, b.source],
    })
    notify(this.settings.ai && this.key ? 'The alchemy is underway. Both originals stay safe until it succeeds.' : 'A local collage is taking shape. No AI and no upload.')
    try {
      await this.fuse(a, fusion, (signal, aspect) => this.generateMerge(a.source, b.source, signal, aspect), current, {
        description: `“${a.title}” met “${b.title}”. Neither had planned to share a frame.`,
        failure: 'The fusion did not finish. Both originals are still here. Check the image model or try again.',
        remove: second,
      })
    } finally {
      this.endFusion(fusion)
      // One original may have been removed mid-request. Release the survivor as well.
      this.releaseMerge(first, token)
      this.releaseMerge(second, token)
      // dispose() can abort while the merge is awaited, which the narrowing from the early return above cannot see.
      if (!(this.controller.signal.aborted as boolean)) {
        this.narrator.ready(first)
      }
    }
  }

  /** Merges the hung work `portrait` with a studio photograph of the thrown `item` or, for an orb, reworks it by the orb’s prompt. The item stays in the room. */
  async mergeItem(portrait: string, item: ThrownItem) {
    if (this.controller.signal.aborted) {
      return
    }
    const s = useGallery.getState()
    const a = s.portraits.find(p => p.id === portrait)
    if (!a?.hung || a.merging || a.reserved || this.merges.has(portrait)) {
      return
    }
    const token = Symbol('merge')
    this.merges.set(portrait, token)
    s.update(portrait, {
      merging: true,
      mergeJob: token,
      pending: false,
    })
    const current = () => !this.controller.signal.aborted && useGallery.getState().portraits.some(p => p.id === portrait && p.source === a.source && p.merging && p.mergeJob === token)
    const orb = 'prompt' in item
    const fusion = this.startFusion({
      work: a,
      partner: {
        kind: 'prop',
        id: item.id,
      },
      ingredients: [a.source],
      color: orb ? item.color : undefined,
    })
    // An orb’s photograph only shows in the portal, and was taken in advance; anything else is photographed now, which is what the work merges with.
    const photograph = orb ? undefined : item.snapshot()
    if (photograph) {
      void photograph.then(image => fusion.addIngredient(image), () => {})
    } else if (orb) {
      fusion.addIngredient(item.photo)
    }
    notify(this.settings.ai && this.key ? `The alchemy is underway. “${a.title}” stays safe until it succeeds.` : `A local ${orb ? 'tint' : 'collage'} is taking shape. No AI and no upload.`)
    try {
      const failure = 'The fusion did not finish. The original is still here. Check the image model or try again.'
      await (orb ? this.fuse(a, fusion, (signal, aspect) => this.generateOrbMerge(a.source, item, signal, aspect), current, {
        description: `“${a.title}” caught the ${item.title} and was never quite the same.`,
        failure,
        locally: `Tinted by hand in the ${item.title}’s glow.`,
      }) : this.fuse(a, fusion, async (signal, aspect) => this.generateMerge(a.source, await photograph!, signal, aspect), current, {
        description: `“${a.title}” was struck by ${item.title}. Neither had planned to share a frame.`,
        failure,
      }))
    } finally {
      this.endFusion(fusion)
      this.releaseMerge(portrait, token)
      if (!(this.controller.signal.aborted as boolean)) {
        this.narrator.ready(portrait)
      }
    }
  }

  /** Opens the portal that shows a merge, which `endFusion` ends. */
  protected openFusion(spec: FusionSpec) {
    return openFusion(spec)
  }

  private endFusion(fusion: Fusion) {
    this.fusions.delete(fusion)
    fusion.finish()
  }

  /**
   * Generates the new image of the hung work `a` with `make` while `fusion` shows it and, if `current` still holds afterward, replaces `a` with the result, dropping the work `remove`.
   * The result flips out of the portal as a loose work once the fusion’s climax is over; a failure shows once the fusion fizzled out.
   * Its frame takes the shape of the image, whatever the model made of the shape it was asked for, at the area of `a`’s frame.
   */
  private async fuse(a: Portrait, fusion: Fusion, make: (signal: AbortSignal, aspect: number) => Promise<SizedImage>, current: () => boolean, {description, failure, locally = 'A locally made cut-paper collage, joined with a little gold.', remove}: {
    description: string
    failure: string
    /** how the description tells a merge made without AI */
    locally?: string
    remove?: string
  }) {
    let merged: Pick<Portrait, 'height' | 'width'> & {image: Blob}
    try {
      // Image models take 15–40 s for most merges, but now and then over 100 s.
      const generate = async (span?: Span) => {
        const {image, width, height} = await make(AbortSignal.any([this.controller.signal, AbortSignal.timeout(180_000)]), a.width / a.height)
        span?.setAttributes({
          width,
          height,
        })
        validateImage(image)
        return {
          image,
          ...imageSize(width, height, a.width * a.height * 10_000),
        }
      }
      merged = await (telemetry ? telemetry.wrap('gallery.merge', generate, {attributes: {
        mode: this.settings.ai && this.key ? 'ai' : 'local',
        aspect: a.width / a.height,
      }}) : generate())
    } catch {
      if (current()) {
        await fusion.fail()
        if (current()) {
          notify(failure)
        }
      }
      return
    }
    if (!current()) {
      return
    }
    await fusion.succeed(merged.image)
    if (!current()) {
      return
    }
    const mergedAt = new Date
    const result: Portrait = {
      ...a,
      ...fusion.launch(),
      source: merged.image,
      width: merged.width,
      height: merged.height,
      narration: undefined,
      merging: false,
      mergeJob: undefined,
      flavorJob: undefined,
      pending: false,
      imported: true,
      // It flips out of the portal loose, for the player to hang wherever they like.
      hung: false,
      wallId: undefined,
      labelAbove: undefined,
      orientation: undefined,
      title: 'An unexpected collaboration',
      creator: 'You · accidental alchemist',
      year: mergedAt.getFullYear(),
      description: `${description} ${this.settings.ai && this.key ? 'An AI-assisted collaboration.' : locally}`.slice(0, 5000),
    }
    const state = useGallery.getState()
    // The result arrives seconds after the throw; whatever the player carries by then stays in hand.
    const {held, placement} = state
    try {
      state.commit(state.portraits.filter(p => p.id !== remove).map(p => (p.id === a.id ? result : p)))
    } catch {
      notify(failure)
      return
    }
    useGallery.setState({
      held,
      placement,
    })
    fusion.emerge()
    notify('Something wonderfully unexpected.')
    void this.flavor(result).catch(() => notify('The label could not be prepared.'))
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

  private startFusion(spec: FusionSpec) {
    const fusion = this.openFusion(spec)
    this.fusions.add(fusion)
    return fusion
  }
}
