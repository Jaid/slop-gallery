import type {BakeOptions} from 'vite-plugin-bake-core'

import createBakePlugin from 'vite-plugin-bake-core'
import {threeAdapter} from 'vite-plugin-bake-core/three'

import {ownsCanvas, ReadbackCanvas, readCanvas, renderCanvasTexture, textureFromPixels} from './canvas.ts'

export type BakeStaticTexturesOptions = BakeOptions

export function staticTexturesAdapter() {
  return threeAdapter({
    name: 'static-textures',
    kind: 'texture',
    readCanvas,
    ownsCanvas,
    roots: [renderCanvasTexture, textureFromPixels],
    modules: new Map([
      ['canvas-textures', {default: ReadbackCanvas}],
      ['canvas-textures/three', {
        default: renderCanvasTexture,
        textureFromPixels,
      }],
    ]),
  })
}

/** Bake closed pixel/Canvas2D recipes without changing application constructors or hooks. */
export default function bakeStaticTextures(options: BakeStaticTexturesOptions = {}) {
  return createBakePlugin(staticTexturesAdapter(), {
    minimumBytes: 4097,
    ...options,
  })
}
