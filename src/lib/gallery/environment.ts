import type {LightingPreset} from './lighting.ts'
import type {CanvasTexture} from 'three/webgpu'

import renderCanvasTexture from 'canvas-textures/three'
import {EquirectangularReflectionMapping, SRGBColorSpace} from 'three/webgpu'

/** A blank canvas for the gallery’s reflection environment, which {@link drawEnvironment} paints. */
export function createEnvironment() {
  const texture = renderCanvasTexture({
    width: 1024,
    height: 512,
    draw: () => {},
  }) as CanvasTexture
  texture.mapping = EquirectangularReflectionMapping
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** Paints the reflection environment: a vertical gradient with four bright light boxes in its upper band. */
export function drawEnvironment(texture: CanvasTexture, stops: LightingPreset['environment']['gradient'], lightBoxes: string) {
  const canvas = texture.image as HTMLCanvasElement | OffscreenCanvas
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  const gradient = context.createLinearGradient(0, 0, 0, 512)
  for (const [index, offset] of [0, 0.4, 0.55, 1].entries()) {
    gradient.addColorStop(offset, stops[index])
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 512)
  context.fillStyle = lightBoxes
  for (let i = 0; i < 4; i++) {
    context.fillRect(i * 256 + 35, 50, 90, 100)
  }
  texture.needsUpdate = true
  texture.needsPMREMUpdate = true
}
