import type {Node, Texture} from 'three/webgpu'

import {color, float, mix, mx_fractal_noise_float, mx_noise_float, normalLocal, positionGeometry, time, uv, vec3} from 'three/tsl'

import {displacementView} from '../../lib/displacementView.ts'
import {glints} from '../../lib/glints.ts'
import KnotMaterial from '../../lib/KnotMaterial.ts'
import {proceduralNormal} from '../../lib/proceduralNormal.ts'
import {TAU} from '../../lib/TAU.ts'
import {viewerFrame} from '../../lib/viewerFrame.ts'
import knotData from './data.ts'

/** One generation of wind ripples. A real dune is not a sine wave: the wind climbs the gentle windward face grain by grain and then loses the slope all at once, so the crest is a knife edge with a slip face behind it. The whole profile is derivative-free, so the vertex stage can raise exactly the ridges that the fragment stage shades. */
const ripple = (phase: Node<'float'>) => {
  const rise = phase.sin().mul(0.5).add(0.5)
  const windward = rise.smoothstep(0, 0.66).pow(0.62)
  return {
    crest: rise.smoothstep(0.9, 1),
    height: windward,
    lee: rise.smoothstep(0.62, 0.98).oneMinus(),
  }
}
/** Sirocco: a desert reduced to a single habit. Wind ripples wrap the whole knot, each crest a knife edge with a slip face of loose grains behind it, and the grains are still moving – saltating up the windward side, avalanching down the other. Near the silhouette the air itself shimmers, so the dunes appear to breathe; stand close and the surface stops being sand and becomes ten thousand individual faces of quartz. */
export default class extends KnotMaterial {
  constructor(environment: Texture) {
    super(environment, 0.85)
    this.name = knotData.id
    const {p, facing, near, rim} = viewerFrame()
    const {grazing} = displacementView()
    const tube = uv()
    const dune = mx_fractal_noise_float(p.mul(2.6).add(vec3(1.7, 5.3, 9.1)), 3, 2.1, 0.55)
    const walk = time.mul(0.05)
// Every dependence on the tube's own parameter is a whole number of turns, so the ripple field is
// periodic in u and the pattern closes on itself where the knot's parameter does.
    const base = tube.y.mul(13).add(dune.mul(0.85)).add(tube.x.mul(TAU).sin().mul(0.5))
// Hot air bends the last few degrees of the view: the closer a ripple is to the silhouette, the
// more the shimmer owns it.
    const shimmer = mx_noise_float(p.mul(19).add(vec3(0, time.mul(-0.75), 0))).sub(0.5)
    const phase = base.add(shimmer.mul(grazing.pow(2.2)).mul(5.2))
    const {height, crest, lee} = ripple(phase)
    const still = ripple(base.add(walk))
    const relief = mix(still.height, height, float(0.85))
    const saltScale = 58
    const saltation = mx_noise_float(p.mul(saltScale).add(vec3(walk.mul(9), walk.mul(-6), 0)))
    const saltFoot = p.mul(saltScale).fwidth().length()
    const salt = saltation.smoothstep(0.5, 0.95).mul(saltFoot.smoothstep(0.4, 1.5).oneMinus()).mul(near.mul(0.6).add(0.4)).mul(still.lee.mul(0.7).add(0.3))
    const grainScale = 420
    const grainField = mx_noise_float(p.mul(grainScale).add(vec3(2.3, 7.7, 1.1)))
    const grainFoot = p.mul(grainScale).fwidth().length()
    const resolved = grainFoot.smoothstep(0.2, 0.8).oneMinus()
    const quartz = grainField.smoothstep(0.6, 0.98).mul(resolved)
    const mineral = grainField.mul(0.5).add(0.5).smoothstep(0.4, 0.04).mul(resolved)
    const shade = mx_fractal_noise_float(p.mul(7).add(vec3(8.3, 2.9, 4.1)), 3, 2.2, 0.5).mul(0.5).add(0.5)
    let sand = mix(color('#3a2411'), color('#c1924f'), relief.pow(0.9))
    sand = mix(sand, color('#f4dfb4'), crest.mul(0.7).mul(near.mul(0.4).add(0.6)))
    sand = mix(sand, color('#2c1d0f'), mineral.mul(0.75))
    sand = mix(sand, color('#fff0d2'), quartz.mul(0.85))
    sand = mix(sand, sand.mul(shade.mul(0.3).add(0.85)), 1)
    this.colorNode = mix(sand, color('#f6dcae'), salt.mul(0.5))
    this.metalness = 0
    this.roughnessNode = float(0.82).sub(quartz.mul(0.4)).sub(salt.mul(0.2)).add(mineral.mul(0.08)).clamp(0.22, 0.98)
    this.sheenNode = float(0.5).add(grazing.mul(0.5))
    this.sheenColor.set('#ffd49a')
    this.sheenRoughnessNode = float(0.5).add(grazing.mul(0.25)).sub(quartz.mul(0.2))
    this.ior = 1.45
    this.specularIntensityNode = float(0.4).add(quartz.mul(0.55))
    const bump = proceduralNormal(relief.mul(0.0032).add(crest.mul(0.0006)).add(salt.mul(0.0003)), 1)
    this.normalNode = bump
// Derivative-free: the same profile raises the ridges in the vertex stage.
    const vertexPhase = tube.y.mul(13).add(dune.mul(0.85)).add(tube.x.mul(TAU).sin().mul(0.5)).add(walk)
    this.positionNode = positionGeometry.add(normalLocal.mul(ripple(vertexPhase).height.mul(0.0038).add(crest.mul(0.001))))
    const sparkle = glints(bump, 300).mul(quartz).mul(0.6)
// Sand is a forward scatterer: face on it is a plain ochre wall, edge on it glows.
    const forward = facing.oneMinus().pow(2.2)
    this.emissiveNode = color('#fff0cd').mul(sparkle.mul(0.55))
      .add(sand.mul(forward.mul(0.2)))
      .add(color('#ffe0ac').mul(lee.mul(salt.mul(0.35).add(0.06))))
      .add(color('#cfe4f6').mul(rim.pow(2.4).mul(0.16)))
      .add(color('#ffe9c0').mul(grazing.pow(3.4).mul(shimmer.abs().mul(0.2))))
      .add(color('#7a4d22').mul(grazing.pow(3.5).mul(0.06)))
  }
}
