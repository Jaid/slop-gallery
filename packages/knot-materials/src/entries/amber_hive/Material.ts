import type {Node, Texture} from 'three/webgpu'

import {float, mix, mx_noise_float, normalLocal, positionGeometry, tangentLocal, time, transformNormalToView, vec2, vec3} from 'three/tsl'

import {environmentHighlight} from '../../candidates/claude_fable/lib/environmentHighlight.ts'
import {hexLattice} from '../../candidates/claude_fable/lib/hexLattice.ts'
import {rgb} from '../../candidates/claude_fable/lib/rgb.ts'
import {tubeCoordinates} from '../../candidates/claude_fable/lib/tubeCoordinates.ts'
import {tubeRay} from '../../lib/atelier.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import {wrapCell} from '../../lib/wrapCell.ts'
import knotData from './data.ts'

/** Comb geometry: an even number of hex rows along the knot and whole cells around it keep the comb seamless; the counts are chosen so a cell is ≈0.1 object units wide and nearly regular. */
const rowsAlong = 82
const cellsAround = 8
/** How deep an open cell is, in object units; honey sits somewhere below the rim. */
const cellDepth = 0.03
/** Honeycomb: wax walls in relief, capped cells and open cells of honey whose depth parallaxes as you move. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.8)
    this.name = knotData.id
    const {facing, grazing, near, intimate} = viewerFrame()
    const {along, around} = tubeCoordinates()
    const p = positionGeometry
    const n = normalLocal.normalize()
    const alongDirection = tangentLocal.normalize()
    const aroundDirection = n.cross(alongDirection).normalize()
    const lattice = (alongValue: Node<'float'>, aroundValue: Node<'float'>) => {
      const hex = hexLattice(vec2(alongValue.mul(rowsAlong), aroundValue.mul(cellsAround)))
      const id = wrapCell(hex.center.mul(2), vec2(rowsAlong * 2, cellsAround * 2))
      return {
        ...hex,
        id,
        random: cellNoiseVec3(vec3(id, 3)),
      }
    }
    const rim = lattice(along, around)
// Wall thickness in lattice units; physical cell and row pitches differ slightly, so measure the footprint in lattice units.
    const wallHalf = 0.055
    const wallFootprint = rim.distance.fwidth().max(1e-4)
    const wall = rim.distance.smoothstep(float(0.5 - wallHalf).sub(wallFootprint), float(0.5 - wallHalf).add(wallFootprint))
    const wallProfile = rim.distance.sub(0.5 - wallHalf).div(wallHalf).clamp()
// Capped cells: a third of the comb is sealed under pale wax lids, some sunken, some chewed open at a corner.
    const capped = rim.random.x.smoothstep(0.6, 0.64)
    const capDome = rim.distance.div(0.5 - wallHalf).clamp().pow2().oneMinus().mul(0.5)
    const bite = rim.local.sub(rim.random.yz.sub(0.5).mul(0.6)).length().smoothstep(0.16, 0.12).mul(rim.random.y.smoothstep(0.75, 0.8))
// Open cells: honey at a per-cell level, slowly rising, with a floor seen through it. Parallax places both at depth.
    const level = rim.random.z.mul(0.45).add(0.3).add(time.mul(0.012).add(rim.random.y.mul(6.28)).sin().mul(0.06))
    const honeyDepth = float(cellDepth).mul(float(1).sub(level))
    const ray = tubeRay()
    const honeyLattice = lattice(along.sub(ray.x.mul(honeyDepth)), around.sub(ray.y.mul(honeyDepth)))
    const floorLattice = lattice(along.sub(ray.x.mul(cellDepth)), around.sub(ray.y.mul(cellDepth)))
    const sameCell = (other: ReturnType<typeof lattice>) => other.id.sub(rim.id).length().lessThan(0.5).select(float(1), float(0))
    const honeyVisible = sameCell(honeyLattice)
    const floorVisible = sameCell(floorLattice).mul(honeyVisible)
// Inner wall: the view hits a side of the cell before reaching the honey – dark wax in shadow.
    const innerWall = honeyVisible.oneMinus()
// Honey body: Beer–Lambert through the honey to the floor, with sugar crystals forming at the walls.
    const honeyPath = honeyDepth.add(float(cellDepth).mul(level)).mul(float(1).div(facing.max(0.25)))
    const absorption = vec3(0.6, 3.2, 10).mul(honeyPath).mul(10).negate().exp()
    const honeyColor = rgb('#ffc044').mul(absorption).mul(floorVisible.mul(0.6).add(0.4)).add(rgb('#6a2a06').mul(absorption.oneMinus()).mul(0.5))
    const crystals = mx_noise_float(p.mul(70)).mul(0.5).add(0.5).smoothstep(0.55, 0.8).mul(honeyLattice.distance.smoothstep(0.25, 0.42)).mul(near)
// Honey surface: a meniscus climbing the walls, slow swirling currents, the occasional bubble.
    const meniscus = honeyLattice.distance.smoothstep(0.3, 0.45).pow2()
    const swirl = mx_noise_float(vec3(honeyLattice.local.mul(4), time.mul(0.1).add(rim.random.x.mul(10)))).mul(0.5).add(0.5)
    const bubbleCell = honeyLattice.local.mul(5).add(rim.random.xy.mul(9))
    const bubbleRandom = cellNoiseVec3(vec3(bubbleCell.floor(), rim.id.x))
    const bubble = bubbleCell.fract().sub(bubbleRandom.xy.mul(0.5).add(0.25)).length().smoothstep(0.1, 0.07).mul(bubbleRandom.z.smoothstep(0.75, 0.8)).mul(near)
// Wax: translucent pale yellow with a slightly rough, fingerprinted skin; walls darker and polished by use.
    const waxNoise = mx_noise_float(p.mul(24)).mul(0.5).add(0.5)
    const lidColor = mix(rgb('#efd8a8'), rgb('#d3b172'), waxNoise)
    const wallColor = mix(rgb('#8d6424'), rgb('#5c3f14'), wallProfile.mul(0.5).add(waxNoise.mul(0.5)))
    const open = capped.oneMinus().max(bite)
    let surface = mix(lidColor, mix(mix(honeyColor, rgb('#2a1604'), innerWall), rgb('#f3dca0'), crystals.mul(0.6)), open)
    surface = mix(surface, mix(rgb('#ffe9b0'), rgb('#ffffff'), 0.5), bubble.mul(open).mul(honeyVisible).mul(0.6))
    surface = mix(surface, wallColor, wall)
    this.colorNode = surface
    this.metalness = 0
    this.roughnessNode = mix(mix(float(0.55), float(0.06).add(crystals.mul(0.3)), open), float(0.35), wall).add(innerWall.mul(open).mul(0.3)).clamp(0.04, 0.95)
    this.clearcoatNode = open.mul(honeyVisible).mul(wall.oneMinus())
    this.clearcoatRoughness = 0.03
    this.sheenNode = rgb('#fff1c2').mul(capped.mul(0.6).add(wall.mul(0.3)))
    this.sheenRoughness = 0.7
// Relief: the walls stand proud as rounded ridges; lids dome gently; honey dips at the meniscus.
    const height = wall.mul(wallProfile.pow2().oneMinus().sqrt()).mul(0.006).add(capped.mul(capDome).mul(0.004)).sub(meniscus.mul(open).mul(honeyVisible).mul(0.002)).add(bubble.mul(0.0006))
    const surfaceNormal = proceduralNormal(height, 1)
    this.normalNode = surfaceNormal
// Light through honey: whoever looks along the light sees the comb glow like a window; close up, the swirl is visible.
    const backlight = grazing.pow(1.5).mul(0.6).add(0.15)
    const honeyGlow = rgb('#ff9a1c').mul(backlight).mul(open).mul(honeyVisible).mul(absorption.y.mul(2).add(0.3)).mul(swirl.mul(0.4).add(0.6))
    const lidGlow = rgb('#ffcf7a').mul(grazing.pow(2)).mul(capped).mul(0.18)
    const honeyNormal = transformNormalToView(n.add(alongDirection.mul(honeyLattice.local.x.mul(meniscus).mul(0.4))).add(aroundDirection.mul(honeyLattice.local.y.mul(meniscus).mul(0.4))).normalize())
    const sparkle = glints(honeyNormal, 220).mul(open).mul(honeyVisible).mul(0.6).add(glints(surfaceNormal, 80).mul(wall).mul(0.1))
    const roomInHoney = environmentHighlight(environment, n, 0.08).mul(open).mul(honeyVisible).mul(rgb('#ffd98a')).mul(0.35)
    this.emissiveNode = honeyGlow.mul(0.9).add(lidGlow).add(rgb('#fff4d6').mul(sparkle)).add(roomInHoney).add(rgb('#ff8a1c').mul(intimate).mul(open).mul(swirl.pow(3)).mul(0.08))
  }
}
