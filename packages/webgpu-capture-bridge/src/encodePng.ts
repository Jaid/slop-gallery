import type {FrameEncoder} from './types.ts'

const encodePng: FrameEncoder = ({pixels, width, height}) => {
  if (typeof document === 'undefined') {
    throw new TypeError('PNG capture encoding requires a document. Provide an encode function outside the browser.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not create a 2D canvas context for PNG capture encoding.')
  }
  context.putImageData(new ImageData(pixels, width, height), 0, 0)
  const dataUrl = canvas.toDataURL('image/png')
  if (!dataUrl.startsWith('data:image/png')) {
    throw new Error('The browser could not encode the capture as PNG.')
  }
  return dataUrl
}

export default encodePng
