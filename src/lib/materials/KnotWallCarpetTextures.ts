import type {Texture} from 'three/webgpu'

import renderCanvasTexture, {textureFromPixels} from 'canvas-textures/three'
import {RepeatWrapping} from 'three/webgpu'

type CarpetTextures = {
  color: Texture
  normal: Texture
}

const colorSize = 2048
const normalSize = 1024
const repeatX = 3.2
const repeatY = 2.2
function createRandom(seed: number) {
  return () => {
    seed = seed + 0x6D_2B_79_F5 >>> 0
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296
  }
}
function repeatTexture(texture: Texture) {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return texture
}
function createOxbloodCarpetColor() {
  const random = createRandom(0x0B_10_0D)
  return repeatTexture(renderCanvasTexture({
    anisotropy: 16,
    height: colorSize,
    name: 'knottingham-wall-carpet-color',
    width: colorSize,
    draw(context) {
      context.fillStyle = '#7a1c27'
      context.fillRect(0, 0, colorSize, colorSize)
      // Soft tonal clumps keep the surface from reading as uniformly painted.
      for (let i = 0; i < 11_000; i++) {
        const x = random() * colorSize
        const y = random() * colorSize
        const radiusX = 3 + random() * 18
        const radiusY = 2 + random() * 10
        const light = random() > 0.52
        context.fillStyle = light ? `rgba(190, 58, 71, ${0.008 + random() * 0.018})` : `rgba(35, 3, 9, ${0.008 + random() * 0.024})`
        context.beginPath()
        context.ellipse(x, y, radiusX, radiusY, random() * Math.PI, 0, Math.PI * 2)
        context.fill()
      }
      // Dense short strands create the carpet nap. Most strands share a loose
      // horizontal bias, with enough angle variation to avoid brushed-plaster streaks.
      context.lineCap = 'round'
      for (let i = 0; i < 165_000; i++) {
        const x = random() * colorSize
        const y = random() * colorSize
        const length = 2 + random() * 7
        const angle = (random() - 0.5) * 0.9
        const halfX = Math.cos(angle) * length * 0.5
        const halfY = Math.sin(angle) * length * 0.5
        const highlight = random() > 0.43
        context.strokeStyle = highlight ? `rgba(${132 + Math.floor(random() * 42)}, ${18 + Math.floor(random() * 12)}, ${31 + Math.floor(random() * 17)}, ${0.055 + random() * 0.075})` : `rgba(${43 + Math.floor(random() * 30)}, ${4 + Math.floor(random() * 8)}, ${10 + Math.floor(random() * 10)}, ${0.04 + random() * 0.065})`
        context.lineWidth = 0.7 + random() * 0.75
        context.beginPath()
        context.moveTo(x - halfX, y - halfY)
        context.lineTo(x + halfX, y + halfY)
        context.stroke()
      }
      // Pixel-scale flecks survive mipmapping as fine textile grain without a
      // canvas readback, which would force the color texture onto the CPU path.
      for (let i = 0; i < 150_000; i++) {
        const light = random() > 0.5
        context.fillStyle = light ? `rgba(224, 112, 118, ${0.025 + random() * 0.035})` : `rgba(22, 1, 5, ${0.025 + random() * 0.04})`
        context.fillRect(random() * colorSize, random() * colorSize, 1, 1)
      }
    },
  }))
}
function createOxbloodCarpetNormal() {
  const random = createRandom(0xCA_4F_E7)
  const data = new Uint8Array(normalSize * normalSize * 4)
  for (let y = 0; y < normalSize; y++) {
    for (let x = 0; x < normalSize; x++) {
      const offset = (y * normalSize + x) * 4
      const phase = x * 0.095 + Math.sin(y * 0.021) * 1.7
      const directional = Math.sin(phase) * 0.5 + Math.sin(phase * 2.37) * 0.22
      const crossFiber = Math.sin(y * 0.41 + x * 0.037) * 0.14
      const noiseX = (random() - 0.5) * 0.17 + directional * 0.11
      const noiseY = (random() - 0.5) * 0.17 + crossFiber * 0.09
      data[offset] = Math.max(0, Math.min(255, Math.round(128 + noiseX * 127)))
      data[offset + 1] = Math.max(0, Math.min(255, Math.round(128 + noiseY * 127)))
      data[offset + 2] = 255
      data[offset + 3] = 255
    }
  }
  return repeatTexture(textureFromPixels({
    data,
    height: normalSize,
    width: normalSize,
  }, {
    anisotropy: 16,
    color: false,
    name: 'knottingham-wall-carpet-normal',
  }))
}
function createKnotWallCarpetTextures(): CarpetTextures {
  return {
    color: createOxbloodCarpetColor(),
    normal: createOxbloodCarpetNormal(),
  }
}
function disposeKnotWallCarpetTextures(textures: CarpetTextures) {
  textures.color.dispose()
  textures.normal.dispose()
}

export {createKnotWallCarpetTextures, disposeKnotWallCarpetTextures}
