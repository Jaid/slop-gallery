import type {CollisionEnterPayload} from '@react-three/rapier'

import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo, useReducer, useRef} from 'react'
import {attribute, color, mix} from 'three/tsl'
import {BoxGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial} from 'three/webgpu'

import {useGallery} from '#src/lib/gallery.ts'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'
import {knotBays, knotLayout} from '#src/lib/knots/exhibition.ts'
import KnotLightDamage, {knotLight, knotLightSlots} from '#src/lib/knots/KnotLights.ts'

export default function KnotLights() {
  const resetEpoch = useGallery(state => state.resetEpoch)
  const slots = useMemo(() => knotLightSlots(knotLayout, knotBays.length, knotGalleryBounds.height), [])
  const damage = useMemo(() => new KnotLightDamage(slots.length), [resetEpoch, slots.length])
  const time = useRef(0)
  const [, redraw] = useReducer(value => value + 1, 0)
  const resources = useMemo(() => {
    const geometry = new BoxGeometry(...knotLight.size)
    const intensities = new InstancedBufferAttribute(new Float32Array(slots.length).fill(1), 1)
    geometry.setAttribute('lightIntensity', intensities)
    const material = new MeshBasicNodeMaterial
    material.name = 'Knot slot LED panes'
    material.toneMapped = false
    material.colorNode = mix(color('#171916'), color('#fff3d8'), attribute('lightIntensity', 'float'))
    const mesh = new InstancedMesh(geometry, material, slots.length)
    mesh.name = 'knot-slot-led-panes'
    const matrix = new Matrix4
    for (const [index, slot] of slots.entries()) {
      matrix.makeTranslation(...slot.position)
      mesh.setMatrixAt(index, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
    return {
      geometry,
      intensities,
      material,
      mesh,
    }
  }, [slots])
  useEffect(() => () => {
    resources.mesh.dispose()
    resources.geometry.dispose()
    resources.material.dispose()
  }, [resources])
  useFrame((_, delta) => {
    time.current += delta
    const values = resources.intensities.array as Float32Array
    let changed = false
    for (let index = 0; index < damage.count; index++) {
      const intensity = damage.intensity(index, time.current)
      if (Math.abs(values[index] - intensity) > 0.001) {
        values[index] = intensity
        changed = true
      }
    }
    if (changed) {
      resources.intensities.needsUpdate = true
    }
  })
  const onImpact = (index: number, event: CollisionEnterPayload) => {
    const body = event.other.rigidBody
    if (!body) {
      return
    }
    const velocity = body.linvel()
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
    if (damage.hit(index, body.mass(), speed, time.current)) {
      redraw()
    }
  }
  return <group name="knot-slot-lights">
    <primitive object={resources.mesh}/>
    <RigidBody type="fixed" colliders={false}>
      {slots.map((slot, index) => damage.stage(index) < 2 && <CuboidCollider key={slot.id} position={slot.position} args={[knotLight.size[0] / 2, knotLight.size[1] / 2, knotLight.size[2] / 2]} restitution={0.08} friction={0.6} onCollisionEnter={event => onImpact(index, event)}/>)}
    </RigidBody>
  </group>
}
