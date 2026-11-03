import type {ImagePrompt} from '../gallery/fusion/FusionRecipe.ts'

import {generateImage} from 'ai'

import ExternalGenerator from './ExternalGenerator.ts'
import {requestedRatio} from './imageRatios.ts'

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
  /** Makes the result of a fusion from the prompt its recipe wrote of its ingredients’ images and instructions (`FusionRecipe.content`). */
  async generate(prompt: ImagePrompt, {aspect, signal}: EditOptions = {}) {
    const {image} = await generateImage({
      model: this.model,
      abortSignal: signal ?? AbortSignal.timeout(180_000),
      maxImagesPerCall: 1,
      // Without a ratio, a 3:2 work merged with a prop’s square photograph came back 4:3 from Nano Banana 2.1 and Grok and square from Sunburst (2026-11-01).
      aspectRatio: aspect === undefined ? undefined : requestedRatio(this.modelId, aspect),
      prompt,
    })
    const bytes = new Uint8Array(image.uint8Array)
    const blob = new Blob([bytes.buffer], {type: image.mediaType})
    return blob
  }
}
