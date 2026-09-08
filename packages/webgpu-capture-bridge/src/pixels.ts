import type {CaptureFrameResult, RgbaFrame} from './types.ts'

export const validateSize = (width: number, height: number) => {
  if (!Number.isSafeInteger(width) || width < 1 || !Number.isSafeInteger(height) || height < 1 || !Number.isSafeInteger(width * height * 4)) {
    throw new RangeError(`Invalid capture size: ${width}×${height}.`)
  }
}

export const unpackRgba = (input: Uint8Array, width: number, height: number): RgbaFrame => {
  validateSize(width, height)
  const rowBytes = width * 4
  const packedBytes = rowBytes * height
  const paddedRowBytes = Math.ceil(rowBytes / 256) * 256
  const minimumPaddedBytes = (height - 1) * paddedRowBytes + rowBytes
  let sourceRowBytes: number
  if (input.byteLength === packedBytes) {
    sourceRowBytes = rowBytes
  } else if (input.byteLength === minimumPaddedBytes || input.byteLength === paddedRowBytes * height) {
    sourceRowBytes = paddedRowBytes
  } else {
    throw new Error(`Unexpected WebGPU readback size: ${input.byteLength} bytes for ${width}×${height} RGBA8.`)
  }
  const pixels = new Uint8ClampedArray(packedBytes)
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * sourceRowBytes
    pixels.set(input.subarray(sourceOffset, sourceOffset + rowBytes), y * rowBytes)
  }
  return {
    pixels,
    width,
    height,
  }
}

export const analyzeFrame = ({pixels, width, height}: RgbaFrame): Pick<CaptureFrameResult, 'centerPixel' | 'meanLuminance' | 'nonBlackFraction'> => {
  let luminanceTotal = 0
  let nonBlackCount = 0
  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index]!
    const g = pixels[index + 1]!
    const b = pixels[index + 2]!
    luminanceTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (r > 8 || g > 8 || b > 8) {
      nonBlackCount += 1
    }
  }
  const centerOffset = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4
  return {
    centerPixel: [pixels[centerOffset]!, pixels[centerOffset + 1]!, pixels[centerOffset + 2]!, pixels[centerOffset + 3]!],
    meanLuminance: luminanceTotal / (width * height),
    nonBlackFraction: nonBlackCount / (width * height),
  }
}
