import type {KnotLightImpact} from '#src/lib/physics/KnotLightImpacts.ts'

import {useFrame} from '@react-three/fiber/webgpu'
import {CuboidCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {knotBays, knotLayout} from 'knot-materials/exhibition.ts'
import KnotLightPanels, {knotLightColor, knotLightDiffuserContactSkin, knotLightDiffuserSize, knotLightDiffuserY, knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'
import KnotLightDamage, {knotLight, knotLightFracture, knotLightSlots} from 'knot-materials/KnotLights.ts'
import {useMemo, useRef, useState} from 'react'
import {RectAreaLightTexturesLib} from 'three/addons/lights/RectAreaLightTexturesLib.js'
import {RectAreaLight, RectAreaLightNode} from 'three/webgpu'
import useGraphicsQuality from 'use-graphics-quality'

import {useGallery} from '#src/lib/gallery.ts'
import {knotGalleryBounds} from '#src/lib/gallery/knotGallery.ts'
import KnotLightImpacts from '#src/lib/physics/KnotLightImpacts.ts'

RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init())
const ledEmissionIntensity = 1.35

export default function KnotLights() {
  const resetEpoch = useGallery(state => state.resetEpoch)
  return <KnotLightSystem key={resetEpoch} />
}

function KnotLightSystem() {
  const quality = useGraphicsQuality()
  const slots = useMemo(() => knotLightSlots(knotLayout, knotBays.length, knotGalleryBounds.height), [])
  const damage = useMemo(() => new KnotLightDamage(slots.length), [slots.length])
  const panels = useDisposable(useMemo(() => new KnotLightPanels(slots), [slots]))
  const impacts = useMemo(() => new KnotLightImpacts, [])
  const time = useRef(0)
  const rowIntensities = useRef(new Float32Array(knotBays.length))
  const [broken, setBroken] = useState<ReadonlySet<number>>(() => new Set)
  // Changing intensity rather than adding/removing lights avoids recompiling every lit material on a hit.
  const emitters = useMemo(() => {
    const width = knotLightDiffuserSize[0] + knotLayout.itemSpacing * (knotLayout.maxRowLength - 1)
    return knotBays.map((_, row) => {
      const light = new RectAreaLight(knotLightColor, ledEmissionIntensity, width, knotLightDiffuserSize[2])
      light.name = `knot-led-emission-row-${row}`
      light.position.set(knotLayout.rowCenterX(knotLayout.maxRowLength), knotGalleryBounds.height - knotLight.ceilingInset - 0.065, knotLayout.rowZ(row))
      light.lookAt(light.position.x, 0, light.position.z)
      return light
    })
  }, [])
  useBeforePhysicsStep(world => impacts.capture(world))
  useFrame((_, delta) => {
    time.current += delta
    const rows = rowIntensities.current
    rows.fill(0)
    for (const [index, slot] of slots.entries()) {
      const intensity = damage.intensity(index, time.current)
      panels.setIntensity(index, intensity)
      rows[slot.row] += intensity * panels.liveFractions[index]
    }
    for (const [row, emitter] of emitters.entries()) {
      emitter.intensity = ledEmissionIntensity * rows[row] / knotLayout.maxRowLength
    }
  })
  const onImpact = (index: number, impact: KnotLightImpact) => {
    if (!damage.hit(index, impact.mass, impact.speed, time.current, impact.attackId)) {
      return
    }
    if (damage.stage(index) === 1) {
      const slot = slots[index]
      panels.fracture(index, knotLightFracture([
        (impact.point.x - slot.position[0]) / (knotLightDiffuserSize[0] / 2),
        (impact.point.z - slot.position[2]) / (knotLightDiffuserSize[2] / 2),
      ], [impact.velocity.x, impact.velocity.z], index))
    } else {
      panels.break(index)
      setBroken(previous => new Set([...previous, index]))
    }
  }
  useAfterPhysicsStep(world => impacts.collect(world, onImpact))
  return <group name='knot-slot-lights'>
    <primitive object={panels.housings} />
    <primitive object={panels.diffusers} />
    {quality && emitters.map(light => <primitive key={light.name} object={light} />)}
    <RigidBody colliders={false} type='fixed'>
      {slots.map((slot, index) => <group key={slot.id} position={slot.position}>
        <CuboidCollider args={[knotLightHousingSize[0] / 2, knotLightHousingSize[1] / 2, knotLightHousingSize[2] / 2]} friction={0.6} position={[0, knotLightHousingY, 0]} restitution={0.08} ref={collider => impacts.register(collider, index)} />
        {!broken.has(index) && <CuboidCollider args={[knotLightDiffuserSize[0] / 2, knotLightDiffuserSize[1] / 2, knotLightDiffuserSize[2] / 2]} contactSkin={knotLightDiffuserContactSkin} position={[0, knotLightDiffuserY, 0]} restitution={0.08} ref={collider => impacts.register(collider, index)} />}
      </group>)}
    </RigidBody>
    {slots.map((slot, index) => broken.has(index) && <RigidBody key={slot.id} angularDamping={0.4} ccd colliders={false} position={[slot.position[0], slot.position[1] + knotLightDiffuserY, slot.position[2]]}>
      <CuboidCollider args={[knotLightDiffuserSize[0] / 2, knotLightDiffuserSize[1] / 2, knotLightDiffuserSize[2] / 2]} contactSkin={knotLightDiffuserContactSkin} friction={0.7} mass={0.35} restitution={0.1} />
      <mesh castShadow dispose={null} geometry={panels.diffuserGeometry} material={panels.debrisMaterial} name={`knot-led-fallen-diffuser-${slot.id}`} receiveShadow />
    </RigidBody>)}
  </group>
}
