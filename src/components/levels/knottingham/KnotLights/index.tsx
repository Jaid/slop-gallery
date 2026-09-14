import type {KnotLightSlot, KnotLightStage} from '#src/lib/knots/KnotLights.ts'
import type {CollisionEnterPayload} from '@react-three/rapier'

import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo, useReducer, useRef} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {RectAreaLightTexturesLib} from 'three/addons/lights/RectAreaLightTexturesLib.js'
import {attribute, color, float, length, mix, smoothstep, uv, vec2} from 'three/tsl'
import {BufferGeometry, DoubleSide, Euler, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, Quaternion, RectAreaLight, RectAreaLightNode, Vector3} from 'three/webgpu'
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
const emitterYOffset = -0.001
const emitterThickness = 0.006
const diffuserTilt = [0, 0, 0.16] as const
const diffuserDrop = [0, 0, 0.09] as const
const deadMaskSurfaceY = emitterYOffset - emitterThickness / 2 - 0.001
const fractureSeamWidth = 0.005
const deadMaskOverlap = fractureSeamWidth * 0.55
type PlanarPoint = readonly [number, number]
const hideDamageGeometry = (mesh: InstancedMesh, index: number) => {
  mesh.setMatrixAt(index, (new Matrix4).makeScale(0, 0, 0))
}
const fractureWorldTriangle = (slot: KnotLightSlot, triangle: readonly [PlanarPoint, PlanarPoint, PlanarPoint]) => triangle.map(([x, z]) => [
  slot.position[0] + x * diffuserSize[0] / 2,
  slot.position[2] + z * diffuserSize[2] / 2,
]) as [[number, number], [number, number], [number, number]]
const fractureDeadNormal = (triangle: readonly [[number, number], [number, number], [number, number]]) => {
  const [[ax, az], [bx, bz], [cx, cz]] = triangle
  const edgeX = cx - bx
  const edgeZ = cz - bz
  const edgeLength = Math.hypot(edgeX, edgeZ) || 1
  let nx = -edgeZ / edgeLength
  let nz = edgeX / edgeLength
  const midpointX = (bx + cx) / 2
  const midpointZ = (bz + cz) / 2
  if ((ax - midpointX) * nx + (az - midpointZ) * nz < 0) {
    nx = -nx
    nz = -nz
  }
  return [nx, nz] as const
}
const setDeadMaskMatrix = (mesh: InstancedMesh, index: number, slot: KnotLightSlot, triangle: readonly [PlanarPoint, PlanarPoint, PlanarPoint]) => {
  const worldTriangle = fractureWorldTriangle(slot, triangle)
  const [[ax, az], [bx, bz], [cx, cz]] = worldTriangle
  const [deadNormalX, deadNormalZ] = fractureDeadNormal(worldTriangle)
  const overlapX = -deadNormalX * deadMaskOverlap
  const overlapZ = -deadNormalZ * deadMaskOverlap
  const matrix = (new Matrix4).set(bx + overlapX - ax, 0, cx + overlapX - ax, ax, 0, 1, 0, slot.position[1] + deadMaskSurfaceY, bz + overlapZ - az, 0, cz + overlapZ - az, az, 0, 0, 0, 1)
  mesh.setMatrixAt(index, matrix)
}
const setFractureSeamMatrix = (mesh: InstancedMesh, index: number, slot: KnotLightSlot, triangle: readonly [PlanarPoint, PlanarPoint, PlanarPoint]) => {
  const worldTriangle = fractureWorldTriangle(slot, triangle)
  const [, [bx, bz], [cx, cz]] = worldTriangle
  const [deadNormalX, deadNormalZ] = fractureDeadNormal(worldTriangle)
  const matrix = (new Matrix4).set(cx - bx, 0, deadNormalX * fractureSeamWidth, bx, 0, 1, 0, slot.position[1] + deadMaskSurfaceY - 0.001, cz - bz, 0, deadNormalZ * fractureSeamWidth, bz, 0, 0, 0, 1)
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
    const emitterGeometry = new RoundedBoxGeometry(diffuserSize[0] - 0.08, emitterThickness, diffuserSize[2] - 0.08, 1, 0.012)
    const intensities = new InstancedBufferAttribute(new Float32Array(slots.length).fill(1), 1)
    emitterGeometry.setAttribute('lightIntensity', intensities)
    const emitterMaterial = new MeshBasicNodeMaterial
    emitterMaterial.name = 'Knot slot LED emitter sheets'
    emitterMaterial.toneMapped = false
    const radial = length(uv().sub(vec2(0.5)))
    const center = float(1).sub(smoothstep(0.34, 0.7, radial))
    const intensity = attribute('lightIntensity', 'float')
    const luminance = intensity.mul(center.mul(0.16).add(0.84)).clamp()
    emitterMaterial.colorNode = mix(color('#181a17'), color('#fff3d8'), luminance)
    const diffuserMaterial = quality ? new MeshPhysicalNodeMaterial({
      color: '#f4eee2',
      roughness: 0.46,
      metalness: 0,
      transmission: 0.5,
      ior: 1.46,
      thickness: diffuserSize[1],
      attenuationColor: '#fff0d2',
      attenuationDistance: 0.18,
      clearcoat: 0.18,
      clearcoatRoughness: 0.38,
      envMapIntensity: 0.55,
    }) : new MeshStandardNodeMaterial({
      color: '#ece6dc',
      roughness: 0.72,
      metalness: 0,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      envMapIntensity: 0,
    })
    diffuserMaterial.name = 'Knot slot LED continuous diffuser lenses'
    const deadMaskGeometry = new BufferGeometry
    deadMaskGeometry.setAttribute('position', new Float32BufferAttribute([
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
    const deadMaskMaterial = new MeshBasicNodeMaterial({
      color: '#3f403a',
      side: DoubleSide,
    })
    deadMaskMaterial.name = 'Knot slot LED dead internal masks'
    deadMaskMaterial.toneMapped = false
    const fractureSeamGeometry = new BufferGeometry
    fractureSeamGeometry.setAttribute('position', new Float32BufferAttribute([
      0,
      0,
      -0.5,
      1,
      0,
      -0.5,
      1,
      0,
      0.5,
      0,
      0,
      0.5,
    ], 3))
    fractureSeamGeometry.setIndex([0, 1, 2, 0, 2, 3])
    const fractureSeamMaterial = new MeshBasicNodeMaterial({
      color: '#171813',
      side: DoubleSide,
    })
    fractureSeamMaterial.name = 'Knot slot LED internal fracture seams'
    fractureSeamMaterial.toneMapped = false
    const housingMaterial = new MeshStandardNodeMaterial({
      color: '#333936',
      roughness: 0.32,
      metalness: 0.18,
      envMapIntensity: 1.1,
    })
    housingMaterial.name = 'Knot slot LED housings'
    const diffuser = new InstancedMesh(diffuserGeometry, diffuserMaterial, slots.length)
    diffuser.name = 'knot-slot-led-diffuser-lenses'
    diffuser.renderOrder = 3
    const emitterPanels = new InstancedMesh(emitterGeometry, emitterMaterial, slots.length)
    emitterPanels.name = 'knot-slot-led-emitter-sheets'
    const deadMasks = new InstancedMesh(deadMaskGeometry, deadMaskMaterial, slots.length)
    deadMasks.name = 'knot-slot-led-dead-masks'
    deadMasks.frustumCulled = false
    const fractureSeams = new InstancedMesh(fractureSeamGeometry, fractureSeamMaterial, slots.length)
    fractureSeams.name = 'knot-slot-led-fracture-seams'
    fractureSeams.frustumCulled = false
    const housings = new InstancedMesh(housingGeometry, housingMaterial, slots.length)
    housings.name = 'knot-slot-led-housings'
    const matrix = new Matrix4
    for (const [index, slot] of slots.entries()) {
      matrix.makeTranslation(slot.position[0], slot.position[1] + housingYOffset, slot.position[2])
      housings.setMatrixAt(index, matrix)
      matrix.makeTranslation(slot.position[0], slot.position[1] + emitterYOffset, slot.position[2])
      emitterPanels.setMatrixAt(index, matrix)
      setDiffuserMatrix(diffuser, index, slot, 0)
      hideDamageGeometry(deadMasks, index)
      hideDamageGeometry(fractureSeams, index)
    }
    housings.instanceMatrix.needsUpdate = true
    emitterPanels.instanceMatrix.needsUpdate = true
    diffuser.instanceMatrix.needsUpdate = true
    deadMasks.instanceMatrix.needsUpdate = true
    fractureSeams.instanceMatrix.needsUpdate = true
    housings.computeBoundingBox()
    housings.computeBoundingSphere()
    emitterPanels.computeBoundingBox()
    emitterPanels.computeBoundingSphere()
    diffuser.computeBoundingBox()
    diffuser.computeBoundingSphere()
    return {
      diffuser,
      diffuserGeometry,
      diffuserMaterial,
      emitterGeometry,
      emitterMaterial,
      emitterPanels,
      deadMaskGeometry,
      deadMaskMaterial,
      deadMasks,
      fractureSeamGeometry,
      fractureSeamMaterial,
      fractureSeams,
      housingGeometry,
      housingMaterial,
      housings,
      intensities,
    }
  }, [quality, slots])
  useEffect(() => {
    for (const [index, slot] of slots.entries()) {
      setDiffuserMatrix(resources.diffuser, index, slot, damage.stage(index))
    }
    for (let index = 0; index < slots.length; index++) {
      hideDamageGeometry(resources.deadMasks, index)
      hideDamageGeometry(resources.fractureSeams, index)
    }
    paneEmissionScales.current.fill(1)
    resources.deadMasks.instanceMatrix.needsUpdate = true
    resources.fractureSeams.instanceMatrix.needsUpdate = true
    resources.diffuser.instanceMatrix.needsUpdate = true
  }, [damage, resources.deadMasks, resources.fractureSeams, resources.diffuser, slots])
  useEffect(() => () => {
    resources.diffuser.dispose()
    resources.emitterPanels.dispose()
    resources.deadMasks.dispose()
    resources.fractureSeams.dispose()
    resources.housings.dispose()
    resources.diffuserGeometry.dispose()
    resources.emitterGeometry.dispose()
    resources.deadMaskGeometry.dispose()
    resources.fractureSeamGeometry.dispose()
    resources.housingGeometry.dispose()
    resources.diffuserMaterial.dispose()
    resources.emitterMaterial.dispose()
    resources.deadMaskMaterial.dispose()
    resources.fractureSeamMaterial.dispose()
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
        setDeadMaskMatrix(resources.deadMasks, index, slot, fracture.deadTriangle)
        setFractureSeamMatrix(resources.fractureSeams, index, slot, fracture.deadTriangle)
        paneEmissionScales.current[index] = fracture.liveFraction
        resources.deadMasks.instanceMatrix.needsUpdate = true
        resources.fractureSeams.instanceMatrix.needsUpdate = true
      }
      if (stage === 2) {
        hideDamageGeometry(resources.deadMasks, index)
        hideDamageGeometry(resources.fractureSeams, index)
        resources.deadMasks.instanceMatrix.needsUpdate = true
        resources.fractureSeams.instanceMatrix.needsUpdate = true
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
    <primitive object={resources.emitterPanels}/>
    <primitive object={resources.deadMasks}/>
    <primitive object={resources.fractureSeams}/>
    <primitive object={resources.diffuser}/>
    {emitters.map(light => <primitive key={light.name} object={light}/>)}
    <RigidBody type="fixed" colliders={false}>
      {slots.map((slot, index) => damage.stage(index) < 2 && <CuboidCollider key={slot.id} position={slot.position} args={[housingSize[0] / 2, knotLight.size[1] / 2, housingSize[2] / 2]} restitution={0.08} friction={0.6} onCollisionEnter={event => onImpact(index, event)}/>)}
    </RigidBody>
  </group>
}
