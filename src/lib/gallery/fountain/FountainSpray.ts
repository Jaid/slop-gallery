import {attribute, time, vec3} from 'three/tsl'
import {InstancedBufferAttribute, InstancedMesh, MeshStandardNodeMaterial, SphereGeometry} from 'three/webgpu'

import {fountain} from './config.ts'

/** Ballistic droplets animated entirely on the GPU; no per-frame allocations or React updates. */
export class FountainSpray extends InstancedMesh<SphereGeometry, MeshStandardNodeMaterial> {
  constructor(count = fountain.sprayCount) {
    const geometry = new SphereGeometry(0.014, 6, 4)
    const origins: Array<number> = []
    const velocities: Array<number> = []
    const phases: Array<number> = []
    const lifetimes: Array<number> = []
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399_963_229_728_653
      const splash = i % 3 !== 0
      const radius = splash ? 1.63 : 0.15
      const outlet = Math.round(angle / (Math.PI / 6)) * Math.PI / 6
      const speed = 0.2 + i * 0.618_033_988_75 % 1 * 0.45
      const up = splash ? 0.9 + speed : 1.5 + speed
      origins.push(Math.cos(outlet) * radius, splash ? fountain.poolY : 3.23, Math.sin(outlet) * radius)
      velocities.push(Math.cos(angle) * speed, up, Math.sin(angle) * speed)
      phases.push(i * 0.754_877_666 % 1)
      lifetimes.push(splash ? up * 2 / 9.81 : (up + Math.sqrt(up * up + 2 * 9.81 * 0.43)) / 9.81)
    }
    geometry.setAttribute('sprayOrigin', new InstancedBufferAttribute(new Float32Array(origins), 3))
    geometry.setAttribute('sprayVelocity', new InstancedBufferAttribute(new Float32Array(velocities), 3))
    geometry.setAttribute('sprayPhase', new InstancedBufferAttribute(new Float32Array(phases), 1))
    geometry.setAttribute('sprayLifetime', new InstancedBufferAttribute(new Float32Array(lifetimes), 1))
    const material = new MeshStandardNodeMaterial({
      color: '#d7f0e9',
      roughness: 0.12,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    })
    const lifetime = attribute<'float'>('sprayLifetime', 'float')
    const age = time.div(lifetime).add(attribute<'float'>('sprayPhase', 'float')).fract().mul(lifetime)
    material.positionNode = attribute<'vec3'>('position', 'vec3')
      .add(attribute<'vec3'>('sprayOrigin', 'vec3'))
      .add(attribute<'vec3'>('sprayVelocity', 'vec3').mul(age))
      .add(vec3(0, -4.905, 0).mul(age.pow(2)))
    super(geometry, material, count)
    this.name = 'fountain-spray'
    // Vertex animation exceeds the source sphere’s bounds.
    this.frustumCulled = false
  }

  override dispose() {
    this.geometry.dispose()
    this.material.dispose()
    super.dispose()
  }
}
