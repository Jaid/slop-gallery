import type {Node, Texture} from 'three/webgpu'

import {float, mix, mx_noise_float, normalLocal, positionGeometry, tangentLocal, vec3} from 'three/tsl'

import {loopPhase} from '../../candidates/claude_sonnet/lib/loopClock.ts'
import {spectrumIntensity, wavelengthColor} from '../../candidates/claude_sonnet/lib/spectrum.ts'
import {voronoi} from '../../candidates/claude_sonnet/lib/voronoi.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** Direction of the room's dominant light in object space; the diffraction condition depends on this together with the eye. */
const lampDirection = vec3(0.42, 0.78, 0.46).normalize()
/** One layer of the opal's silica lattice. Every mosaic tile is a domain of stacked spheres with its own orientation and spacing, so it diffracts a single wavelength toward the eye: λ = pitch · (sinθ_in + sinθ_out), measured along the tile's lattice axis. Tiles sit at a depth below the polished surface and are sampled along the view ray, so they slide against the stone as you move. */
function opalLayer(position: Node<'vec3'>, view: Node<'vec3'>, tangent: Node<'vec3'>, bitangent: Node<'vec3'>, scale: number, seed: number, tileFire: Node<'float'> | number) {
  const cells = voronoi(position.mul(scale).add(seed))
  const wall = cells.x.div(scale)
  const tile = cellNoiseVec3(cells.yzw.add(seed * 0.37))
  const tile2 = cellNoiseVec3(cells.yzw.add(seed + 71.9))
  const axisAngle = tile.x.mul(TAU)
  const axis = tangent.mul(axisAngle.cos()).add(bitangent.mul(axisAngle.sin()))
  const half = lampDirection.add(view).normalize()
  const sweep = half.dot(axis).mul(tile.y.mul(1.1).add(1.15))
// Broad gradients inside a tile, so each flash rolls across it rather than switching on at once.
  const inner = mx_noise_float(position.mul(scale * 2.3).add(tile2.mul(30))).mul(0.16)
  const blaze = sweep.add(inner).add(tile.z.mul(1.5).sub(0.55)).add(loopPhase.add(tile2.x.mul(TAU)).sin().mul(0.012))
// Higher diffraction orders overlap, so the wavelength folds back through the visible band instead of leaving it.
  const folded = blaze.mul(0.5).fract().sub(0.5).abs().mul(2)
  const wavelength = folded.mul(290).add(415)
// Fine lamellae: stacked growth planes inside each tile, running perpendicular to its lattice axis.
  const lamellaAxis = tangent.mul(axisAngle.sin()).sub(bitangent.mul(axisAngle.cos()))
  const lamellaPhase = position.dot(lamellaAxis).mul(tile2.y.mul(140).add(110)).add(tile2.z.mul(TAU))
  const lamella = lamellaPhase.sin().mul(0.5).add(0.5).smoothstep(0.1, 0.9).mul(0.4).add(0.6)
  const active = tile2.x.smoothstep(0.34, 0.46).mul(tileFire)
  const grout = wall.smoothstep(0.0009, 0.0022)
  return {
    color: wavelengthColor(wavelength),
    intensity: active.mul(grout).mul(lamella).mul(spectrumIntensity(wavelength)),
    wall,
  }
}
/** Black opal. A mosaic of silica domains sits under a polished dome; each tile can only flash while the eye, the lamp and its lattice axis line up, so the pattern crackles through the whole spectrum as you walk around the stone. Two layers at different depths give the fire a body, and the slow milky blue underneath is the Tyndall scatter of the sphere lattice itself. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.5)
    this.name = knotData.id
    const p = positionGeometry
    const {view, facing, grazing, near, intimate} = viewerFrame()
    const n = normalLocal.normalize()
    const tangent = tangentLocal.xyz.normalize()
    const bitangent = n.cross(tangent).normalize()
// Parallax: a layer lying `depth` below the surface is met where the view ray has traveled that far into the stone.
    const top = opalLayer(p.sub(view.mul(0.035)), view, tangent, bitangent, 21, 0, 1)
    const deep = opalLayer(p.sub(view.mul(0.11)), view, tangent, bitangent, 12, 40, float(0.85))
    const pin = mx_noise_float(p.sub(view.mul(0.06)).mul(90)).mul(0.5).add(0.5).smoothstep(0.66, 0.9)
    const pinfire = top.color.mul(pin).mul(near.mul(0.6).add(0.4)).mul(top.intensity.mul(0.5).add(0.1))
    const body = mx_noise_float(p.sub(view.mul(0.14)).mul(4.2)).mul(0.5).add(0.5)
    const tyndall = mix(vec3(0.015, 0.05, 0.14), vec3(0.16, 0.08, 0.03), body.smoothstep(0.55, 0.95))
    const fire = top.color.mul(top.intensity).mul(1.5).add(deep.color.mul(deep.intensity).mul(0.9).mul(top.intensity.mul(0.7).oneMinus())).add(pinfire)
    this.colorNode = mix(vec3(0.006, 0.011, 0.024), vec3(0.03, 0.05, 0.09), body.mul(0.6))
    this.metalness = 0
    this.roughness = 0.06
    this.ior = 1.45
    this.clearcoat = 1
    this.clearcoatRoughness = 0.02
    this.iridescence = 0.35
    this.iridescenceIOR = 1.32
    this.iridescenceThicknessRange = [260, 520]
    this.emissiveNode = fire.mul(facing.mul(0.35).add(0.75)).mul(intimate.mul(0.25).add(1))
      .add(tyndall.mul(grazing.pow(1.5).mul(0.7).add(0.3)).mul(0.28))
  }
}
