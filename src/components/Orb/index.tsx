import type {Vec3} from '#src/lib/gallery.ts'
import type {Orb as OrbKind} from '#src/lib/gallery/orbs/index.ts'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import {orbRadius} from '#src/lib/gallery/orbs/index.ts'
import {environmentSeed} from '#src/lib/gameSeed.ts'

/** A glass ball, filled with its orb’s scene if it has one, which rolls when knocked, casts its orb’s mood over the world while held and is an ingredient of the fusion of a portrait it is thrown into, contributing whatever its orb contributes, and used up by its success. */
export default function Orb({id, orb, position}: {
  /** its prop’s id, unique in the world, the orb’s own prop id by default */
  id?: string
  orb: OrbKind
  position: Vec3
}) {
  const material = useDisposable(useMemo(() => orb.createMaterial({radius: orbRadius}), [orb]))
  const ingredient = useMemo(() => orb.ingredient(environmentSeed), [orb])
  return <GrabbableProp id={id ?? orb.propId} colliders='ball' consumable ingredient={ingredient} mood={orb.mood} orbit={{radius: orbRadius * 1.3}} position={position} title={orb.title} type='dynamic'>
    <mesh castShadow material={material}><sphereGeometry args={[orbRadius, 96, 64]} /></mesh>
  </GrabbableProp>
}
