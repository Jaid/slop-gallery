import type {BufferGeometry} from 'three/webgpu'

import {clamp} from 'math'
import {mulberry32} from 'math/random'
import {Color, ExtrudeGeometry, Float32BufferAttribute, BufferGeometry as Geometry, IcosahedronGeometry, Path, Shape, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import lowerGallery from '../lowerGallery.ts'
import {moonfallCrater} from './config.ts'
import {craterTerrain} from './CraterTerrain.ts'
import DiscTerrainMesh from './DiscTerrainMesh.ts'

/** A true circular opening, rough impact bowl and scattered angular ejecta. */
export default class CraterGeometry {
  readonly floor: BufferGeometry
  readonly rocks: BufferGeometry
  readonly terrain: BufferGeometry

  constructor() {
    const {radius, rimSegments, terrainTolerance, terrainSpacing} = moonfallCrater
    const [width, depth] = lowerGallery.moonfall.size
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
      // Arcs resolve to twice the curve segments, so the hole shares the terrain’s rim vertices.
      curveSegments: rimSegments / 2,
    }).rotateX(-Math.PI / 2).translate(0, -0.32, 0)
    // Vertices concentrate where the relief needs them instead of on a dense polar grid.
    const surface = new DiscTerrainMesh({
      radius,
      rimSegments,
      tolerance: terrainTolerance,
      spacing: terrainSpacing,
      maxVertices: 6000,
      height: (x, z) => craterTerrain.height(x, z),
    })
    const positions: Array<number> = []
    const normals: Array<number> = []
    const colors: Array<number> = []
    const uv: Array<number> = []
    const dark = new Color('#514c43')
    const light = new Color('#a29a87')
    const color = new Color
    const normal = new Vector3
    const step = 0.05
    for (let i = 0; i < surface.positions.length; i += 3) {
      const x = surface.positions[i]
      const y = surface.positions[i + 1]
      const z = surface.positions[i + 2]
      positions.push(x, y, z)
      uv.push(x / 2, z / 2)
      // Normals of the height field itself keep the relief’s shading on the sparse triangles.
      const dx = craterTerrain.height(x + step, z) - craterTerrain.height(x - step, z)
      const dz = craterTerrain.height(x, z + step) - craterTerrain.height(x, z - step)
      normal.set(-dx, step * 2, -dz).normalize()
      normals.push(normal.x, normal.y, normal.z)
      // Fine mottling lives in CraterMaterial; vertex colors only carry broad tonal variation.
      const variation = craterTerrain.variation(x, z, false)
      color.copy(dark).lerp(light, clamp(0.52 + variation * 0.23 + y * 0.035, 0, 1))
      colors.push(color.r, color.g, color.b)
    }
    this.terrain = new Geometry
    this.terrain.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.terrain.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    this.terrain.setAttribute('color', new Float32BufferAttribute(colors, 3))
    this.terrain.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    this.terrain.setIndex(surface.indices)
    this.terrain.computeBoundingBox()
    this.terrain.computeBoundingSphere()
    const rocks: Array<BufferGeometry> = []
    const randomState = mulberry32.create(907)
    const random = () => mulberry32.sample(randomState)
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
