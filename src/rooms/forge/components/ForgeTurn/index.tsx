import {CoefficientCombineRule} from '@dimforge/rapier3d-compat'
import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import ForgeTurnGeometry from '#src/lib/gallery/ForgeTurnGeometry.ts'

/** The redirection pipe in the Forge’s vestibule, which takes in the cannon’s shot low on the north wall, loops round behind the wall and lets the orb out again low on the east side, rolling toward the Bastion. */
export default function ForgeTurn() {
  const parts = useDisposable(useMemo(() => new ForgeTurnGeometry, []))
  const collision = useMemo(() => colliderGeometry(parts.collision), [parts])
  const brass = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#a88a56',
    metalness: 0.8,
    roughness: 0.28,
  }), []))
  // Polished smooth inside, the orb slides round it without rolling, and pressed onto it by the bends, without bouncing.
  return <RigidBody colliders={false} name='forge-turn' type='fixed'>
    <MeshSurfaceCollider args={collision} friction={0} frictionCombineRule={CoefficientCombineRule.Min} restitution={0} restitutionCombineRule={CoefficientCombineRule.Min} />
    <mesh castShadow geometry={parts.pipe} material={brass} name='forge-turn-pipe' receiveShadow />
  </RigidBody>
}
