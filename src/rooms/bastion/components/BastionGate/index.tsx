import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {bastionLinkGate} from '#src/lib/gallery/bastionNetwork.ts'
import gateGeometry from '#src/lib/gallery/gateGeometry.ts'

/** The iron gate barring the connecting tunnel where it opens into the western mouth’s elbow, standing on the tunnel’s floor a step under the hollow in front of it, with the mouse hole at its foot that lets orbs through. */
export default function BastionGate() {
  const bars = useDisposable(useMemo(() => gateGeometry(bastionLinkGate), []))
  const collision = useMemo(() => colliderGeometry(bars), [bars])
  // The apse’s wrought iron.
  const iron = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#2a2724',
    metalness: 0.75,
    roughness: 0.5,
    envMapIntensity: 0.3,
  }), []))
  return <RigidBody colliders={false} name='bastion-link-gate' type='fixed'>
    <TrimeshCollider args={collision} />
    <mesh castShadow geometry={bars} material={iron} name='bastion-link-gate-bars' receiveShadow />
  </RigidBody>
}
