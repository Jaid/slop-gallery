import type {KnotLightSlot, KnotLightStage} from '#src/lib/knots/KnotLights.ts'
import type {CollisionEnterPayload} from '@react-three/rapier'

import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo, useReducer, useRef} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {RectAreaLightTexturesLib} from 'three/addons/lights/RectAreaLightTexturesLib.js'
import {attribute, color, float, length, mix, smoothstep, uv, vec2} from 'three/tsl'
import {BufferGeometry, DoubleSide, Euler, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, MeshStandardNodeMaterial, Quaternion, RectAreaLight, RectAreaLightNode, Vector3} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import {useGallery} from '#src/lib/gallery.ts'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'
import {knotBays, knotLayout} from '#src/lib/knots/exhibition.ts'
import KnotLightDamage, {knotLight, knotLightFracture, knotLightSlots} from '#src/lib/knots/KnotLights.ts'
import {bodyThrow} from '#src/lib/physics/ThrowState.ts'

RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init())
const ledEmissionColor = '#fff3d8'
const ledEmissionIntensity = 1.35
const housingSize = [knotLight.size[0] + 0.16, 0.1, knotLight.size[2] + 0.16] as const
const diffuserSize = [knotLight.size[0] - 0.12, 0.038, knotLight.size[2] - 0.12] as const
const housingYOffset = 0.025
const diffuserYOffset = -0.026
const diffuserTilt = [0, 0, 0.16] as const
const diffuserDrop = [0, 0, 0.09] as const
const deadTriangleSurfaceY = diffuserYOffset - diffuserSize[1] / 2 - 0.002
const hideDeadTriangle = (mesh: InstancedMesh, index: number) => {
  const matrix = (new Matrix4).makeScale(0, 0, 0)
  mesh.setMatrixAt(index, matrix)
}
const setDeadTriangleMatrix = (mesh: InstancedMesh, index: number, slot: KnotLightSlot, triangle: readonly [readonly [number, number], readonly [number, number], readonly [number, number]]) => {
  const [[ax, az], [bx, bz], [cx, cz]] = triangle.map(([x, z]) => [
    slot.position[0] + x * diffuserSize[0] / 2,
    slot.position[2] + z * diffuserSize[2] / 2,
  ]) as [[number, number], [number, number], [number, number]]
  const matrix = (new Matrix4).set(bx - ax, 0, cx - ax, ax, 0, 1, 0, slot.position[1] + deadTriangleSurfaceY, bz - az, 0, cz - az, az, 0, 0, 0, 1)
  mesh.setMatrixAt(index, matrix)
}
const colliderWorldPoint = (collider: CollisionEnterPayload['target']['collider'], point: {x: number
  y: number
  z: number}) => {
  const rotation = collider.rotation()
  const translation = collider.translation()
  return new Vector3(point.x, point.y, point.z)
    .applyQuaternion(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))
    .add(new Vector3(translation.x, translation.y, translation.z))
}
const collisionImpactPoint = (event: CollisionEnterPayload, fallback: {x: number
  y: number
  z: number}) => {
  const weighted = new Vector3
  let totalWeight = 0
  const unweighted = new Vector3
  let contacts = 0
  for (let contact = 0; contact < event.manifold.numContacts(); contact++) {
    const first = event.manifold.localContactPoint1(contact)
    const second = event.manifold.localContactPoint2(contact)
    if (!first || !second) {
      continue
    }
    // react-three-rapier exposes the same manifold to both collider callbacks, so determine
    // which local point belongs to our target by testing both assignments in world space.
    const targetFirst = colliderWorldPoint(event.target.collider, first)
    const otherSecond = colliderWorldPoint(event.other.collider, second)
    const targetSecond = colliderWorldPoint(event.target.collider, second)
    const otherFirst = colliderWorldPoint(event.other.collider, first)
    const firstGap = targetFirst.distanceToSquared(otherSecond)
    const secondGap = targetSecond.distanceToSquared(otherFirst)
    const candidate = firstGap <= secondGap ? targetFirst : targetSecond
    unweighted.add(candidate)
    contacts++
    const rawImpulse = event.manifold.contactImpulse(contact)
    const impulse = Number.isFinite(rawImpulse) ? Math.abs(rawImpulse) : 0
    if (impulse > 0) {
      weighted.addScaledVector(candidate, impulse)
      totalWeight += impulse
    }
  }
  if (totalWeight > 0) {
    return weighted.multiplyScalar(1 / totalWeight)
  }
  if (contacts) {
    return unweighted.multiplyScalar(1 / contacts)
  }
  const total = new Vector3
  let count = 0
  for (let contact = 0; contact < event.manifold.numSolverContacts(); contact++) {
    const point = event.manifold.solverContactPoint(contact)
    if (point) {
      total.add(new Vector3(point.x, point.y, point.z))
      count++
    }
  }
  return count ? total.multiplyScalar(1 / count) : new Vector3(fallback.x, fallback.y, fallback.z)
}
const collisionImpactSpeed = (event: CollisionEnterPayload, mass: number, currentSpeed: number) => {
  if (!Number.isFinite(mass) || mass <= 0) {
    return currentSpeed
  }
  let impulse = 0
  for (let contact = 0; contact < event.manifold.numContacts(); contact++) {
    const value = event.manifold.contactImpulse(contact)
    if (Number.isFinite(value)) {
      impulse += Math.abs(value)
    }
  }
  // Collision callbacks run after Rapier's solver, so linvel() may already contain only
  // the small rebound velocity. Normal impulse / mass recovers the missing impact scale.
  return Math.max(currentSpeed, impulse / mass)
}
const setDiffuserMatrix = (mesh: InstancedMesh, index: number, slot: KnotLightSlot, stage: KnotLightStage) => {
  const direction = index % 2 === 0 ? 1 : -1
  const tilt = diffuserTilt[stage]
  const drop = diffuserDrop[stage]
  const slide = stage === 2 ? direction * 0.07 : 0
  const matrix = new Matrix4
  matrix.makeRotationFromEuler(new Euler(tilt * 0.55, 0, direction * tilt))
  matrix.setPosition(slot.position[0] + slide, slot.position[1] + diffuserYOffset - drop, slot.position[2])
  mesh.setMatrixAt(index, matrix)
}

