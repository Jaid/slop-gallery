import {CoefficientCombineRule} from '@dimforge/rapier3d-compat'
import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {forgeGutter, forgeHopper} from '#src/lib/gallery/forgeGutter.ts'
import GutterGeometry from '#src/lib/gallery/GutterGeometry.ts'
import HopperGeometry from '#src/lib/gallery/HopperGeometry.ts'
import GrainedWoodMaterial from '#src/lib/materials/GrainedWoodMaterial.ts'
import LeatherMaterial from '#src/lib/materials/LeatherMaterial.ts'

const {backstop, funnel} = forgeHopper
const [funnelX] = funnel.center

/** The brass gutter in the Forge’s vestibule on its iron hangers, and over its head the hopper behind the round opening the alchemy machine’s cannon shoots through: a padded backstop that stops every orb dead and a brass funnel that drops it into the gutter. */
export default function ForgeGutter() {
  const parts = useDisposable(useMemo(() => {
    const gutter = new GutterGeometry(forgeGutter)
    const hopper = new HopperGeometry
    return {
      gutter,
      hopper,
      gutterCollision: colliderGeometry(gutter.collision),
      funnelCollision: colliderGeometry(hopper.funnel.collision),
      dispose() {
        gutter.dispose()
        hopper.dispose()
      },
    }
  }, []))
  const materials = useDisposable(useMemo(() => {
    const brass = new MeshStandardNodeMaterial({
      color: '#a88a56',
      metalness: 0.8,
      roughness: 0.38,
    })
    // The rooflights’ painted cast iron.
    const iron = new MeshStandardNodeMaterial({
      color: '#4c463c',
      metalness: 0.2,
      roughness: 0.7,
    })
    const oak = new GrainedWoodMaterial({
      heartwood: ['#5e3a1c', '#8c5f33'],
      latewood: '#3b2412',
    }, {roughness: 0.5})
    const leather = new LeatherMaterial({
      tint: '#4a2416',
      highlight: '#7a4128',
    })
    return {
      brass,
      iron,
      oak,
      leather,
      dispose() {
        for (const material of [brass, iron, oak, leather]) {
          material.dispose()
        }
      },
    }
  }, []))
  return <RigidBody colliders={false} name='forge-gutter' type='fixed'>
    <MeshSurfaceCollider args={parts.gutterCollision} />
    <mesh castShadow geometry={parts.gutter.channel} material={materials.brass} name='forge-gutter-channel' receiveShadow />
    <mesh castShadow geometry={parts.gutter.brackets} material={materials.iron} name='forge-gutter-brackets' receiveShadow />
    <group name='forge-hopper' position={funnel.center}>
      <MeshSurfaceCollider args={parts.funnelCollision} />
      <mesh castShadow geometry={parts.hopper.funnel.metal} material={materials.brass} name='forge-hopper-funnel' receiveShadow />
      <mesh castShadow geometry={parts.hopper.board} material={materials.oak} name='forge-hopper-board' receiveShadow />
      <mesh castShadow geometry={parts.hopper.cushion} material={materials.leather} name='forge-hopper-cushion' receiveShadow />
      <mesh castShadow geometry={parts.hopper.iron} material={materials.iron} name='forge-hopper-hangers' receiveShadow />
    </group>
    {/* Stopping whatever strikes it dead: the cushion gives way, never bouncing anything back. */}
    <CuboidCollider args={[backstop.width / 2, (backstop.top - backstop.bottom) / 2, backstop.thickness / 2]} position={[funnelX, (backstop.bottom + backstop.top) / 2, backstop.face - backstop.thickness / 2]} restitution={0} restitutionCombineRule={CoefficientCombineRule.Min} />
  </RigidBody>
}
