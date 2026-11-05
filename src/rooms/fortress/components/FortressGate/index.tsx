import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {fortressLinkGate} from '#src/lib/gallery/fortressNetwork.ts'
import gateGeometry from '#src/lib/gallery/gateGeometry.ts'

/** The iron gate barring the connecting tunnel where it opens into the western mouth’s elbow, with the mouse hole at its foot that lets orbs through. */
export default function FortressGate() {
  const bars = useDisposable(useMemo(() => gateGeometry(fortressLinkGate), []))
  const collision = useMemo(() => colliderGeometry(bars), [bars])
  // The apse’s wrought iron.
  const iron = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#2a2724',
    metalness: 0.75,
    roughness: 0.5,
    envMapIntensity: 0.3,
  }), []))
  return <RigidBody colliders={false} name='fortress-link-gate' type='fixed'>
    <TrimeshCollider args={collision} />
    <mesh castShadow geometry={bars} material={iron} name='fortress-link-gate-bars' receiveShadow />
  </RigidBody>
}
