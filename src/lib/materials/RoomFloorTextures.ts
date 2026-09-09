import type {DataTexture} from 'three/webgpu'

import {SimplexNoise} from 'three/addons/math/SimplexNoise.js'
import {MirroredRepeatWrapping, RepeatWrapping} from 'three/webgpu'

import {canvasTexture} from '#src/lib/texture.ts'

const random = (seed: number) => () => {
  seed = seed + 0x6D_2B_79_F5 | 0
  let value = Math.imul(seed ^ seed >>> 15, 1 | seed)
  value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value
  return ((value ^ value >>> 14) >>> 0) / 4_294_967_296
}
function canvas(size: number) {
  const result = document.createElement('canvas')
  result.width = result.height = size
  return result
}
function finish(source: HTMLCanvasElement, color = true) {
  const texture = canvasTexture(source, color)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}
/** Adapted from the ox_smart-gallery-webgpu reference: six board courses per 2.4 m tile. */
function wood() {
  const size = 512
  const color = canvas(size)
  const height = canvas(size)
  const context = color.getContext('2d')!
  const bump = height.getContext('2d')!
  const rng = random(777)
  const noise = new SimplexNoise({random: random(31)})
  context.fillStyle = '#6d4a2c'
  context.fillRect(0, 0, size, size)
  bump.fillStyle = '#909090'
  bump.fillRect(0, 0, size, size)
  const plankHeight = size / 6
  for (let row = 0; row < 6; row++) {
    const y = row * plankHeight
    const tone = 0.82 + rng() * 0.36
    context.fillStyle = `rgb(${109 * tone | 0},${74 * tone | 0},${44 * tone | 0})`
    context.fillRect(0, y, size, plankHeight)
    bump.fillStyle = tone > 1 ? '#a0a0a0' : '#808080'
    bump.fillRect(0, y, size, plankHeight)
    context.save()
    bump.save()
    // Grain belongs to its board, never the neighboring course.
    for (const target of [context, bump]) {
      target.beginPath()
      target.rect(0, y, size, plankHeight)
      target.clip()
    }
    for (let line = 0; line < 26; line++) {
      const gy = y + rng() * plankHeight
      const alpha = 0.04 + rng() * 0.09
      context.strokeStyle = rng() > 0.24 ? `rgba(40,22,10,${alpha})` : `rgba(220,180,130,${alpha * 0.7})`
      context.lineWidth = 0.6 + rng() * 1.4
      bump.strokeStyle = 'rgba(140,140,140,0.35)'
      bump.lineWidth = context.lineWidth
      context.beginPath()
      bump.beginPath()
      for (let x = 0; x <= size; x += 8) {
        // Blend the noise back to its origin at the tile edge for continuous grain.
        const wave = (noise.noise(x / 90, gy / 40) * (1 - x / size) + noise.noise((x - size) / 90, gy / 40) * x / size) * 2.4
        for (const target of [context, bump]) {
          if (x === 0) {
            target.moveTo(x, gy + wave)
          } else {
            target.lineTo(x, gy + wave)
          }
        }
      }
      context.stroke()
      bump.stroke()
    }
    context.restore()
    bump.restore()
    let x = rng() * size * 0.5
    while (x < size) {
      context.fillStyle = 'rgba(25,13,6,0.75)'
      context.fillRect(x, y, 2, plankHeight)
      bump.fillStyle = '#303030'
      bump.fillRect(x, y, 2, plankHeight)
      x += size * (0.3 + rng() * 0.4)
    }
    context.fillStyle = 'rgba(18,9,4,0.85)'
    context.fillRect(0, y + plankHeight - 1.6, size, 1.6)
    bump.fillStyle = '#282828'
    bump.fillRect(0, y + plankHeight - 1.6, size, 1.6)
  }
  const pixels = context.getImageData(0, 0, size, size)
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (rng() - 0.5) * 0.05 * 255
    for (let channel = 0; channel < 3; channel++) {
      pixels.data[i + channel]! += grain
    }
  }
  context.putImageData(pixels, 0, 0)
  return {
    map: finish(color),
    bumpMap: finish(height, false),
  }
}
function carpet() {
  const size = 256
  const color = canvas(size)
  const height = canvas(size)
  const context = color.getContext('2d')!
  const bump = height.getContext('2d')!
  const rng = random(31_337)
  const pixels = context.createImageData(size, size)
  const heights = bump.createImageData(size, size)
  for (let i = 0; i < pixels.data.length; i += 4) {
    const fiber = (rng() - 0.5) * 46
    pixels.data[i] = 95 + fiber + (rng() > 0.985 ? 40 : 0)
    pixels.data[i + 1] = pixels.data[i + 2] = 22 + fiber * 0.4
    pixels.data[i + 3] = heights.data[i + 3] = 255
    heights.data[i] = heights.data[i + 1] = heights.data[i + 2] = 128 + fiber * 2
  }
  context.putImageData(pixels, 0, 0)
  bump.putImageData(heights, 0, 0)
  const textures = {
    map: finish(color),
    bumpMap: finish(height, false),
  }
  for (const texture of Object.values(textures)) {
    texture.wrapS = texture.wrapT = MirroredRepeatWrapping
  }
  return textures
}

/** Maps are owned by one room mount; both color and relief use the same physical scale. */
export class RoomFloorTextures {
  readonly carpet = carpet()
  readonly wood = wood()

  constructor(width: number, depth: number, rugWidth: number, rugDepth: number) {
    this.tile(this.wood, width, depth, 2.4)
    this.tile(this.carpet, rugWidth, rugDepth, 1.8)
  }

  dispose() {
    for (const surface of [this.wood, this.carpet]) {
      for (const texture of Object.values(surface)) {
        texture.dispose()
      }
    }
  }

  private tile(surface: {bumpMap: DataTexture
    map: DataTexture}, width: number, depth: number, metersPerTile: number) {
    for (const texture of Object.values(surface)) {
      texture.repeat.set(width / metersPerTile, depth / metersPerTile)
    }
  }
}
