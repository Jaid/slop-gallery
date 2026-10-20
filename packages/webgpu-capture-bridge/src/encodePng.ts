import type {FrameEncoder} from './types.ts'

const encodePng: FrameEncoder = async ({pixels, width, height}) => {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new TypeError('PNG capture encoding requires OffscreenCanvas. Provide an encode function elsewhere.')
  }
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not create a 2D canvas context for PNG capture encoding.')
  }
  context.putImageData(new ImageData(pixels, width, height), 0, 0)
  const image = await canvas.convertToBlob({type: 'image/png'})
  if (image.type !== 'image/png') {
    throw new Error('The browser could not encode the capture as PNG.')
  }
  return image
}

export default encodePng
