import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_noise_float, time, uv, vec2, vec3} from 'three/tsl'

import {disk, ring, segment} from '../../candidates/gpt_sol/lib/galleryMarks.ts'
import {tubeRay} from '../../lib/atelier.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

// Each landmark is a star, not a solid silhouette. Linked arcs describe ears, whiskers,
// spine, curled tail and paws; stars and threads inhabit different optical depths.
const stars = [
  [-0.3, 0.23],
  [-0.18, 0.37],
  [-0.1, 0.24],
  [0.03, 0.26],
  [0.15, 0.37],
  [0.22, 0.22],
  [-0.23, 0.15],
  [-0.09, 0.1],
  [0.04, 0.1],
  [0.19, 0.14],
  [-0.19, 0],
  [0.04, -0.02],
  [-0.21, -0.16],
  [-0.07, -0.2],
  [0.08, -0.19],
  [0.13, -0.34],
  [-0.22, -0.35],
  [0.28, -0.17],
  [0.36, -0.09],
  [0.34, 0.03],
  [0.28, 0.11],
  [0.26, -0.28],
  [-0.31, -0.3],
] as const
const links = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [0, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 5],
  [6, 10],
  [7, 11],
  [10, 12],
  [11, 13],
  [12, 16],
  [13, 14],
  [14, 15],
  [12, 13],
  [11, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [17, 21],
  [21, 15],
  [10, 22],
  [22, 16],
  [0, 7],
  [5, 8],
] as const
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.55)
    this.name = knotData.id
    const tile = uv().mul(vec2(9, 2))
    const id = tile.floor()
    const random = cellNoiseVec3(vec3(id, 5.9))
    const {near, grazing} = viewerFrame()
    const p = tile.fract().sub(0.5).sub(tubeRay().mul(0.014))
    const footprint = tile.fwidth().length().mul(0.6).max(0.0005)
    let threads: Node<'float'> = float(0)
    let lights: Node<'float'> = float(0)
    for (const [a, b] of links) {
      threads = threads.max(segment(p, stars[a], stars[b], 0.0027, footprint))
    }
    for (const [i, star] of stars.entries()) {
      const radius = i === 1 || i === 4 || i === 18 ? 0.019 : 0.011
      const pulse = time.mul(1.4 + i % 5 * 0.17).add(random.x.mul(8)).add(i * 1.618).sin().mul(0.25).add(0.76)
      lights = lights.max(disk(p.sub(vec2(...star)), radius, footprint).mul(pulse))
    }
    const eyelight = disk(p.sub(vec2(-0.095, 0.17)), 0.008, footprint).add(disk(p.sub(vec2(0.08, 0.17)), 0.008, footprint)).clamp()
    const halo = ring(p.sub(vec2(0, -0.02)), 0.405, 0.0015, footprint).mul(0.25)
    const dust = mx_noise_float(vec3(uv().mul(vec2(34, 15)), time.mul(0.035))).mul(0.5).add(0.5)
    const reveal = near.mul(0.35).add(0.8)
    this.colorNode = mix(color('#040c22'), color('#152947'), dust.mul(0.22))
    this.metalness = 0.32
    this.roughness = 0.42
    this.clearcoat = 1
    this.clearcoatRoughness = 0.08
    this.emissiveNode = color('#65a9e9').mul(threads).mul(1.2).add(color('#fbc58d').mul(threads).mul(1.1))
      .add(color('#ffe7ba').mul(lights).mul(3.2))
      .add(color('#a1e9ff').mul(eyelight).mul(1.4))
      .add(color('#7694ff').mul(halo).mul(near.mul(0.5).add(0.4)))
      .mul(reveal).add(color('#486bad').mul(grazing.pow(3)).mul(0.11))
  }
}
