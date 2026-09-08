import {generateImage} from 'ai'

import ExternalGenerator from './ExternalGenerator.ts'

export default class extends ExternalGenerator {
  readonly model: Parameters<typeof generateImage>[0]['model']
  constructor(key: string, model: string) {
    super(key)
    this.model = this.provider.imageModel(model)
  }
  async generate(firstImage: Blob, secondImage: Blob, signal?: AbortSignal) {
    const images = await Promise.all([firstImage, secondImage].map(image => image.arrayBuffer()))
    const {image} = await generateImage({
      model: this.model,
      abortSignal: signal ?? AbortSignal.timeout(120_000),
      maxImagesPerCall: 1,
      prompt: {
        images,
        text: 'Please merge the provided images into a single result. It’s up to you to decide how to merge them. For example, if one image is a character and the other is a scene, you can place the character in the scene. If both images show a character, you could come up with a cool fusion of both of them or you could insert one character into the other’s scene or you could show them together – whatever makes sense to you. Feel free to be creative and artistic and come up with a result that is funny or interesting or clever or mind-blowing',
      },
    })
    const bytes = new Uint8Array(image.uint8Array)
    const blob = new Blob([bytes.buffer], {type: image.mediaType})
    return blob
  }
}
