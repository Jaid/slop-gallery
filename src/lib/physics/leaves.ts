import type {Vec3} from '../gallery/types.ts'

import {CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, Vector3} from 'three/webgpu'

export const leafPhysics = {
  mass: 0.008,
  gravityScale: 0.65,
  linearDamping: 1.2,
  angularDamping: 0.6,
  restitution: 0.1,
  friction: 0.9,
} as const

export const leafRotation: Vec3 = [0.3, 0, -0.55]

// Rendering and the convex colliders use the same geometry, shared by all plants.
export const leafGeometry = new SphereGeometry(1, 12, 10).scale(0.22, 0.48, 0.045)
export const leafVertices = Float32Array.from(leafGeometry.getAttribute('position').array)

// A deliberate mix of cleanly plucked heads, short stalks and nearly whole stems.
const stemLengths = [0, 0.25, 0.65, 0.1, 0.9, 0.4, 0, 0.55, 0.18, 0.78, 0.32]
const stemTilt = -0.32
const stemAxis = new Vector3(-Math.sin(stemTilt), Math.cos(stemTilt), 0)
const leafQuaternion = new Quaternion().setFromEuler(new Euler(...leafRotation))
const leafNormal = new Vector3(0, 0, 1).applyQuaternion(leafQuaternion)

const foliage = stemLengths.map((carriedLength, i) => {
  const stemHeight = 1.13 + i % 4 * 0.13
  const position: Vec3 = [0.3 + i % 3 * 0.08, 1.5 + i % 4 * 0.13, 0]
  const base = new Vector3(0.15, stemHeight, 0).addScaledVector(stemAxis, -0.55)
  // Stop at the leaf's middle plane, not beyond its thin back surface.
  // Keep the existing roots and stem direction; the whole tip cap fits inside the blade.
  const stemLength = new Vector3(...position).sub(base).dot(leafNormal) / stemAxis.dot(leafNormal)
  const remainingLength = stemLength - carriedLength
  const cutRadius = 0.012 + (0.018 - 0.012) * carriedLength / stemLength
  const remainingCenter = base.clone().addScaledVector(stemAxis, remainingLength / 2)
  const remainingGeometry = new CylinderGeometry(cutRadius, 0.018, remainingLength, 5)
    .rotateZ(stemTilt).translate(...remainingCenter.toArray())

  let carriedGeometry: CylinderGeometry | null = null
  if (carriedLength > 0) {
    const carriedCenter = base.clone().addScaledVector(stemAxis, remainingLength + carriedLength / 2)
    const toLeaf = new Matrix4().compose(new Vector3(...position), leafQuaternion, new Vector3(1, 1, 1)).invert()
    // Bake the upper stem into the leaf body's coordinates so both move as one prop.
    carriedGeometry = new CylinderGeometry(0.012, cutRadius, carriedLength, 5)
      .rotateZ(stemTilt).translate(...carriedCenter.toArray()).applyMatrix4(toLeaf)
  }

  return {
    angle: i * 2.4,
    stemHeight,
    position,
    color: i % 2 ? '#637a4a' : '#3d5e42',
    stem: {
      carriedLength,
      remainingGeometry,
      remainingVertices: Float32Array.from(remainingGeometry.getAttribute('position').array),
      carriedGeometry,
      vertices: carriedGeometry ? Float32Array.from(carriedGeometry.getAttribute('position').array) : null,
      mass: 0.003 * carriedLength / 1.1,
    },
  }
})

export function plantLeaves(plantPosition: Vec3) {
  return foliage.map((leaf, i) => ({
    ...leaf,
    id: 'prop-leaf-' + plantPosition.join(':') + '-' + i,
  }))
}

export type LeafStem = (typeof foliage)[number]['stem']

if (import.meta.hot) import.meta.hot.dispose(() => {
  leafGeometry.dispose()
  for (const {stem} of foliage) {
    stem.remainingGeometry.dispose()
    stem.carriedGeometry?.dispose()
  }
})
