import type {Vec3} from '#src/lib/gallery.ts'
import type {Orb as OrbKind} from '#src/lib/gallery/orbs/index.ts'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import {orbRadius} from '#src/lib/gallery/orbs/index.ts'
import {environmentSeed} from '#src/lib/gameSeed.ts'

/** A glass ball filled with its orb’s scene, which rolls when knocked and reworks a work it is thrown into by the orb’s prompt. */
export default function Orb({orb, position}: {
  orb: OrbKind
  position: Vec3
}) {
  const material = useDisposable(useMemo(() => orb.createMaterial({radius: orbRadius}), [orb]))
  const spell = useMemo(() => ({
    color: orb.color,
    prompt: orb.prompt(environmentSeed),
  }), [orb])
  return <GrabbableProp id={orb.propId} colliders='ball' orb={spell} orbit={{radius: orbRadius * 1.3}} position={position} title={orb.title} type='dynamic'>
    <mesh castShadow material={material}><sphereGeometry args={[orbRadius, 96, 64]} /></mesh>
  </GrabbableProp>
}
