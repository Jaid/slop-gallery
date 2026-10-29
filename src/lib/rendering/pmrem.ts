import type {CanvasTexture} from 'three/webgpu'

import optis from 'optis'
import readPermalink from 'read-permalink'

import {createEnvironment, drawEnvironment} from '../gallery/environment.ts'
import {lightingPresets} from '../gallery/lighting.ts'

const pmremIds = ['slop_gallery'] as const

export type PmremId = typeof pmremIds[number]

const pmremSchema = optis({
  normalizations: {
    pmrem(value: unknown) {
      return pmremIds.find(id => id === value)
    },
  },
})

/** Read an optional reflection environment that replaces the knots’ own studio, for comparing them under another world’s environment. */
export function readPmrem(input: URL | string = typeof location === 'undefined' ? '' : location.href): PmremId | undefined {
  return readPermalink(input, {schema: pmremSchema}).pmrem
}

let galleryEnvironment: CanvasTexture | undefined

/** The environment `?pmrem` asks for, painted once and shared for the page lifetime, or nothing for the knots’ own studio. `slop_gallery` is the gallery’s environment under its default lighting. */
export function getPmremEnvironment() {
  if (readPmrem() !== 'slop_gallery') {
    return
  }
  if (!galleryEnvironment) {
    galleryEnvironment = createEnvironment()
    const {gradient, lightBoxes} = lightingPresets.noon.environment
    drawEnvironment(galleryEnvironment, gradient, lightBoxes)
  }
  return galleryEnvironment
}