export default function KnotLights() {
  const quality = useGraphicsQuality()
  const resetEpoch = useGallery(state => state.resetEpoch)
  const slots = useMemo(() => knotLightSlots(knotLayout, knotBays.length, knotGalleryBounds.height), [])
  const damage = useMemo(() => new KnotLightDamage(slots.length), [resetEpoch, slots.length])
  const time = useRef(0)
  const rowIntensities = useRef(new Float32Array(knotBays.length))
  const paneEmissionScales = useRef(new Float32Array(slots.length).fill(1))
  const [, redraw] = useReducer(value => value + 1, 0)
  // Three hashes built-in light IDs into every lit render object. Keep this light set stable across damage, or a hit recompiles the scene.
  const emitters = useMemo(() => {
    if (!quality) {
      return []
    }
    const width = diffuserSize[0] + knotLayout.itemSpacing * (knotLayout.maxRowLength - 1)
    return knotBays.map((_, row) => {
      const light = new RectAreaLight(ledEmissionColor, ledEmissionIntensity, width, diffuserSize[2])
      light.name = `knot-led-emission-row-${row}`
      light.position.set(knotLayout.rowCenterX(knotLayout.maxRowLength), knotGalleryBounds.height - knotLight.ceilingInset - 0.065, knotLayout.rowZ(row))
      light.lookAt(light.position.x, 0, light.position.z)
      return light
    })
  }, [quality])
  const resources = useMemo(() => {
    const housingGeometry = new RoundedBoxGeometry(...housingSize, 2, 0.045)
    const diffuserGeometry = new RoundedBoxGeometry(...diffuserSize, 2, 0.025)
    const intensities = new InstancedBufferAttribute(new Float32Array(slots.length).fill(1), 1)
    diffuserGeometry.setAttribute('lightIntensity', intensities)
    const diffuserMaterial = new MeshBasicNodeMaterial
    diffuserMaterial.name = 'Knot slot LED diffusers'
    diffuserMaterial.toneMapped = false
    const radial = length(uv().sub(vec2(0.5)))
    const center = float(1).sub(smoothstep(0.34, 0.7, radial))
    const intensity = attribute('lightIntensity', 'float')
    const luminance = intensity.mul(center.mul(0.2).add(0.8)).clamp()
    diffuserMaterial.colorNode = mix(color('#171916'), color('#fff3d8'), luminance)
    const deadTriangleGeometry = new BufferGeometry
    deadTriangleGeometry.setAttribute('position', new Float32BufferAttribute([
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    ], 3))
    const deadTriangleMaterial = new MeshBasicNodeMaterial({
      color: '#070806',
      side: DoubleSide,
    })
    deadTriangleMaterial.name = 'Knot slot LED dead triangles'
    deadTriangleMaterial.toneMapped = false
    const housingMaterial = new MeshStandardNodeMaterial({
      color: '#333936',
      roughness: 0.32,
      metalness: 0.18,
      envMapIntensity: 1.1,
    })
    housingMaterial.name = 'Knot slot LED housings'
    const diffuser = new InstancedMesh(diffuserGeometry, diffuserMaterial, slots.length)
    diffuser.name = 'knot-slot-led-diffusers'
    const deadTriangles = new InstancedMesh(deadTriangleGeometry, deadTriangleMaterial, slots.length)
    deadTriangles.name = 'knot-slot-led-dead-triangles'
    deadTriangles.frustumCulled = false
    const housings = new InstancedMesh(housingGeometry, housingMaterial, slots.length)
    housings.name = 'knot-slot-led-housings'
    const matrix = new Matrix4
    for (const [index, slot] of slots.entries()) {
      matrix.makeTranslation(slot.position[0], slot.position[1] + housingYOffset, slot.position[2])
      housings.setMatrixAt(index, matrix)
      setDiffuserMatrix(diffuser, index, slot, 0)
      hideDeadTriangle(deadTriangles, index)
    }
    housings.instanceMatrix.needsUpdate = true
    diffuser.instanceMatrix.needsUpdate = true
    deadTriangles.instanceMatrix.needsUpdate = true
    housings.computeBoundingBox()
    housings.computeBoundingSphere()
    diffuser.computeBoundingBox()
    diffuser.computeBoundingSphere()
    return {
      diffuser,
      diffuserGeometry,
      diffuserMaterial,
      deadTriangleGeometry,
      deadTriangleMaterial,
      deadTriangles,
      housingGeometry,
      housingMaterial,
      housings,
      intensities,
    }
  }, [slots])
  useEffect(() => {
    for (const [index, slot] of slots.entries()) {
      setDiffuserMatrix(resources.diffuser, index, slot, damage.stage(index))
    }
    for (let index = 0; index < slots.length; index++) {
      hideDeadTriangle(resources.deadTriangles, index)
    }
    paneEmissionScales.current.fill(1)
    resources.deadTriangles.instanceMatrix.needsUpdate = true
    resources.diffuser.instanceMatrix.needsUpdate = true
  }, [damage, resources.deadTriangles, resources.diffuser, slots])
  useEffect(() => () => {
    resources.diffuser.dispose()
    resources.deadTriangles.dispose()
    resources.housings.dispose()
    resources.diffuserGeometry.dispose()
    resources.deadTriangleGeometry.dispose()
    resources.housingGeometry.dispose()
    resources.diffuserMaterial.dispose()
    resources.deadTriangleMaterial.dispose()
    resources.housingMaterial.dispose()
  }, [resources])
  useFrame((_, delta) => {
    time.current += delta
    const values = resources.intensities.array as Float32Array
    const rows = rowIntensities.current
    rows.fill(0)
    let changed = false
    for (let index = 0; index < damage.count; index++) {
      const intensity = damage.intensity(index, time.current)
      rows[Math.floor(index / knotLayout.maxRowLength)] += intensity * paneEmissionScales.current[index]
      if (Math.abs(values[index] - intensity) > 0.001) {
        values[index] = intensity
        changed = true
      }
    }
    if (changed) {
      resources.intensities.needsUpdate = true
    }
    for (const [row, emitter] of emitters.entries()) {
      emitter.intensity = ledEmissionIntensity * rows[row] / knotLayout.maxRowLength
    }
  })
  const onImpact = (index: number, event: CollisionEnterPayload) => {
    const body = event.other.rigidBody
    if (!body) {
      return
    }
    const attack = bodyThrow(body)
    if (!attack) {
      return
    }
    const velocity = body.linvel()
    const mass = body.mass()
    const speed = collisionImpactSpeed(event, mass, Math.hypot(velocity.x, velocity.y, velocity.z))
    if (damage.hit(index, mass, speed, time.current, attack.id)) {
      const stage = damage.stage(index)
      if (stage === 1) {
        const impact = collisionImpactPoint(event, body.translation())
        const slot = slots[index]
        const fracture = knotLightFracture([
          (impact.x - slot.position[0]) / (diffuserSize[0] / 2),
          (impact.z - slot.position[2]) / (diffuserSize[2] / 2),
        ], [velocity.x, velocity.z], index)
        setDeadTriangleMatrix(resources.deadTriangles, index, slot, fracture.deadTriangle)
        paneEmissionScales.current[index] = fracture.liveFraction
        resources.deadTriangles.instanceMatrix.needsUpdate = true
      }
      if (stage === 2) {
        hideDeadTriangle(resources.deadTriangles, index)
        resources.deadTriangles.instanceMatrix.needsUpdate = true
      }
      setDiffuserMatrix(resources.diffuser, index, slots[index], stage)
      resources.diffuser.instanceMatrix.needsUpdate = true
      if (stage === 2) {
        redraw()
      }
    }
  }
  return <group name="knot-slot-lights">
    <primitive object={resources.housings}/>
    <primitive object={resources.diffuser}/>
    <primitive object={resources.deadTriangles}/>
    {emitters.map(light => <primitive key={light.name} object={light}/>)}
    <RigidBody type="fixed" colliders={false}>
      {slots.map((slot, index) => damage.stage(index) < 2 && <CuboidCollider key={slot.id} position={slot.position} args={[housingSize[0] / 2, knotLight.size[1] / 2, housingSize[2] / 2]} restitution={0.08} friction={0.6} onCollisionEnter={event => onImpact(index, event)}/>)}
    </RigidBody>
  </group>
}
