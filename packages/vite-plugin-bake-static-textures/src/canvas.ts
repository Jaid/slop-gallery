import type {Canvas, SKRSContext2D} from '@napi-rs/canvas'

import {createCanvas} from '@napi-rs/canvas'
import {DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RGBAFormat, SRGBColorSpace, Texture, UnsignedByteType} from 'three/webgpu'
import {NotBakeableError} from 'vite-plugin-bake-core'

type TextureOptions = {
  anisotropy?: number
  color?: boolean
  mipmaps?: boolean
  name?: string
}
type Pixels = {
  data: Uint8Array
  height: number
  width: number
}
type Raster = TextureOptions & {
  draw: (context: SKRSContext2D) => void
  height: number
  width: number
}
const canvases = new WeakSet<object>
const owners = new WeakSet<object>
export const ownsCanvas = (value: object) => owners.has(value)

export function textureFromPixels({data, width, height}: Pixels, options: TextureOptions = {}) {
  validateSize(width, height)
  if (data.byteLength !== width * height * 4) {
    throw new RangeError('Canvas texture pixels must contain exactly width × height × 4 RGBA8 bytes.')
  }
  return configure(new DataTexture(data, width, height, RGBAFormat, UnsignedByteType), options)
}
export function renderCanvasTexture(options: Raster) {
  const surface = new ReadbackCanvas(options.width, options.height)
  options.draw(surface.context)
  // The canvas is serialized at build time; runtime hydration restores an ordinary canvas-backed Texture.
  const texture = configure(new Texture(surface.canvas as unknown as HTMLCanvasElement), options)
  owners.add(texture)
  return texture
}

export function readCanvas(value: object): Pixels | undefined {
  if (!canvases.has(value)) {
    return
  }
  const canvas = value as Canvas
  const {width, height} = canvas
  const {data} = canvas.getContext('2d').getImageData(0, 0, width, height)
  return {
    width,
    height,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  }
}

function validateSize(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 16_777_216) {
    throw new NotBakeableError('Canvas dimensions exceed the supported build-time raster budget.')
  }
}
function configure<T extends Texture>(texture: T, {color = true, mipmaps = true, anisotropy = 16, name = ''}: TextureOptions): T {
  texture.name = name
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace
  texture.flipY = true
  texture.premultiplyAlpha = false
  texture.generateMipmaps = mipmaps
  texture.magFilter = LinearFilter
  texture.minFilter = mipmaps ? LinearMipmapLinearFilter : LinearFilter
  texture.anisotropy = mipmaps ? anisotropy : 1
  texture.needsUpdate = true
  return texture
}

/** Build-only implementation of the synchronous canvas-textures surface contract. */
export class ReadbackCanvas {
  readonly canvas: Canvas
  readonly context: SKRSContext2D
  private disposed = false

  constructor(width: number, height: number) {
    validateSize(width, height)
    this.canvas = createCanvas(width, height)
    canvases.add(this.canvas)
    const context = this.canvas.getContext('2d')
    this.context = new Proxy(context, {
      get(target, key): unknown {
        if (key === 'fillText' || key === 'strokeText' || key === 'measureText' || key === 'drawImage') {
          throw new NotBakeableError('Font/image-dependent canvas recipes remain at runtime.')
        }
        const value: unknown = Reflect.get(target, key, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
      set(target, key, value) {
        return Reflect.set(target, key, value, target)
      },
    })
  }

  dispose() {
    this.disposed = true
    this.canvas.width = 0
    this.canvas.height = 0
  }

  read(): Pixels {
    if (this.disposed) {
      throw new Error('Cannot read a disposed canvas.')
    }
    const {width, height} = this.canvas
    const {data} = this.context.getImageData(0, 0, width, height)
    return {
      width,
      height,
      data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    }
  }
}
