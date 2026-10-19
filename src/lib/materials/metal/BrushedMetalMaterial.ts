import type {Grain} from './grain.ts'
import type {Surroundings} from './Surroundings.ts'
import type {ColorRepresentation, Node} from 'three/webgpu'

import {anisotropyB, anisotropyT, float, mix, mx_noise_float, normalView, positionGeometry, positionViewDirection, reflectVector, vec2, vec3} from 'three/tsl'
import {Color, MeshBasicNodeMaterial, MeshPhysicalNodeMaterial} from 'three/webgpu'

import {heightNormal, visibleDetail} from '../filters.ts'
import {roughnessSpread, SurroundingsNode, surroundingsRadiance} from './Surroundings.ts'

export type BrushedMetalOptions = {
  /** 0–1 how far the finish stretches highlights across its grain; 0 is an evenly polished metal */
  anisotropy?: number
  /** direction of the finishing marks; without one the metal is evenly polished */
  grain?: () => Grain
  /** a name for debugging */
  name?: string
  /** normal-incidence reflectance, either a linear RGB triple like the ones in {@link metalReflectance} or an sRGB color */
  reflectance?: ColorRepresentation | readonly [number, number, number]
  /** GGX roughness along the grain */
  roughness?: number
  /** the room that the metal pretends to mirror */
  surroundings: Surroundings
  /** brightness of the mirrored room; 1 mirrors it as bright as it is on screen */
  surroundingsIntensity?: number
  /** where the finish dulled: the share of the surface, 0–1, covered by broad, slightly rougher and darker smudges */
  wear?: number
}

type Float = Node<'float'>

/** Metal reflectances in linear RGB at normal incidence, after the measured values that physically based renderers commonly use. */
export const metalReflectance = {
  aluminum: [0.91, 0.92, 0.92],
  chrome: [0.55, 0.56, 0.55],
  stainless: [0.62, 0.6, 0.57],
  steel: [0.56, 0.57, 0.58],
} as const

const toColor = (value: NonNullable<BrushedMetalOptions['reflectance']>) => (typeof value === 'object' && 'length' in value ? new Color(...value) : new Color(value))
/** Fine streaks of the finishing marks around 0, fading out before they get small enough to shimmer. */
const finishMarks = (grain: Grain) => {
  const {coordinate} = grain
  // Thin across the grain, long along it: 0.25 mm wide streaks a few centimeters long, between fainter, sparser 1 mm streaks a decimeter long.
  const fine = mx_noise_float(coordinate.mul(vec3(4000, 4000, 30)))
  const coarse = mx_noise_float(coordinate.mul(vec3(1000, 1000, 9)).add(7.1))
  const footprint = coordinate.fwidth().xy.length().max(1e-6)
  return fine.mul(visibleDetail(footprint, 1 / 4000)).add(coarse.mul(visibleDetail(footprint, 1 / 1000).mul(0.6))).mul(grain.strength)
}

/**
 * The unlit counterpart for fast graphics: the same mirrored room and reflectance on a plain color, without lights, grain or blur by roughness.
 *
 * It costs a fraction of the physical material but still reads as metal, because what it shows moves with the view like a reflection.
 */
export function unlitMetal({reflectance = metalReflectance.stainless, roughness = 0.22, surroundings, surroundingsIntensity = 1, name = 'Unlit metal'}: Pick<BrushedMetalOptions, 'name' | 'reflectance' | 'roughness' | 'surroundings' | 'surroundingsIntensity'>) {
  const material = new MeshBasicNodeMaterial
  material.name = name
  const tint = vec3(...toColor(reflectance))
  // The Fresnel rise of metals toward white at grazing angles.
  const facing = positionViewDirection.dot(normalView).abs()
  const fresnel = mix(tint, vec3(1), float(1).sub(facing).pow(5))
  material.colorNode = surroundingsRadiance(surroundings, reflectVector, roughnessSpread(float(roughness))).mul(fresnel).mul(surroundingsIntensity)
  return material
}

/**
 * Pseudo-reflective brushed or polished metal for stainless fittings: bench frames, handrails and stands.
 *
 * Real metal has no color of its own; it shows its surroundings, tinted by its reflectance. Instead of a generic environment map, this material mirrors a procedural model of the room it stands in – floor tiles, walls with their artworks and doorways, and a ceiling with its light panels – traced from the actual position of every pixel, so the reflections line up with the room, keep their real size and slide across the metal as the player moves. The blur of the mirrored room follows the roughness, which keeps polished parts crisp and brushed ones soft.
 *
 * Brushed or turned grain stretches both the mirrored room and the highlights of the room’s lights across the finishing marks, as on real satin steel. The marks themselves roughen the surface in faint streaks and fade to their average before they could alias. Broad, soft smudges dull the polish in places, so long surfaces never read as flawless plastic.
 */
export default class BrushedMetalMaterial extends MeshPhysicalNodeMaterial {
  readonly grain: Grain | null
  constructor({anisotropy = 0.6, grain, name = 'Brushed metal', reflectance = metalReflectance.stainless, roughness = 0.22, surroundings, surroundingsIntensity = 1, wear = 0.35}: BrushedMetalOptions) {
    super({
      metalness: 1,
      roughness,
      color: toColor(reflectance),
    })
    this.name = name
    this.grain = grain?.() ?? null
    // three bends the reflection for anisotropy but blurs it by the roughness along the grain only, which leaves the mirrored room crisp across it; the extra blur smears it like the grooves do.
    this.envNode = new SurroundingsNode(surroundings, surroundingsIntensity, this.grain ? this.grain.strength.mul(anisotropy * 0.2) : null)
    // Soft smudges a few decimeters across, following the mesh.
    const smudge = mx_noise_float(positionGeometry.mul(3.1).add(2.3)).mul(0.5).add(0.5).smoothstep(1 - wear, 1).toVar()
    let rough: Float = float(roughness).add(smudge.mul(0.1))
    let shade: Float = float(1)
    if (this.grain) {
      const marks = finishMarks(this.grain).toVar()
      rough = rough.add(marks.mul(0.07))
      // Deeper grooves also shade themselves a little, which draws the streaks even where the reflection is uniform.
      shade = marks.mul(0.035).add(1)
      // The marks are grooves of a few microns: barely a bump, but enough to break up the mirrored room along them.
      this.normalNode = heightNormal(marks.mul(0.000004))
      this.anisotropyNode = vec2(this.grain.strength.mul(anisotropy), 0)
    }
    this.roughnessNode = rough.clamp(0.04, 1)
    this.colorNode = mix(vec3(...toColor(reflectance)), vec3(...toColor(reflectance).multiplyScalar(0.82)), smudge.mul(0.6)).mul(shade)
  }
  override setupVariants(builder: Parameters<MeshPhysicalNodeMaterial['setupVariants']>[0]) {
    super.setupVariants(builder)
    if (this.grain) {
      // three takes the anisotropy direction from UV tangents; the grain knows the true direction of the finishing marks instead.
      anisotropyT.assign(this.grain.across)
      anisotropyB.assign(normalView.cross(this.grain.across))
    }
  }
}
