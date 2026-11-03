import type {PortraitFrameId} from '../../frames/frameParameter.ts'
import type {SizedImage} from '../ImageImporter.ts'

import modelImage from '../../ai/modelImage.ts'
import {loadBlob} from '../actions.ts'
import {compositeImages, tintImage} from '../ImageImporter.ts'

/** What an ingredient brings into a fusion, every part optional. An ingredient that registers nothing, like the Transparent Orb, adds nothing to the result. */
export type IngredientRegistration = {
  /** a glow, which tints the portal and, where the ingredient brings an instruction, stands in for it by tinting the result when it is made locally, without AI */
  color?: string
  /** the frame design the result wears wherever it arrives, instead of the frame of the room it arrives in */
  frame?: PortraitFrameId
  /** an image the result is made of, which the portal shows too unless the ingredient has a `look`; it may still be in the making, like a prop’s studio photograph */
  image?: Blob | Promise<Blob> | string
  /** an instruction to the image model about the result, sent verbatim */
  instruction?: string
  /** what the portal shows of the ingredient instead of its image, like an orb’s illustration made in advance; it never goes into the result */
  look?: string
}
/** an ingredient of a fusion: what it registered and what it is called */
export type FusionIngredient = IngredientRegistration & {
  /** what it is called, like a work’s title or “Spook Orb” */
  title: string
}
/** the prompt of an image model call: the images in a format image models take, and the text */
export type ImagePrompt = {
  images: Array<Uint8Array>
  text: string
}

/** the most ingredients a fusion takes, the hung work included */
export const maximumIngredients = 4
/** what the image model is asked to do when it gets several images to make one of, ahead of the ingredients’ instructions */
export const mergeInstruction = 'Please merge the provided images into a single result. It’s up to you to decide how to merge them. For example, if one image is a character and another one is a scene, you can place the character in the scene. If several images show a character, you could come up with a cool fusion of them or you could insert one character into another’s scene or you could show them together – whatever makes sense to you. Feel free to be creative and artistic and come up with a result that is funny or interesting or clever or mind-blowing'

/**
 * Everything the ingredients of a fusion registered, gathered into what its result is made of: the hung work first, whose portal it is and which the result replaces, then the works and items that came into it, 2 to {@link maximumIngredients} ingredients in all.
 * It decides whether there is anything for an image model to do at all, writes the model’s prompt or makes the result locally, without AI, and picks the frame and the glow the ingredients brought.
 */
export default class FusionRecipe {
  /** every ingredient, the hung work first */
  readonly ingredients: ReadonlyArray<FusionIngredient>

  constructor(readonly work: FusionIngredient & {image: Blob | string}, readonly additions: ReadonlyArray<FusionIngredient>) {
    if (additions.length < 1 || additions.length >= maximumIngredients) {
      throw new RangeError(`A fusion takes 2 to ${maximumIngredients} ingredients, not ${additions.length + 1}.`)
    }
    this.ingredients = [work, ...additions]
  }

  /** the glow of the first ingredient bringing one, which tints the portal; the portal’s own colors without one */
  get color() {
    return this.ingredients.find(ingredient => ingredient.color)?.color
  }

  /** the frame design of the first ingredient bringing one, which the result wears wherever it arrives; without one, the room it arrives in frames it */
  get frame() {
    return this.ingredients.find(ingredient => ingredient.frame)?.frame
  }

  /** how a result made locally, without AI, is made: a collage of several images, or a single image tinted by the glows standing in for the instructions */
  get handmade() {
    return this.imageCount > 1 ? 'collage' : 'tint'
  }

  /** how many of the ingredients bring an image the result is made of */
  get imageCount() {
    return this.ingredients.filter(ingredient => ingredient.image !== undefined).length
  }

  /** the ingredients’ instructions to the image model, in their order */
  get instructions() {
    return this.ingredients.map(ingredient => ingredient.instruction).filter(instruction => instruction !== undefined && instruction !== '')
  }

  /** how the description of a result made locally, without AI, tells how it was made */
  get localDescription() {
    const parts = this.imageCount > 1 ? ['A locally made cut-paper collage, joined with a little gold.'] : []
    for (const {title} of this.tints) {
      parts.push(`Tinted by hand in the ${title}’s glow.`)
    }
    return parts.join(' ')
  }

  /** what the portal shows of the ingredients right away, in their order: each one’s look, or its image where that is at hand already */
  get looks(): Array<Blob | string> {
    return this.ingredients.flatMap(({image, look}) => {
      const shown = look ?? image
      return shown === undefined || shown instanceof Promise ? [] : [shown]
    })
  }

  /** the images still in the making of ingredients without a look, which the portal shows once they are made */
  get pendingLooks(): Array<Promise<Blob>> {
    return this.ingredients.flatMap(({image, look}) => (look === undefined && image instanceof Promise ? [image] : []))
  }

  /** the ingredients whose glow stands in for their instruction when the result is made locally, without AI */
  get tints() {
    return this.ingredients.filter((ingredient): ingredient is FusionIngredient & {color: string} => Boolean(ingredient.color && ingredient.instruction))
  }

  /** whether nothing but the hung work registered anything, its own image, which leaves nothing to merge it with: no image model is asked, and the work comes back out of the portal as it went in */
  get unchanged() {
    return this.additions.every(addition => addition.image === undefined && !addition.instruction)
  }

  /** The image model’s prompt: every image of the ingredients in their order, re-encoded where image models reject its format, and the text, which is the merge instruction where there are several images, followed by the ingredients’ instructions. */
  async content(): Promise<ImagePrompt> {
    const sources = await this.images()
    // Image models reject formats like JXL, which the default works come in.
    const images = await Promise.all(sources.map(async source => modelImage(await loadBlob(source))))
    return {
      images,
      text: this.text(images.length),
    }
  }

  /** The images the result is made of, in the order of their ingredients, once all of them are made. */
  async images() {
    return Promise.all(this.ingredients.flatMap(({image}) => (image === undefined ? [] : [image])))
  }

  /** Makes the result locally, without AI: a collage of the images, tinted by every glow that stands in for an instruction. Throws where there is nothing to make by hand, like a lone instruction without a glow. */
  async local(): Promise<SizedImage> {
    const sources = await this.images()
    let result = sources.length > 1 ? await compositeImages(sources) : undefined
    for (const {color} of this.tints) {
      result = await tintImage(result?.image ?? sources[0], color)
    }
    if (!result) {
      throw new Error('Nothing in this fusion can be made without AI.')
    }
    return result
  }

  /** the text of the image model’s prompt for `images` images */
  text(images: number) {
    return [...images > 1 ? [mergeInstruction] : [], ...this.instructions].join('\n\n')
  }
}
