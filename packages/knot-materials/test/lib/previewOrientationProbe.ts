import type KnotPreviewRenderer from '../../scripts/lib/KnotPreviewRenderer.ts'
import type {Mesh, Texture} from 'three/webgpu'

import {float, positionGeometry, vec3} from 'three/tsl'

import RuntimeKnotIconRenderer from '../../../../src/components/KnotPreviewSigns/RuntimeKnotIconRenderer.ts'
import KnotMaterial from '../../src/lib/KnotMaterial.ts'
import {knotsById} from '../../src/main.ts'

/** Asymmetric axes make both vertical and horizontal flips visible, unlike an abstract knot's silhouette. */
class OrientationMaterial extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0)
    const top = positionGeometry.y.greaterThan(0).select(float(1), float(0))
    const right = positionGeometry.x.greaterThan(0).select(float(1), float(0))
    this.colorNode = vec3(0)
    this.emissiveNode = vec3(top, right, top.oneMinus())
    this.metalness = 1
    this.roughness = 1
  }
}
const orientation = (image: CanvasImageSource & {
  height: number
  width: number
}) => {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d', {willReadFrequently: true})!
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let redY = 0
  let redCount = 0
  let blueY = 0
  let blueCount = 0
  let greenX = 0
  let greenCount = 0
  let noGreenX = 0
  let noGreenCount = 0
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4
      if (pixels[i + 3] < 200) {
        continue
      }
      if (pixels[i] > pixels[i + 2] + 32) {
        redY += y
        redCount++
      }
      if (pixels[i + 2] > pixels[i] + 32) {
        blueY += y
        blueCount++
      }
      if (pixels[i + 1] > 60) {
        greenX += x
        greenCount++
      }
      if (!(pixels[i + 1] < 5)) {
        continue
      }
      noGreenX += x
      noGreenCount++
    }
  }
  canvas.width = 0
  canvas.height = 0
  if (Math.min(redCount, blueCount, greenCount, noGreenCount) < 100) {
    throw new Error('Missing orientation markers')
  }
  return {
    topY: redY / redCount,
    bottomY: blueY / blueCount,
    rightX: greenX / greenCount,
    leftX: noGreenX / noGreenCount,
  }
}

/** Exercise actual offline PNG capture and actual fast/heavy runtime billboard capture in a private browser. */
export async function previewOrientationProbe(renderer: KnotPreviewRenderer) {
  const entry = knotsById.get('lenticular_mirage')!
  const preview = await renderer.createPreview(entry)
  const owned = renderer as unknown as {
    active: Mesh
    environment: Texture
  }
  const material = new OrientationMaterial(owned.environment)
  const original = owned.active.material
  if (Array.isArray(original)) {
    for (const item of original) {
      item.dispose()
    }
  } else {
    original.dispose()
  }
  owned.active.material = material
  const results = []
  try {
    const png = await preview.renderFrame({
      angle: 0,
      distanceScale: 1,
      seconds: 0,
      size: 'animation',
    })
    const bitmap = await createImageBitmap(new Blob([Uint8Array.fromBase64(png)], {type: 'image/png'}))
    try {
      results.push({
        path: 'offline PNG',
        ...orientation(bitmap),
      })
    } finally {
      bitmap.close()
    }
  } finally {
    preview.dispose()
  }
  for (const heavy of [false, true]) {
    const runtime = new RuntimeKnotIconRenderer(() => OrientationMaterial, heavy)
    try {
      const billboardRenderController = new AbortController
      const images = await runtime.render([entry], billboardRenderController.signal)
      try {
        results.push({
          path: heavy ? 'heavy billboard' : 'fast billboard',
          ...orientation(images.get(entry.id)!),
        })
      } finally {
        for (const image of images.values()) {
          image.width = 0
          image.height = 0
        }
      }
    } finally {
      await runtime.disposeAsync()
    }
  }
  return results
}
