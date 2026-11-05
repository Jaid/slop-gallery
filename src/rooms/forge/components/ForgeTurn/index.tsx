import {CoefficientCombineRule} from '@dimforge/rapier3d-compat'
import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import ForgeTurnGeometry from '#src/lib/gallery/ForgeTurnGeometry.ts'

/** The north-wall pipe turns the cannon’s shot smoothly toward the Bastion, without a backstop or a drop into a gutter. */
export default function ForgeTurn() {
  const parts = useDisposable(useMemo(() => new ForgeTurnGeometry, []))
  const collision = useMemo(() => colliderGeometry(parts.collision), [parts])
  const materials = useDisposable(useMemo(() => {
    const brass = new MeshStandardNodeMaterial({
      color: '#a88a56',
      metalness: 0.8,
      roughness: 0.28,
    })
    const iron = new MeshStandardNodeMaterial({
      color: '#4c463c',
      metalness: 0.2,
      roughness: 0.7,
    })
    return {
      brass,
      iron,
      dispose() {
        brass.dispose()
        iron.dispose()
      },
    }
  }, []))
  return <RigidBody colliders={false} name='forge-turn' type='fixed'>
    <MeshSurfaceCollider args={collision} friction={0} frictionCombineRule={CoefficientCombineRule.Min} restitution={0.2} restitutionCombineRule={CoefficientCombineRule.Min} />
    <mesh castShadow geometry={parts.pipe} material={materials.brass} name='forge-turn-pipe' receiveShadow />
    <mesh castShadow geometry={parts.brackets} material={materials.iron} name='forge-turn-brackets' receiveShadow />
  </RigidBody>
}
