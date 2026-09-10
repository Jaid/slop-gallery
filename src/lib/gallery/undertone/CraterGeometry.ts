import type {BufferGeometry} from 'three/webgpu'

import {Color, ExtrudeGeometry, Float32BufferAttribute, BufferGeometry as Geometry, IcosahedronGeometry, Path, Shape} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {lowerGallery} from '../lowerGallery.ts'
import {undertoneCrater} from './config.ts'
import {craterTerrain} from './CraterTerrain.ts'

/** A true circular opening, rough impact bowl and scattered angular ejecta. */
export class CraterGeometry {
  readonly floor: BufferGeometry
  readonly rocks: BufferGeometry
  readonly terrain: BufferGeometry

  constructor() {
    const {radius, radialSegments, angularSegments} = undertoneCrater
    const [width, depth] = lowerGallery.undertone.size
    const outline = new Shape
    outline.moveTo(-width / 2, -depth / 2)
    outline.lineTo(width / 2, -depth / 2)
    outline.lineTo(width / 2, depth / 2)
    outline.lineTo(-width / 2, depth / 2)
    outline.closePath()
    const hole = new Path
    hole.absarc(0, 0, radius, 0, Math.PI * 2, true)
    outline.holes.push(hole)
    this.floor = new ExtrudeGeometry(outline, {
      depth: 0.32,
      bevelEnabled: false,
      curveSegments: angularSegments / 2,
    }).rotateX(-Math.PI / 2).translate(0, -0.32, 0)
    const positions: Array<number> = []
    const colors: Array<number> = []
    const uv: Array<number> = []
    const indices: Array<number> = []
    const dark = new Color('#514c43')
    const light = new Color('#a29a87')
    const color = new Color
    const vertex = (x: number, z: number) => {
      const y = craterTerrain.height(x, z)
      positions.push(x, y, z)
      uv.push(x / 2, z / 2)
      const variation = craterTerrain.variation(x, z)
      color.copy(dark).lerp(light, Math.max(0, Math.min(1, 0.52 + variation * 0.23 + y * 0.035)))
      colors.push(color.r, color.g, color.b)
    }
    vertex(0, 0)
    for (let ring = 1; ring <= radialSegments; ring++) {
      for (let i = 0; i < angularSegments; i++) {
        const angle = i / angularSegments * Math.PI * 2
        vertex(radius * ring / radialSegments * Math.cos(angle), radius * ring / radialSegments * Math.sin(angle))
      }
    }
    for (let i = 0; i < angularSegments; i++) {
      indices.push(0, 1 + (i + 1) % angularSegments, 1 + i)
    }
    for (let ring = 1; ring < radialSegments; ring++) {
      for (let i = 0; i < angularSegments; i++) {
        const next = (i + 1) % angularSegments
        const a = 1 + (ring - 1) * angularSegments + i
        const b = 1 + (ring - 1) * angularSegments + next
        const c = 1 + ring * angularSegments + next
        const d = 1 + ring * angularSegments + i
        indices.push(a, b, c, a, c, d)
      }
    }
    this.terrain = new Geometry
    this.terrain.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.terrain.setAttribute('color', new Float32BufferAttribute(colors, 3))
    this.terrain.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    this.terrain.setIndex(indices)
    this.terrain.computeVertexNormals()
    this.terrain.computeBoundingBox()
    this.terrain.computeBoundingSphere()
    const rocks: Array<BufferGeometry> = []
    let seed = 907
    const random = () => {
      seed = Math.imul(seed, 1_664_525) + 1_013_904_223 >>> 0
      return seed / 4_294_967_296
    }
    for (let i = 0; i < 210; i++) {
      const angle = random() * Math.PI * 2
      const r = Math.sqrt(random()) * (radius - 0.45)
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const size = 0.065 + random() ** 3 * 0.42
      const rock = new IcosahedronGeometry(size, 0).scale(0.7 + random(), 0.55 + random() * 0.6, 0.7 + random()).rotateY(random() * Math.PI).rotateZ(random() * 0.5).translate(x, craterTerrain.height(x, z) + size * 0.35, z)
      rocks.push(rock)
    }
    this.rocks = mergeParts(rocks)
  }

  dispose() {
    this.floor.dispose()
    this.terrain.dispose()
    this.rocks.dispose()
  }
}
