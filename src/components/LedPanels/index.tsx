import type {KnotLightImpact} from '#src/lib/physics/KnotLightImpacts.ts'
import type {KnotLightSlot} from 'knot-materials/KnotLights.ts'

import {useFrame} from '@react-three/fiber'
import {CuboidCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import KnotLightPanels, {knotLightDiffuserContactSkin, knotLightDiffuserSize, knotLightDiffuserY, knotLightHousingSize, knotLightHousingY} from 'knot-materials/KnotLightPanels.ts'
import KnotLightDamage, {knotLightFracture} from 'knot-materials/KnotLights.ts'
import {useMemo, useRef, useState} from 'react'

import {useGallery} from '#src/lib/gallery.ts'
import KnotLightImpacts from '#src/lib/physics/KnotLightImpacts.ts'

type LedPanelsProps = {
  /** prefix for the group, instanced meshes and fallen diffusers */
  name: string
  /**
   * Receives every pane’s current brightness once per frame: 1 when intact, flickering after a crack (scaled by the lit share
   * of the diffuser) and 0 once the diffuser fell. Scene lights follow it by intensity, which avoids recompiling lit materials.
   */
  onBrightness?: (brightness: Float32Array) => void
  slots: ReadonlyArray<KnotLightSlot>
}

/** Mean brightness of a group of panes, for a light that stands in for all of them. */
export function meanBrightness(brightness: Float32Array, panes: ReadonlyArray<number>) {
  if (!panes.length) {
    return 0
  }
  let sum = 0
  for (const index of panes) {
    sum += brightness[index]
  }
  return sum / panes.length
}

/** Ceiling LED panes that flicker after one energetic thrown hit and drop their diffuser after the second. */
export default function LedPanels(props: LedPanelsProps) {
  const resetEpoch = useGallery(state => state.resetEpoch)
  return <LedPanelSystem key={resetEpoch} {...props} />
}

function LedPanelSystem({name, onBrightness, slots}: LedPanelsProps) {
  const damage = useMemo(() => new KnotLightDamage(slots.length), [slots.length])
  const panels = useDisposable(useMemo(() => new KnotLightPanels(slots, `${name}-led`), [name, slots]))
  const impacts = useMemo(() => new KnotLightImpacts, [])
  const time = useRef(0)
  const brightness = useRef(new Float32Array(slots.length))
  const [broken, setBroken] = useState<ReadonlySet<number>>(() => new Set)
  useBeforePhysicsStep(world => impacts.capture(world))
  useFrame((_, delta) => {
    time.current += delta
    const live = brightness.current
    for (let index = 0; index < slots.length; index++) {
      const intensity = damage.intensity(index, time.current)
      panels.setIntensity(index, intensity)
      live[index] = intensity * panels.liveFractions[index]
    }
    onBrightness?.(live)
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
  return <group name={`${name}-lights`}>
    <primitive object={panels.housings} />
    <primitive object={panels.diffusers} />
    <RigidBody colliders={false} type='fixed'>
      {slots.map((slot, index) => <group key={slot.id} position={slot.position}>
        <CuboidCollider args={[knotLightHousingSize[0] / 2, knotLightHousingSize[1] / 2, knotLightHousingSize[2] / 2]} friction={0.6} position={[0, knotLightHousingY, 0]} restitution={0.08} ref={collider => impacts.register(collider, index)} />
        {!broken.has(index) && <CuboidCollider args={[knotLightDiffuserSize[0] / 2, knotLightDiffuserSize[1] / 2, knotLightDiffuserSize[2] / 2]} contactSkin={knotLightDiffuserContactSkin} position={[0, knotLightDiffuserY, 0]} restitution={0.08} ref={collider => impacts.register(collider, index)} />}
      </group>)}
    </RigidBody>
    {slots.map((slot, index) => broken.has(index) && <RigidBody key={slot.id} angularDamping={0.4} ccd colliders={false} position={[slot.position[0], slot.position[1] + knotLightDiffuserY, slot.position[2]]}>
      <CuboidCollider args={[knotLightDiffuserSize[0] / 2, knotLightDiffuserSize[1] / 2, knotLightDiffuserSize[2] / 2]} contactSkin={knotLightDiffuserContactSkin} friction={0.7} mass={0.35} restitution={0.1} />
      <mesh castShadow dispose={null} geometry={panels.diffuserGeometry} material={panels.debrisMaterial} name={`${name}-led-fallen-diffuser-${slot.id}`} receiveShadow />
    </RigidBody>)}
  </group>
}
