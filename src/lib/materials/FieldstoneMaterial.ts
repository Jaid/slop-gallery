import type {Node} from 'three/webgpu'

import {color, exp, float, hash, max, mix, mx_noise_float, normalWorldGeometry, positionWorld, select, vec2} from 'three/tsl'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {heightNormal, inside, visibleDetail} from './filters.ts'

type Vec2 = Node<'vec2'>

/** A unique, non-negative integer per cell within ±500 cells, small enough that floats still hold it and its hash streams exactly. */
const cellKey = (cell: Vec2) => cell.x.add(500).mul(1009).add(cell.y.add(500))
/** Nearest and second-nearest jittered cell points of `p`, plus the nearest cell’s id. */
function voronoi(p: Vec2, jitter: number) {
  const cell = p.floor().toVar()
  const local = p.fract().toVar()
  let f1: Node<'float'> = float(8)
  let f2: Node<'float'> = float(8)
  let id: Vec2 = vec2(0)
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const neighbor = cell.add(vec2(x, y))
      const key = cellKey(neighbor)
      const point = vec2(hash(key), hash(key.add(7_919_000))).sub(0.5).mul(jitter).add(0.5)
      const distance = vec2(x, y).add(point).sub(local).length()
      const nearer = distance.lessThan(f1)
      f2 = select(nearer, f1, f2.min(distance))
      id = select(nearer, neighbor, id)
      f1 = select(nearer, distance, f1)
    }
  }
  return {
    f1,
    f2,
    id,
  }
}

/**
 * Rounded river and field stones set in a deep, sandy mortar, for the Lodge’s chimney breast and hearth.
 *
 * Stones are laid out per face from the world position, so every block of a fireplace shares one masonry pattern. Each stone gets its own tone from a warm gray to ochre, a domed face and pitted grain; the mortar sits back from the stones. With `soot`, the masonry darkens above that point, where smoke curls out of the firebox. Joints fade to the average stone color before they could shimmer.
 */
export default class FieldstoneMaterial extends MeshStandardNodeMaterial {
  constructor({soot, brightness = 1}: {
    /** overall brightness, for the blackened lining of a firebox */
    brightness?: number
    /** where smoke leaves the firebox, in world space */
    soot?: readonly [number, number, number]
  } = {}) {
    super({
      roughness: 0.9,
      envMapIntensity: 0.15,
    })
    const n = normalWorldGeometry
    const facesY = n.y.abs().greaterThan(0.7)
    const facesX = n.x.abs().greaterThan(n.z.abs())
    const u = select(facesY, positionWorld.x, select(facesX, positionWorld.z, positionWorld.x))
    const v = select(facesY, positionWorld.z, positionWorld.y)
    // Wall stones are coursed wider than tall; hearth flags are broader still.
    const scale = select(facesY, vec2(0.42, 0.36), vec2(0.34, 0.22))
    const p = vec2(u, v).div(scale)
    const {f1, f2, id} = voronoi(p, 0.82)
    // Approximate distance to the joint in meters.
    const border = f2.sub(f1).mul(0.5).mul(scale.x.add(scale.y).mul(0.5)).toVar('stoneBorder')
    const footprint = max(u.fwidth(), v.fwidth()).toVar('stoneFootprint')
    const detail = visibleDetail(footprint, 0.08)
    const joint = float(0.012)
    const stone = inside(joint.sub(border)).oneMinus().mul(detail).add(detail.oneMinus()).toVar('stoneCoverage')
    const key = cellKey(id)
    const pick = hash(key.add(1_234_567))
    const shade = hash(key.add(2_345_678))
    const warm = mix(color('#8a8172'), color('#6d6253'), shade)
    const cool = mix(color('#77797a'), color('#545656'), shade)
    const ochre = mix(color('#94704a'), color('#6e5137'), shade)
    const tone = mix(mix(cool, warm, pick.smoothstep(0.2, 0.55)), ochre, pick.smoothstep(0.82, 0.95))
    const mineral = mx_noise_float(positionWorld.mul(9)).mul(0.5).add(0.5)
    const speckle = mx_noise_float(positionWorld.mul(70)).mul(visibleDetail(footprint, 0.015))
    const dome = border.sub(joint).div(0.04).clamp(0, 1)
    // Domed stones catch the light on top and fall into shadow at their edges.
    const faceTone = tone.mul(mineral.mul(0.22).add(0.86)).mul(speckle.mul(0.08).add(1)).mul(dome.sqrt().mul(0.35).add(0.65))
    const mortar = color('#4a4238').mul(mx_noise_float(positionWorld.mul(40)).mul(0.1).add(0.82))
    const average = mix(color('#6f685e'), color('#5d5447'), 0.2)
    let surface: Node<'vec3'> = mix(mortar, faceTone, stone)
    surface = mix(average.mul(mineral.mul(0.15).add(0.92)), surface, detail)
    if (soot) {
      const [x, y, z] = soot
      const rise = positionWorld.y.sub(y)
      const spread = positionWorld.x.sub(x).abs().add(positionWorld.z.sub(z).abs().mul(0.5))
      const smoke = exp(spread.div(rise.max(0).mul(0.45).add(0.4)).pow(2).negate()).mul(exp(rise.abs().div(0.9).negate())).mul(select(rise.greaterThan(-0.3), float(1), float(0)))
      surface = surface.mul(float(1).sub(smoke.mul(0.65)))
    }
    this.colorNode = surface.mul(brightness)
    this.roughnessNode = mix(float(0.97), mineral.mul(0.1).add(0.8), stone)
    const height = dome.sqrt().mul(0.03).add(speckle.mul(0.0008)).add(mineral.mul(0.002)).mul(detail)
    this.normalNode = heightNormal(height)
  }
}
