import type {KnotLightSlot, KnotLightStage} from '#src/lib/knots/KnotLights.ts'
import type {CollisionEnterPayload} from '@react-three/rapier'

import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo, useReducer, useRef} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {RectAreaLightTexturesLib} from 'three/addons/lights/RectAreaLightTexturesLib.js'
import {attribute, color, float, length, mix, positionLocal, smoothstep, uv, vec2} from 'three/tsl'
import {Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicNodeMaterial, MeshStandardNodeMaterial, RectAreaLight, RectAreaLightNode} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import {useGallery} from '#src/lib/gallery.ts'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'
import {knotBays, knotLayout} from '#src/lib/knots/exhibition.ts'
import KnotLightDamage, {knotLight, knotLightFracture, knotLightSlots} from '#src/lib/knots/KnotLights.ts'

RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init())
const ledEmissionColor = '#fff3d8'
const ledEmissionIntensity = 1.35
const housingSize = [knotLight.size[0] + 0.16, 0.1, knotLight.size[2] + 0.16] as const
const diffuserSize = [knotLight.size[0] - 0.12, 0.038, knotLight.size[2] - 0.12] as const
const housingYOffset = 0.025
const diffuserYOffset = -0.026
const diffuserTilt = [0, 0.055, 0.16] as const
const diffuserDrop = [0, 0.035, 0.09] as const
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
    const fracturePoints = new InstancedBufferAttribute(new Float32Array(slots.length * 2), 2)
    const fractureNormals = new InstancedBufferAttribute(new Float32Array(slots.length * 2), 2)
    const fractureActive = new InstancedBufferAttribute(new Float32Array(slots.length), 1)
    for (let index = 0; index < slots.length; index++) {
      fractureNormals.setXY(index, 1, 0)
    }
    diffuserGeometry.setAttribute('lightIntensity', intensities)
    diffuserGeometry.setAttribute('fracturePoint', fracturePoints)
    diffuserGeometry.setAttribute('fractureNormal', fractureNormals)
    diffuserGeometry.setAttribute('fractureActive', fractureActive)
    const diffuserMaterial = new MeshBasicNodeMaterial
    diffuserMaterial.name = 'Knot slot LED diffusers'
    diffuserMaterial.toneMapped = false
    const radial = length(uv().sub(vec2(0.5)))
    const center = float(1).sub(smoothstep(0.34, 0.7, radial))
    const intensity = attribute('lightIntensity', 'float')
    const fracture = attribute('fractureActive', 'float')
    const fracturePoint = attribute('fracturePoint', 'vec2')
    const fractureNormal = attribute('fractureNormal', 'vec2')
    const localPlanar = positionLocal.xz.div(vec2(diffuserSize[0] / 2, diffuserSize[2] / 2))
    const fractureDistance = localPlanar.sub(fracturePoint).dot(fractureNormal)
    const dead = fractureDistance.smoothstep(-0.012, 0.012).mul(fracture)
    const live = dead.oneMinus()
    const seam = fractureDistance.abs().smoothstep(0.006, 0.028).oneMinus().mul(fracture).mul(intensity)
    const luminance = intensity.mul(center.mul(0.2).add(0.8)).mul(live).add(seam.mul(0.62)).clamp()
    const unlit = mix(color('#171916'), color('#070806'), dead.mul(0.9))
    diffuserMaterial.colorNode = mix(unlit, color('#fff3d8'), luminance)
    const housingMaterial = new MeshStandardNodeMaterial({
      color: '#333936',
      roughness: 0.32,
      metalness: 0.18,
      envMapIntensity: 1.1,
    })
    housingMaterial.name = 'Knot slot LED housings'
    const diffuser = new InstancedMesh(diffuserGeometry, diffuserMaterial, slots.length)
    diffuser.name = 'knot-slot-led-diffusers'
    const housings = new InstancedMesh(housingGeometry, housingMaterial, slots.length)
    housings.name = 'knot-slot-led-housings'
    const matrix = new Matrix4
    for (const [index, slot] of slots.entries()) {
      matrix.makeTranslation(slot.position[0], slot.position[1] + housingYOffset, slot.position[2])
      housings.setMatrixAt(index, matrix)
      setDiffuserMatrix(diffuser, index, slot, 0)
    }
    housings.instanceMatrix.needsUpdate = true
    diffuser.instanceMatrix.needsUpdate = true
    housings.computeBoundingBox()
    housings.computeBoundingSphere()
    diffuser.computeBoundingBox()
    diffuser.computeBoundingSphere()
    return {
      diffuser,
      diffuserGeometry,
      diffuserMaterial,
      housingGeometry,
      fractureActive,
      fractureNormals,
      fracturePoints,
      housingMaterial,
      housings,
      intensities,
    }
  }, [slots])
  useEffect(() => {
    for (const [index, slot] of slots.entries()) {
      setDiffuserMatrix(resources.diffuser, index, slot, damage.stage(index))
    }
    const fractureActive = resources.fractureActive.array as Float32Array
    fractureActive.fill(0)
    paneEmissionScales.current.fill(1)
    resources.fractureActive.needsUpdate = true
    resources.diffuser.instanceMatrix.needsUpdate = true
  }, [damage, resources.diffuser, resources.fractureActive, slots])
  useEffect(() => () => {
    resources.diffuser.dispose()
    resources.housings.dispose()
    resources.diffuserGeometry.dispose()
    resources.housingGeometry.dispose()
    resources.diffuserMaterial.dispose()
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
    const velocity = body.linvel()
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z)
    if (damage.hit(index, body.mass(), speed, time.current)) {
      const stage = damage.stage(index)
      if (stage === 1) {
        const fallback = body.translation()
        let contactX = 0
        let contactZ = 0
        let contacts = 0
        for (let contact = 0; contact < event.manifold.numSolverContacts(); contact++) {
          const point = event.manifold.solverContactPoint(contact)
          if (point) {
            contactX += point.x
            contactZ += point.z
            contacts++
          }
        }
        if (contacts === 0) {
          contactX = fallback.x
          contactZ = fallback.z
          contacts = 1
        }
        const slot = slots[index]
        const fracture = knotLightFracture([
          (contactX / contacts - slot.position[0]) / (diffuserSize[0] / 2),
          (contactZ / contacts - slot.position[2]) / (diffuserSize[2] / 2),
        ], [velocity.x, velocity.z], index)
        resources.fracturePoints.setXY(index, ...fracture.point)
        resources.fractureNormals.setXY(index, ...fracture.normal)
        paneEmissionScales.current[index] = fracture.liveFraction
        resources.fractureActive.setX(index, 1)
        resources.fracturePoints.needsUpdate = true
        resources.fractureNormals.needsUpdate = true
        resources.fractureActive.needsUpdate = true
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
    {emitters.map(light => <primitive key={light.name} object={light}/>)}
    <RigidBody type="fixed" colliders={false}>
      {slots.map((slot, index) => damage.stage(index) < 2 && <CuboidCollider key={slot.id} position={slot.position} args={[knotLight.size[0] / 2, knotLight.size[1] / 2, knotLight.size[2] / 2]} restitution={0.08} friction={0.6} onCollisionEnter={event => onImpact(index, event)}/>)}
    </RigidBody>
  </group>
}
