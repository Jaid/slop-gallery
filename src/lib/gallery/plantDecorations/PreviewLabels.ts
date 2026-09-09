import {MeshBasicNodeMaterial, PlaneGeometry} from 'three/webgpu'

import {canvasTexture} from '#src/lib/texture.ts'

import {plantCombinations, plants, potDefinition} from './catalog.ts'
import {complexityLabel, decorationComplexity} from './complexity.ts'
import {decorationResources} from './DecorationResources.ts'

/** One atlas for all 32 numbered signs, not one high-resolution texture per text line. */
export class PreviewLabels {
  readonly complexities: Array<ReturnType<typeof decorationComplexity>>
  readonly geometry: Array<PlaneGeometry>
  readonly material: MeshBasicNodeMaterial
  readonly texture: ReturnType<typeof canvasTexture>

  constructor() {
    const resources = decorationResources()
    this.complexities = plantCombinations.map(combination => decorationComplexity(resources.pot(combination.pot), resources.plant(combination.plant)))
    const columns = 4
    const height = 192
    const rows = 8
    const width = 640
    const canvas = document.createElement('canvas')
    canvas.width = width * columns
    canvas.height = height * rows
    const context = canvas.getContext('2d')!
    for (const [i, combination] of plantCombinations.entries()) {
      const x = i % columns * width
      const y = Math.floor(i / columns) * height
      const pot = potDefinition(combination.pot)
      const plant = plants.find(candidate => candidate.id === combination.plant)!
      context.fillStyle = '#eee9da'
      context.fillRect(x, y, width, height)
      context.fillStyle = '#a08853'
      context.fillRect(x + 152, y + 32, 2, height - 64)
      context.fillStyle = '#294238'
      context.font = '80px Georgia'
      context.textAlign = 'center'
      context.fillText(String(combination.number).padStart(2, '0'), x + 77, y + 120)
      context.textAlign = 'left'
      context.font = 'bold 25px sans-serif'
      context.fillText(plant.title, x + 178, y + 48, width - 200)
      context.font = '24px Georgia'
      context.fillText(pot.title, x + 178, y + 85)
      context.fillStyle = '#777963'
      context.font = '18px sans-serif'
      context.fillText(pot.subtitle, x + 178, y + 113)
      context.fillStyle = '#c7c5b2'
      context.fillRect(x + 178, y + 130, width - 202, 1)
      context.fillStyle = '#294238'
      context.font = 'bold 21px sans-serif'
      context.fillText(complexityLabel(this.complexities[i]!.triangles), x + 178, y + 164, width - 200)
    }
    this.texture = canvasTexture(canvas)
    this.texture.anisotropy = 16
    this.material = new MeshBasicNodeMaterial({
      map: this.texture,
      toneMapped: false,
    })
    this.geometry = plantCombinations.map((_, i) => {
      const geometry = new PlaneGeometry(0.96, 0.288)
      const uv = geometry.getAttribute('uv')
      for (let vertex = 0; vertex < uv.count; vertex++) {
        uv.setXY(vertex, (i % columns + uv.getX(vertex)) / columns, (rows - 1 - Math.floor(i / columns) + uv.getY(vertex)) / rows)
      }
      return geometry
    })
  }

  dispose() {
    this.texture.dispose()
    this.material.dispose()
    for (const geometry of this.geometry) {
      geometry.dispose()
    }
  }
}
