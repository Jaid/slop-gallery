import type {Vec3} from '../types.ts'
import type {DestructiblePlantKind} from './catalog.ts'
import type {BufferGeometry} from 'three/webgpu'

import {Color, CylinderGeometry, Euler, Float32BufferAttribute, Matrix4, Quaternion, SphereGeometry, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import {bladeGeometry} from '../plantDecorations/bladeGeometry.ts'
import {DestructibleGeometry} from './base/DestructibleGeometry.ts'

type LeafOptions = {
  angle: number
  at: Vec3
  bend: number
  color: string
  direction: Vec3
  flower?: boolean
  length: number
  width: number
}
const up = new Vector3(0, 1, 0)
const radial = (angle: number, radius: number, y: number): Vec3 => [Math.cos(angle) * radius, y, Math.sin(angle) * radius]

/** Shared model data only; attachment state and rigid bodies belong to each mounted plant. */
export class DestructiblePlantGeometry extends DestructibleGeometry {
  readonly stems: BufferGeometry
  private readonly roots: Array<BufferGeometry> = []

  constructor(readonly kind: DestructiblePlantKind) {
    super()
    this[kind]()
    this.stems = mergeParts(this.roots)
    this.roots.length = 0
  }

  private birdOfParadise() {
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4
      this.leaf({
        angle,
        at: radial(angle, 0.12 + i % 3 * 0.055, 0.3 + i % 4 * 0.13),
        direction: radial(angle, 0.44 + i % 3 * 0.04, 0.85),
        length: 0.56 + i % 3 * 0.1,
        width: 0.22 + i % 2 * 0.035,
        bend: -0.075,
        color: i % 3 ? '#356444' : '#60834b',
      })
    }
  }

  private leaf({angle, at, direction, length, width, bend, color, flower = false}: LeafOptions) {
    const quaternion = (new Quaternion).setFromUnitVectors(up, new Vector3(...direction).normalize()).multiply((new Quaternion).setFromAxisAngle(up, -angle - Math.PI / 2))
    const position = new Vector3(0, length / 2, 0).applyQuaternion(quaternion).add(new Vector3(...at))
    const rotation = (new Euler).setFromQuaternion(quaternion)
    let geometry = bladeGeometry({
      at: [0, -length / 2, 0],
      direction: [0, 1, 0],
      length,
      width,
      bend,
      color,
    })
    if (flower) {
      const spadix = new SphereGeometry(1, 8, 6).scale(0.013, 0.075, 0.013).translate(0, -0.01, 0.038)
      const tint = new Color('#d7b74d')
      spadix.setAttribute('color', new Float32BufferAttribute(Array.from({length: spadix.getAttribute('position').count}, () => tint.toArray()).flat(), 3))
      geometry = mergeParts([geometry, spadix])
    }
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const root = new Vector3(...radial(angle, 0.035, -0.035))
    const tip = new Vector3(...at)
    const axis = tip.clone().sub(root)
    const stemLength = axis.length()
    // Keep detachable stalks above the solid hull of every catalog pot.
    const rimClearance = Math.min(1, (0.12 - root.y) / (tip.y - root.y))
    const cutFraction = Math.max(rimClearance, [1, 0.35, 0.7, 0.15, 0.5][this.leaves.length % 5])
    const bottomRadius = this.kind === 'birdOfParadise' ? 0.012 : 0.007
    const topRadius = flower ? 0.003 : bottomRadius * 0.5
    const cutRadius = bottomRadius + (topRadius - bottomRadius) * cutFraction
    const stemRotation = (new Quaternion).setFromUnitVectors(up, axis.normalize())
    const remainingCenter = root.clone().addScaledVector(axis, stemLength * cutFraction / 2)
    const remaining = new CylinderGeometry(cutRadius, bottomRadius, stemLength * cutFraction, 6).applyQuaternion(stemRotation).translate(remainingCenter.x, remainingCenter.y, remainingCenter.z)
    let stem: BufferGeometry | null = null
    const carriedLength = stemLength * (1 - cutFraction)
    if (carriedLength > 0) {
      const center = tip.clone().addScaledVector(axis, -carriedLength / 2)
      const toLeaf = (new Matrix4).compose(position, quaternion, new Vector3(1, 1, 1)).invert()
      stem = new CylinderGeometry(topRadius, cutRadius, carriedLength, 6).applyQuaternion(stemRotation).translate(center.x, center.y, center.z).applyMatrix4(toLeaf)
      stem.computeBoundingBox()
      stem.computeBoundingSphere()
    }
    const leafTitle = this.kind === 'birdOfParadise' ? 'A bird of paradise leaf' : 'A peace lily leaf'
    this.roots.push(remaining)
    this.stemColliders.push({
      vertices: Float32Array.from(remaining.getAttribute('position').array),
      mass: stemLength * cutFraction * 0.003,
    })
    this.leaves.push({
      id: `leaf-${this.leaves.length}`,
      title: flower ? 'A peace lily flower' : leafTitle,
      geometry,
      vertices: Float32Array.from(geometry.getAttribute('position').array),
      mass: 0.008 * length * width / (0.36 * 0.19),
      position: position.toArray(),
      rotation: [rotation.x, rotation.y, rotation.z],
      stem,
      stemVertices: stem ? Float32Array.from(stem.getAttribute('position').array) : null,
      stemMass: carriedLength * 0.003,
    })
  }

  private peaceLily() {
    for (let i = 0; i < 10; i++) {
      const angle = i * 2.4
      this.leaf({
        angle,
        at: radial(angle, 0.09 + i % 3 * 0.025, 0.12 + i % 4 * 0.045),
        direction: radial(angle, 0.82, 0.4),
        length: 0.32 + i % 3 * 0.035,
        width: 0.13 + i % 2 * 0.025,
        bend: -0.09,
        color: i % 3 ? '#2d5c3e' : '#4f7943',
      })
    }
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.4 + 0.5
      this.leaf({
        angle,
        at: radial(angle, 0.11, 0.55 + i * 0.09),
        direction: radial(angle, 0.1, 1),
        length: 0.23,
        width: 0.14,
        bend: 0.045,
        color: '#f2f0d9',
        flower: true,
      })
    }
  }
}
