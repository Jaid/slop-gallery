import {generateImage} from 'ai'

import ExternalGenerator from './ExternalGenerator.ts'
import {requestedRatio} from './imageRatios.ts'
import modelImage from './modelImage.ts'

type EditOptions = {
  /** width divided by height of the hung work, which decides the ratio the model is asked for */
  aspect?: number
  signal?: AbortSignal
}

export default class extends ExternalGenerator {
  readonly model: Parameters<typeof generateImage>[0]['model']
  constructor(key: string, private readonly modelId: string) {
    super(key)
    this.model = this.provider.imageModel(modelId)
  }
  generate(firstImage: Blob, secondImage: Blob, options: EditOptions = {}) {
    return this.edit([firstImage, secondImage], 'Please merge the provided images into a single result. It’s up to you to decide how to merge them. For example, if one image is a character and the other is a scene, you can place the character in the scene. If both images show a character, you could come up with a cool fusion of both of them or you could insert one character into the other’s scene or you could show them together – whatever makes sense to you. Feel free to be creative and artistic and come up with a result that is funny or interesting or clever or mind-blowing', options)
  }
  /** Reworks the artwork `image` by the prompt of an orb thrown into it, which is a whole instruction of its own and sent verbatim. */
  generateFromOrb(image: Blob, prompt: string, options: EditOptions = {}) {
    return this.edit([image], prompt, options)
  }
  private async edit(sources: Array<Blob>, text: string, {aspect, signal}: EditOptions) {
    // Image models reject formats like JXL, which the default works come in, and the SDK would send them labeled as PNG.
    const images = await Promise.all(sources.map(image => modelImage(image)))
    const {image} = await generateImage({
      model: this.model,
      abortSignal: signal ?? AbortSignal.timeout(180_000),
      maxImagesPerCall: 1,
      // Without a ratio, a 3:2 work merged with a prop’s square photograph came back 4:3 from Nano Banana 2.1 and Grok and square from Sunburst (2026-11-01).
      aspectRatio: aspect === undefined ? undefined : requestedRatio(this.modelId, aspect),
      prompt: {
        images,
        text,
      },
    })
    const bytes = new Uint8Array(image.uint8Array)
    const blob = new Blob([bytes.buffer], {type: image.mediaType})
    return blob
  }
}
