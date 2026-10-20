import {color, float, max, mix, mx_noise_float, positionGeometry, select, vec2, vec3} from 'three/tsl'
import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import dineTable from '../gallery/dineTable.ts'
import {gilt, slateBoiserie} from './boiserie/paint.ts'
import {heightNormal, inside, line, visibleDetail} from './filters.ts'

const heartwood = '#4a2c18'
const sapwood = '#7a5133'
const latewood = '#2a160d'

/**
 * The feast table’s oiled walnut, with the slab’s grain running the length of the table and everything under it turned or cut
 * the other way.
 *
 * Growth rings meander along the fibers and pores speckle across them. Both fade to their average before they could shimmer, and
 * the figure follows the mesh’s own frame so it stays put on the table.
 */
export class FeastWoodMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({
      roughness: 0.4,
      envMapIntensity: 0.55,
    })
    const p = positionGeometry
    const onTop = p.y.greaterThan(dineTable.top - dineTable.topThickness - 0.002)
    const along = select(onTop, p.z, p.y)
    const across = select(onTop, p.x, p.x.abs().add(p.z.abs()))
    const footprint = max(p.x.fwidth(), p.y.fwidth()).max(p.z.fwidth())
    const piece = p.z.mul(0.4).floor().mul(3).add(p.x.mul(2).floor())
    const meander = mx_noise_float(vec3(along.mul(0.55), across.mul(3.4), piece)).mul(7)
    const ringPhase = across.mul(46).add(meander)
    const rings = mix(ringPhase.sin().mul(0.5).add(0.5).pow(3.2), float(0.22), ringPhase.fwidth().smoothstep(0.8, 2.4))
    const porePhase = across.mul(240)
    const pores = mix(mx_noise_float(vec3(along.mul(4), porePhase, piece.add(5))).mul(0.5).add(0.5), float(0.5), porePhase.fwidth().smoothstep(0.6, 2))
    const figure = mx_noise_float(vec3(along.mul(0.9), across.mul(2.2), piece.add(2))).mul(0.5).add(0.5)
    const timber = mix(color(heartwood), color(sapwood), figure.mul(0.8))
    this.colorNode = mix(timber, color(latewood), rings.mul(0.55)).mul(pores.mul(0.18).add(0.91))
    this.roughnessNode = float(0.36).add(pores.mul(0.12)).sub(rings.mul(0.04))
    this.normalNode = heightNormal(pores.mul(0.00015).add(rings.mul(0.0001)).mul(visibleDetail(footprint, 0.004)))
  }
}

/**
 * Antique gilt for the fillet set into the slab’s edge, using the same worn leaf as Dine’s boiserie.
 *
 * The fillet is a narrow band a few millimeters in from the slab’s outline, so the walnut reads as a frame around it.
 */
export class FeastInlayMaterial extends MeshStandardNodeMaterial {
  constructor() {
    super({
      roughness: 0.32,
      metalness: 1,
      envMapIntensity: 0.8,
    })
    const p = positionGeometry
    const {cornerRadius, inlayInset, inlayWidth, length, top, topThickness, width} = dineTable
    const half = vec2(width / 2 - inlayInset - cornerRadius, length / 2 - inlayInset - cornerRadius)
    const corner = p.xz.abs().sub(half).max(0).length().sub(cornerRadius)
    const band = line(corner, inlayWidth / 2)
    const height = top - topThickness * 0.5
    // Only the slab’s vertical edge carries the fillet; the top and everything below it stay transparent.
    const onEdge = p.y.greaterThan(top - topThickness).and(p.y.lessThan(top - 0.004)).select(1, 0)
    const edge = p.y.sub(height).abs().mul(8).oneMinus().saturate().mul(onEdge)
    const fillet = band.mul(edge)
    this.colorNode = gilt({
      palette: slateBoiserie,
      u: p.x,
      v: p.z,
    })
    this.metalnessNode = fillet
    this.roughnessNode = mix(float(0.5), float(0.24), fillet)
    this.opacityNode = fillet
    this.transparent = true
    this.depthWrite = false
  }
}

/**
 * A damask runner laid down the middle of the table and draped over both ends.
 *
 * The cloth is a deep claret with a woven diamond-and-flower figure that fades out at distance. Its ends hang in soft folds, and
 * the selvedges are a narrower gilt braid.
 */
export class FeastRunnerMaterial extends MeshPhysicalNodeMaterial {
  constructor() {
    super({
      roughness: 0.82,
      sheen: 0.6,
      sheenColor: '#c47a78',
      sheenRoughness: 0.55,
      envMapIntensity: 0.3,
    })
    const p = positionGeometry
    const {length, runnerWidth, top} = dineTable
    const footprint = max(p.x.fwidth(), p.y.fwidth()).max(p.z.fwidth())
    const hanging = p.y.lessThan(top - 0.01)
    const along = select(hanging, p.y.mul(-1).add(length / 2), p.z)
    const across = p.x
    const warp = mx_noise_float(vec3(along.mul(90), across.mul(90), float(2))).mul(visibleDetail(footprint, 0.004))
    const diamond = along.mul(7).fract().sub(0.5).abs().add(across.mul(7).fract().sub(0.5).abs()).sub(0.5)
    const flower = mx_noise_float(vec3(along.mul(7), across.mul(7), float(4))).mul(0.5).add(0.5)
    const motif = inside(diamond).mul(0.5).add(flower.smoothstep(0.55, 0.8).mul(0.5)).mul(visibleDetail(footprint, 0.03))
    const ground = color('#6e2430')
    const pattern = color('#9a4450')
    const selvedge = line(across.abs().sub(runnerWidth / 2 - 0.012), 0.004)
    this.colorNode = mix(mix(ground, pattern, motif), color(slateBoiserie.gilt), selvedge).mul(warp.mul(0.06).add(0.97))
    this.roughnessNode = float(0.84).sub(motif.mul(0.12)).sub(selvedge.mul(0.3))
    this.normalNode = heightNormal(warp.mul(0.0004).add(motif.mul(0.0006)))
  }
}

