import type {Node} from 'three/webgpu'

import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'
import {atan, float, max, normalGeometry, positionLocal, vec2} from 'three/tsl'

import lightSwitch, {switchButtonY} from '../gallery/lightSwitch.ts'
import {heightNormal, inside, line, visibleDetail} from './filters.ts'
import GoldMaterial from './GoldMaterial.ts'

type Float = Node<'float'>

/** how far apart the engine-turned grooves run */
const pitch = 0.0011
/** how deep they are cut */
const depth = 0.00003

/**
 * The gallery’s lacquered gold, engine-turned on a switch plate’s face like a pocket watch: a barleycorn guilloché of two interlaced sets of waving rings round the plate’s middle, a plain polished ring round every button and an engraved double rule just inside the plate’s edge.
 *
 * For a plate made by `SwitchPlate` with `buttons` buttons, centered on its local origin with its face toward +z. The grooves fade to plain polished gold before they could shimmer, so from a few meters away only their crossed glint remains.
 */
export default class GuillocheGoldMaterial extends GoldMaterial {
  private readonly studio: StudioEnvironment

  constructor(buttons: number) {
    const studio = new StudioEnvironment
    super({
      environment: studio,
      environmentIntensity: 0.45,
    })
    this.studio = studio
    this.name = 'Guilloché gold'
    const [width, height] = lightSwitch.plate
    const p = positionLocal.xy
    const face = normalGeometry.z.smoothstep(0.6, 0.9)
    // Signed distance to the plate’s outline, inset by the rounding of its edge.
    const halfSize = vec2(width / 2 - 0.0035, height / 2 - 0.0035)
    const q = p.abs().sub(halfSize)
    const outline = q.max(0).length().add(q.x.max(q.y).min(0))
    const rules = max(line(outline.add(0.0025), 0.00028), line(outline.add(0.0047), 0.00018))
    const r = p.length()
    const theta = atan(p.y, p.x)
    const wave = theta.mul(36).sin().mul(0.32)
    const ringA = r.div(pitch).add(wave).fract().sub(0.5).abs()
    const ringB = r.div(pitch).sub(wave).add(0.5).fract().sub(0.5).abs()
    const footprint = p.x.fwidth().max(p.y.fwidth())
    const turned = ringA.add(ringB).mul(visibleDetail(footprint, pitch))
    // Polished rings round the buttons, each closed by an engraved line.
    const nearButton = Array.from({length: buttons}, (_, i) => p.sub(vec2(0, switchButtonY(i, buttons))).length()).reduce<Float>((nearest, distance) => nearest.min(distance), float(1))
    const plain = inside(nearButton.sub(lightSwitch.collar.radius + 0.003))
    const ringLine = line(nearButton.sub(lightSwitch.collar.radius + 0.0036), 0.00022)
    const field = inside(outline.add(0.0062)).mul(plain.oneMinus())
    const engraved = max(rules, ringLine)
    const relief = turned.mul(field).mul(depth).sub(engraved.mul(0.00004)).mul(face)
    this.normalNode = heightNormal(relief)
    this.roughnessNode = (this.roughnessNode as Float).add(field.mul(0.04).mul(face)).add(engraved.mul(0.25).mul(face))
  }

  override dispose() {
    this.studio.dispose()
    super.dispose()
  }
}
