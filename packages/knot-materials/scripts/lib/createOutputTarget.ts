import {RenderTarget, UnsignedByteType} from 'three/webgpu'

/**
 * Raw byte destination for setOutputRenderTarget. The output pass already applies
 * the display transfer function. An sRGB texture format would encode those bytes
 * a second time in hardware. NoColorSpace here describes storage, not PNG color.
 */
export const createOutputTarget = (width: number, height = width) => new RenderTarget(width, height, {
  type: UnsignedByteType,
  samples: 4,
})
