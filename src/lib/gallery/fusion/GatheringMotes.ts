import type {Node} from 'three/webgpu'

import {attribute, cameraWorldMatrix, cos, cross, dot, exp, float, mix, positionGeometry, sin, smoothstep, uniform, uv, vec3, vec4} from 'three/tsl'
import {AdditiveBlending, Color, InstancedBufferAttribute, InstancedMesh, MeshBasicNodeMaterial, PlaneGeometry, Vector3} from 'three/webgpu'

import TransparentSpriteOutputsNode from '../../rendering/TransparentSpriteOutputsNode.ts'

/** how many motes stream in */
const count = 280
const goldenRatio = (Math.sqrt(5) - 1) / 2
/** deterministic, evenly spread pseudo-random fractions */
const sequence = (i: number, seed: number) => (i * goldenRatio + seed) % 1

/**
 * Motes of light streaming in from all over the room into a fusion’s portal, each a short streak spiraling around the wall’s normal as it falls in, one after another, animated entirely on the GPU by the clock.
 * They come from all around the portal along its wall and a little out of the room. Positions are relative to the portal’s middle, which the mesh’s group stands at.
 */
export default class GatheringMotes extends InstancedMesh<PlaneGeometry, MeshBasicNodeMaterial> {
  readonly uniforms = {
    /** seconds since the motes set off */
    clock: uniform(0),
    /** how brightly they glow; 0 hides them */
    energy: uniform(0),
    /** out of the wall, toward the room */
    normal: uniform(new Vector3(0, 0, 1)),
    rim: uniform(new Color),
    swirl: uniform(new Color),
  }

  constructor() {
    const geometry = new PlaneGeometry(1, 1)
    const seeds = new Float32Array(count * 4)
    const axes = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      seeds.set([sequence(i, 0.17), sequence(i * 7, 0.43), sequence(i * 13, 0.61), sequence(i * 3, 0.89)], i * 4)
      // Fibonacci sphere: where each mote sets off from.
      const y = 1 - (i + 0.5) / count * 2
      const ring = Math.sqrt(1 - y * y)
      const turn = i * Math.PI * (3 - Math.sqrt(5))
      axes.set([Math.cos(turn) * ring, y, Math.sin(turn) * ring], i * 3)
    }
    geometry.setAttribute('moteSeed', new InstancedBufferAttribute(seeds, 4))
    geometry.setAttribute('moteAxis', new InstancedBufferAttribute(axes, 3))
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    })
    material.blending = AdditiveBlending
    material.name = 'fusion-motes'
    material.mrtNode = new TransparentSpriteOutputsNode
    super(geometry, material, count)
    this.name = 'fusion-motes'
    const {clock, energy, normal, rim, swirl} = this.uniforms
    const seed = attribute<'vec4'>('moteSeed', 'vec4')
    const axis = attribute<'vec3'>('moteAxis', 'vec3')
    // They come from around the portal along the wall, flatter than high, so they stay in view of someone facing it, and a little from the room.
    const along = axis.sub(normal.mul(dot(axis, normal))).mul(vec3(1, 0.65, 1))
    const outward = along.add(normal.mul(seed.y.mul(0.5).add(0.15))).normalize()
    const start = seed.x.mul(0.65)
    const travel = seed.y.mul(0.35).add(0.38)
    const distance = seed.z.mul(2.3).add(1.3)
    const turns = seed.w.mul(2).add(1.5)
    /** where the mote is `progress` of the way in: spiraling around the normal, falling in ever faster */
    const path = (progress: Node<'float'>) => {
      const angle = progress.mul(turns)
      const offset = outward.mul(float(1).sub(progress).pow(1.7).mul(distance))
      return offset.mul(cos(angle)).add(cross(normal, offset).mul(sin(angle))).add(normal.mul(dot(normal, offset)).mul(float(1).sub(cos(angle))))
    }
    const progress = clock.sub(start).div(travel).clamp(0, 1)
    const head = path(progress)
    const tail = path(progress.sub(0.09).max(0))
    const streak = head.sub(tail)
    const length = streak.length().add(0.015)
    const forward = streak.div(length)
    // Turned toward the camera around its length, its front facing it.
    const side = cross(cameraWorldMatrix.mul(vec4(0, 0, 1, 0)).xyz, forward).normalize()
    const width = seed.w.mul(0.014).add(0.012)
    // The quad runs from the tail to the head.
    material.positionNode = head.add(forward.mul(positionGeometry.x.sub(0.5).mul(length))).add(side.mul(positionGeometry.y.mul(width)))
    const glow = smoothstep(0, 0.12, progress).mul(smoothstep(1, 0.88, progress)).mul(energy)
    material.colorNode = mix(swirl, rim, seed.z).mul(glow.mul(4))
    const across = uv().y.sub(0.5).mul(2)
    material.opacityNode = exp(across.mul(across).mul(-4)).mul(uv().x.pow(1.5))
    // The vertex shader places every mote, so the source quad’s bounds say nothing.
    this.frustumCulled = false
  }

  override dispose() {
    this.geometry.dispose()
    this.material.dispose()
    super.dispose()
  }
}
