import type Fusion from '../gallery/fusion/Fusion.ts'
import type {FusionSpec} from '../gallery/fusion/Fusion.ts'
import type {SizedImage} from '../gallery/ImageImporter.ts'
import type {Portrait, ThrownItem} from '../gallery/types.ts'
import type {AiSettings} from './settings.ts'
import type {Span} from 'victoria-browser-client'

import PortraitNarration from '../audio/PortraitNarration.ts'
import {arrivalFrame, loadBlob, notify} from '../gallery/actions.ts'
import FusionRecipe from '../gallery/fusion/FusionRecipe.ts'
import {openFusion} from '../gallery/fusion/fusions.ts'
import {encodeGeneratedImage, imageSize} from '../gallery/ImageImporter.ts'
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

  /** Makes the result of the fusion of `recipe`, asking the image model for the shape `aspect` (width divided by height) of the hung work, or locally without AI. */
  protected async generate(recipe: FusionRecipe, signal: AbortSignal, aspect: number): Promise<SizedImage> {
    if (!this.settings.ai || !this.key) {
      return recipe.local()
    }
    const {default: MergeGenerator} = await import('./MergeGenerator.ts')
    const mergeGenerator = new MergeGenerator(this.key, this.settings.image_model)
    const result = await mergeGenerator.generate(await recipe.content(), {
      aspect,
      signal,
    })
    return encodeGeneratedImage(result)
  }
  protected async generateFlavor(image: Blob, onPartial: (partial: Partial<Portrait>) => void, signal: AbortSignal): Promise<Partial<Portrait>> {
    const {default: FlavorGenerator} = await import('./FlavorGenerator.ts')
    const effort = ['high', 'low', 'medium', 'minimal', 'none'].includes(this.settings.text_model_effort) ? this.settings.text_model_effort : 'low'
    const flavorGenerator = new FlavorGenerator(this.key, tieredModel(this.settings.text_model, this.settings.ai_tier), effort as 'low')
    return flavorGenerator.generate(image, onPartial, signal)
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
    const recipe = new FusionRecipe({
      title: a.title,
      image: a.source,
    }, [
      {
        title: b.title,
        image: b.source,
      },
    ])
    const fusion = this.startFusion({
      work: a,
      partner: {
        kind: 'portrait',
        id: second,
      },
      ingredients: recipe.looks,
    })
    notify(this.settings.ai && this.key ? 'The alchemy is underway. Both originals stay safe until it succeeds.' : 'A local collage is taking shape. No AI and no upload.')
    try {
      await this.fuse(a, fusion, recipe, current, {
        canceled: 'You canceled the fusion. Both originals are still here.',
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

  /** Merges the hung work `portrait` with whatever the thrown `item` registers as an ingredient: a studio photograph of it by default, an orb’s prompt or nothing at all, which leaves the work as it was. The item stays in the room, unless a success uses it up, like an orb. */
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
    // Registered once the work is reserved, like a prop’s studio photograph, which is taken now.
    const addition = {
      title: item.title,
      ...item.ingredient(),
    }
    const recipe = new FusionRecipe({
      title: a.title,
      image: a.source,
    }, [addition])
    const fusion = this.startFusion({
      work: a,
      partner: {
        kind: 'prop',
        id: item.id,
        consumed: item.consumable ?? false,
      },
      ingredients: recipe.looks,
      color: recipe.color,
    })
    for (const look of recipe.pendingLooks) {
      void look.then(image => fusion.addIngredient(image), () => {})
    }
    if (recipe.unchanged) {
      notify(`The ${item.title} brings nothing to fuse “${a.title}” with. It will come back as it went in.`)
    } else {
      notify(this.settings.ai && this.key ? `The alchemy is underway. “${a.title}” stays safe until it succeeds.` : `A local ${recipe.handmade} is taking shape. No AI and no upload.`)
    }
    try {
      await this.fuse(a, fusion, recipe, current, {
        canceled: 'You canceled the fusion. The original is still here.',
        consume: item.consumable ? item.id : undefined,
        description: addition.image === undefined ? `“${a.title}” caught the ${item.title} and was never quite the same.` : `“${a.title}” was struck by ${item.title}. Neither had planned to share a frame.`,
        failure: 'The fusion did not finish. The original is still here. Check the image model or try again.',
      })
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
   * Makes the result of `recipe` while `fusion` shows it and, if `current` still holds afterward, replaces the hung work `a` with it, dropping the work `remove` and using up the prop `consume`.
   * Where nothing but `a` registered anything, there is nothing to merge it with and no image model to ask: `a` itself comes back out of the portal as it went in.
   * The result flips out of the portal as a loose work once the fusion’s climax is over; a failure shows once the fusion fizzled out, like one the player broke off by jumping into its portal, which gives up on the image at once.
   * A new image’s frame takes its shape, whatever the model made of the shape it was asked for, at the area of `a`’s frame. The result is framed by the frame design an ingredient brought, otherwise by the room it arrives in.
   */
  private async fuse(a: Portrait, fusion: Fusion, recipe: FusionRecipe, current: () => boolean, {canceled, consume, description, failure, remove}: {
    /** the notice right as the player breaks the fusion off */
    canceled: string
    /** the id of a prop the success uses up */
    consume?: string
    /** how the description of a new work tells how it came to be */
    description: string
    failure: string
    remove?: string
  }) {
    // The fizzle the player saw coming on breaking the fusion off goes without a notice of its own.
    const failed = async () => {
      if (current()) {
        await fusion.fail()
        if (current() && !fusion.signal.aborted) {
          notify(failure)
        }
      }
    }
    // Broken off, the fusion tells so at once and stops waiting, even for a merge that doesn’t listen to the signal.
    const broken = Promise.withResolvers<never>()
    const breakOff = () => {
      if (current()) {
        notify(canceled)
      }
      broken.reject(fusion.signal.reason)
    }
    fusion.signal.addEventListener('abort', breakOff, {once: true})
    let merged: Pick<Portrait, 'height' | 'source' | 'width'> | undefined
    if (!recipe.unchanged) {
      try {
        // Image models take 15–40 s for most merges, but now and then over 100 s.
        const signal = AbortSignal.any([this.controller.signal, fusion.signal, AbortSignal.timeout(180_000)])
        const generate = async (span?: Span) => {
          const {image, width, height} = await this.generate(recipe, signal, a.width / a.height)
          span?.setAttributes({
            width,
            height,
          })
          validateImage(image)
          return {
            source: image,
            ...imageSize(width, height, a.width * a.height * 10_000),
          }
        }
        merged = await Promise.race([telemetry ? telemetry.wrap('gallery.merge', generate, {attributes: {
          mode: this.settings.ai && this.key ? 'ai' : 'local',
          aspect: a.width / a.height,
          ingredients: recipe.ingredients.length,
        }}) : generate(), broken.promise])
      } catch {
        await failed()
        return
      }
      if (!current()) {
        return
      }
    }
    await fusion.succeed(merged?.source ?? a.source)
    if (!current()) {
      return
    }
    // Broken off while the result was still being decoded.
    if (fusion.outcome?.kind !== 'success') {
      await failed()
      return
    }
    const launch = fusion.launch()
    // It flips out of the portal loose, for the player to hang wherever they like, framed by an ingredient or by the room the portal releases it into.
    const released: Portrait = {
      ...a,
      ...launch,
      frame: recipe.frame ?? arrivalFrame(launch.position, a.position),
      merging: false,
      mergeJob: undefined,
      flavorJob: undefined,
      pending: false,
      hung: false,
      wallId: undefined,
      labelAbove: undefined,
      orientation: undefined,
    }
    const mergedAt = new Date
    // A new work, unless it is the work itself.
    const result: Portrait = merged ? {
      ...released,
      ...merged,
      narration: undefined,
      imported: true,
      title: 'An unexpected collaboration',
      creator: 'You · accidental alchemist',
      year: mergedAt.getFullYear(),
      description: `${description} ${this.settings.ai && this.key ? 'An AI-assisted collaboration.' : recipe.localDescription}`.slice(0, 5000),
    } : released
    const state = useGallery.getState()
    // The result arrives seconds after the throw; whatever the player carries by then stays in hand.
    const {held, placement} = state
    try {
      state.commit(state.portraits.filter(p => p.id !== remove).map(p => (p.id === a.id ? result : p)))
    } catch {
      notify(failure)
      return
    }
    // A prop the success uses up is gone, unless the player caught it again before the portal took hold of it.
    useGallery.setState(({consumed}) => ({
      held,
      placement,
      consumed: consume && held !== consume ? [...consumed, consume] : consumed,
    }))
    fusion.emerge()
    if (!merged) {
      notify(`“${a.title}” came back as it went in.`)
      return
    }
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
