import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import {knotBays, knotLayout} from 'knot-materials/exhibition.ts'
import {knotLightColor, knotLightDiffuserSize} from 'knot-materials/KnotLightPanels.ts'
import {knotLight} from 'knot-materials/KnotLights.ts'
import {RectAreaLightTexturesLib} from 'three/addons/lights/RectAreaLightTexturesLib.js'
import {RectAreaLight, RectAreaLightNode} from 'three/webgpu'

import {meanBrightness} from '#component/LedPanels'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'

RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init())
const ledEmissionIntensity = 0.675

/** One area light per row of panes, dimmed by that row’s mean brightness. */
export default class RowEmitters {
  readonly rows: ReadonlyArray<{
    light: RectAreaLight
    panes: ReadonlyArray<number>
  }>

  constructor(slots: ReadonlyArray<KnotLightSlot>) {
    const width = knotLightDiffuserSize[0] + knotLayout.itemSpacing * (knotLayout.maxRowLength - 1)
    this.rows = knotBays.map((_, row) => {
      const light = new RectAreaLight(knotLightColor, ledEmissionIntensity, width, knotLightDiffuserSize[2])
      light.name = `knot-led-emission-row-${row}`
      light.position.set(knotLayout.rowCenterX(knotLayout.maxRowLength), knotGalleryBounds.height - knotLight.ceilingInset - 0.065, knotLayout.rowZ(row))
      light.lookAt(light.position.x, 0, light.position.z)
      const panes: Array<number> = []
      for (const [index, slot] of slots.entries()) {
        if (slot.row === row) {
          panes.push(index)
        }
      }
      return {
        light,
        panes,
      }
    })
  }

  update(brightness: Float32Array) {
    for (const {light, panes} of this.rows) {
      light.intensity = ledEmissionIntensity * meanBrightness(brightness, panes)
    }
  }
}
