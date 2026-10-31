import type {Vec3} from '#src/lib/gallery.ts'
import type {OrbKind} from '#src/lib/gallery/orbs.ts'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshPhysicalNodeMaterial} from 'three/webgpu'

import GrabbableProp from '#src/components/Scene/GrabbableProp.tsx'
import {orbRadius} from '#src/lib/gallery/orbs.ts'

/** A glossy ball glowing faintly in its orb’s color, which rolls when knocked and reworks a work it is thrown into by the orb’s prompt. */
export default function Orb({orb, position}: {
  orb: OrbKind
  position: Vec3
}) {
  const material = useDisposable(useMemo(() => new MeshPhysicalNodeMaterial({
    color: orb.color,
    emissive: orb.color,
    emissiveIntensity: 0.12,
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    sheen: 1,
    sheenColor: orb.color,
  }), [orb.color]))
  return <GrabbableProp id={`prop-orb-${orb.id}`} colliders='ball' orb={orb} orbit={{radius: orbRadius * 1.3}} position={position} title={orb.title} type='dynamic'>
    <mesh castShadow material={material}><sphereGeometry args={[orbRadius, 48, 32]} /></mesh>
  </GrabbableProp>
}
