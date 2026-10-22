import type {Node} from 'three/webgpu'

import {attribute, cameraWorldMatrix, equirectUV, float, mix, mx_noise_float, normalLocal, output, positionGeometry, positionViewDirection, refract, texture, time, uv, vec3, vec4} from 'three/tsl'
import {CustomBlending, DoubleSide, MeshPhysicalNodeMaterial, OneFactor, OneMinusSrcAlphaFactor} from 'three/webgpu'

import {heightNormal} from '../filters.ts'
import {lobbyEnvironment} from './LobbyEnvironment.ts'
import {waterFresnel, waterIor} from './water.ts'

type Float = Node<'float'>

/**
 * Water in flight: the cup’s bell-shaped veil, the ribbons from the tazza’s spouts, the arcing jets and the crown jet.
 *
 * UV v is the age of the water in seconds, so its streaks travel at the water’s own speed; `waterFall` is the fraction of a sheet’s fall behind it,
 * which tears the veil and frays the ribbons into strands, and `waterAir` is how much air the water has taken in, which turns it white.
 *
 * The water reflects the room weighted by Fresnel and lets the rest of the light through, blended premultiplied over whatever lies behind it, other
 * water included. Round streams (`waterLens` 1) are lenses: like a glass rod, they show the room bent through them instead of the plain backdrop,
 * which gives laminar jets their bright cores and crisp rims. A thin veil (`waterLens` 0) barely bends the view at all.
 */
export default class FallingWaterMaterial extends MeshPhysicalNodeMaterial {
  constructor(heavy = true) {
    super({
      // A black body leaves only reflections; foam adds its own diffuse white.
      color: '#000000',
      metalness: 0,
      roughness: 0.04,
      ior: waterIor,
      specularIntensity: 1,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
      // The room’s own reflection, bright where the room is bright; see LobbyEnvironment.
      envMap: lobbyEnvironment,
      envMapIntensity: 1.15,
    })
    this.name = heavy ? 'fountain-falling-water' : 'fountain-falling-water-fast'
    const fall = attribute<'float'>('waterFall', 'float')
    const air = attribute<'float'>('waterAir', 'float')
    const lens = attribute<'float'>('waterLens', 'float')
    // Azimuth from the geometry itself, so streaks run continuously across the UV seams.
    const around = positionGeometry.xz.normalize()
    const emitted = time.sub(uv().y)
    const octaves = (scale: number, speed: number, offset: Float) => mx_noise_float(vec3(around.mul(scale), emitted.mul(speed).add(offset))).mul(0.65)
      .add(mx_noise_float(vec3(around.mul(scale * 2.7).add(7.3), emitted.mul(speed * 1.9).add(offset))).mul(0.35))
      .mul(0.5).add(0.5)
    const streaks = octaves(31, 3.4, float(0)).toVar('fallingStreaks')
    const tears = octaves(15, 5, fall.mul(2))
    // Whole at the lip, fraying into strands toward the pool.
    const threshold = fall.pow(1.6).mul(0.8).sub(0.1)
    const coverage = tears.smoothstep(threshold, threshold.add(0.14)).toVar('fallingCoverage')
    const foam = air.add(streaks.sub(0.5).mul(0.6)).clamp().mul(air.mul(1.4).min(1)).toVar('fallingFoam')
    // Slow, broad wobble so the curtain never reads as a rigid shell.
    const wobble = mx_noise_float(vec3(around.mul(4), emitted.mul(1.3)))
    // Waves ride down sheets and pulses down round streams at the water’s own speed, swelling more the farther the water fell.
    const pulse = emitted.mul(38).add(around.x.mul(2)).sin().mul(0.5).add(mx_noise_float(vec3(around.mul(3), emitted.mul(9))).mul(0.7))
    this.positionNode = positionGeometry.add(normalLocal.mul(mix(
      wobble.mul(fall.mul(0.016).add(0.003)),
      pulse.mul(0.0025).mul(fall.max(0.4)),
      lens,
    )))
    // Streaks and wobble as a relief on the surface, which bends the reflections like real running water.
    const normal = heightNormal(streaks.mul(0.0008).add(wobble.mul(0.0012))).toVar('fallingNormal')
    this.normalNode = normal
    this.roughnessNode = foam.mul(0.4).add(0.04)
    const fresnel = waterFresnel(positionViewDirection.dot(normal).abs()).toVar('fallingFresnel')
    // Through a round stream, the view enters and leaves bent by the same angle; the room seen that way comes from the environment.
    const view = positionViewDirection.negate()
    const inside = refract(view, normal.mul(positionViewDirection.dot(normal).sign()), 1 / waterIor)
    const through = inside.mul(2).sub(view).normalize()
    const throughWorld = through.transformDirection(cameraWorldMatrix)
    const bent = texture(lobbyEnvironment, equirectUV(throughWorld)).rgb
    // A little of the light is lost on the way through, more in fast mode, where there is no backdrop to blend over transparently anyway.
    const transmitted = float(1).sub(fresnel).mul(heavy ? 0.97 : 0.9)
    this.colorNode = vec3(foam.mul(0.9))
    this.emissiveNode = bent.mul(lens).mul(transmitted).mul(float(1).sub(foam)).mul(0.95)
    // Reflected light and the light the lens bends both replace the backdrop; clear water lets the rest of it through.
    const clear = fresnel.add(lens.mul(transmitted)).add(float(1).sub(transmitted)).min(1)
    this.opacityNode = mix(clear, float(0.92), foam)
    // Premultiplied: torn gaps take light and opacity away alike.
    this.outputNode = vec4(output.rgb.mul(coverage), output.a.mul(coverage))
    // Ambient occlusion and temporal antialiasing read the normal and velocity targets, which every fragment overwrites without blending.
    this.maskNode = coverage.greaterThan(0.02)
  }
}
