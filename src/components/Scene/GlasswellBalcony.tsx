import type {Material} from 'three/webgpu'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {GlasswellBalconyGeometry} from '#src/lib/gallery/GlasswellBalconyGeometry.ts'

export default function GlasswellBalcony({material}: {material: Material}) {
  const geometry = useMemo(() => new GlasswellBalconyGeometry, [])
  const collision = useMemo(() => colliderGeometry(geometry), [geometry])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <RigidBody type="fixed" colliders={false}>
    <TrimeshCollider args={collision}/>
    <mesh name="glasswell-balcony" geometry={geometry} material={material} castShadow receiveShadow/>
  </RigidBody>
}
