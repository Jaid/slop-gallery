import type {Node, Texture} from 'three/webgpu'

import {atan, float, mix, negateOnBackSide, normalLocal, time, transformNormalToView, uv, vec2, vec3} from 'three/tsl'

import {ramp} from '../../candidates/claude_sonnet/lib/ramp.ts'
import {filteredRoughness} from '../../candidates/claude_sonnet/lib/specularFilter.ts'
import {knotFrame} from '../../candidates/claude_sonnet/lib/tubeBasis.ts'
import {cellNoiseVec3} from '../../lib/cellNoiseVec3.ts'
import {cosinePalette} from '../../lib/cosinePalette.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import {wrapCell} from '../../lib/wrapCell.ts'
import knotData from './data.ts'

const panelGrid: [number, number] = [18, 2]
const lensesPerPanel = 12
const frameCount = 5
/** Cosine band that settles to its mean once the phase changes faster than a pixel can resolve. */
const band = (phase: Node<'float'>, footprint: Node<'float'>) => phase.cos().mul(ramp(footprint, 3, 0.6)).mul(0.5).add(0.5)
/** One interlaced frame: a mandala whose symmetry, ring density and palette all depend on the frame index. Footprints are analytic (the polar angle is never differentiated), so the atan seam stays clean. */
const mandala = (k: Node<'float'>, local: Node<'vec2'>, pixel: Node<'float'>, shift: Node<'float'>) => {
  const radius = local.length().mul(2).max(0.0001)
  const angle = atan(local.y, local.x.add(0.00001))
  const symmetry = k.mul(2).add(4)
  const petals = band(angle.mul(symmetry).add(radius.mul(k.mul(1.5).add(3))), pixel.mul(symmetry).div(radius).add(pixel.mul(8)))
  const rings = band(radius.mul(k.mul(4).add(18)).sub(shift), pixel.mul(k.mul(4).add(18)).mul(2))
  const bloom = radius.mul(1.4).oneMinus().max(0)
  const value = rings.mul(0.55).add(petals.mul(0.45)).mul(bloom.mul(0.6).add(0.4))
  const hue = k.mul(0.19).add(radius.mul(0.35)).add(petals.mul(0.12))
  const ink = cosinePalette(hue, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0, 0.33, 0.67])
  return mix(vec3(0.015, 0.012, 0.03), ink, value.pow(1.4).mul(1.05))
}

/** A lenticular print wrapped around the knot: every viewing angle selects another interlaced mandala. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.9)
    this.name = knotData.id
    const {view, objectDistance} = viewerFrame()
    const tube = uv()
    const basis = knotFrame(tube)
    // panels: each carries its own mandala and its own phase in the cycle
    const grid = tube.mul(vec2(...panelGrid))
    const local = grid.fract().sub(0.5)
    const identity = cellNoiseVec3(vec3(wrapCell(grid.floor(), vec2(...panelGrid)), 12.4))
    const pixel = grid.fwidth().length().max(0.0001)
    // lenses: cylinders along the tube; position inside the lens reads a different strip
    const lensCoordinate = tube.x.mul(panelGrid[0] * lensesPerPanel)
    const across = lensCoordinate.fract().sub(0.5)
    const lensPixel = lensCoordinate.fwidth().max(0.0001)
    const strips = ramp(lensPixel, 0.28, 0.07)
    // the viewing angle across the lens chooses the frame; panels are offset so neighbors disagree
    const sweep = view.dot(basis.along).mul(0.5).add(0.5).mul(frameCount - 1)
    const framePosition = sweep.add(identity.x.mul(1.3)).add(across.mul(1.6).mul(strips)).clamp(0, frameCount - 0.001)
    const lower = framePosition.floor()
    const flip = ramp(framePosition.fract(), 0.4, 0.6)
    const shift = time.mul(0.35).add(identity.y.mul(TAU))
    const picture = mix(mandala(lower, local, pixel, shift), mandala(lower.add(1), local, pixel, shift), flip)
    // glossy lens sheet: ridge normals show up close and settle into a smooth sheen at a distance
    const surface = normalLocal.normalize()
    // convex cylinders: the normal leans toward the side of the lens it sits on
    const tilt = basis.along.mul(across.mul(0.9).mul(strips))
    const tangentTilt = tilt.sub(surface.mul(tilt.dot(surface)))
    const ridged = negateOnBackSide(transformNormalToView(surface.add(tangentTilt).normalize()))
    const seam = ramp(across.abs(), 0.5, 0.44).mul(strips)
    const near = ramp(objectDistance, 3.6, 1.4)
    this.colorNode = picture.mul(seam.mul(-0.6).add(1))
    this.metalness = 0.15
    this.roughnessNode = filteredRoughness(0.35, ridged)
    this.clearcoat = 1
    this.clearcoatRoughnessNode = filteredRoughness(0.025, ridged)
    this.iridescence = 0.25
    this.iridescenceThicknessNode = float(260).add(across.mul(120))
    this.normalNode = ridged
    this.clearcoatNormalNode = ridged
    this.emissiveNode = picture.mul(0.45).mul(near.mul(0.25).add(0.75))
  }
}
