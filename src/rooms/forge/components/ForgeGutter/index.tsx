import type {Vec3} from '#src/lib/gallery.ts'
import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import Box from '#src/components/Scene/primitives.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {forgeBore, forgeGutters} from '#src/lib/gallery/forgeGutter.ts'
import GutterGeometry from '#src/lib/gallery/GutterGeometry.ts'

/** The ledges under both ends of the opening orbs roll through between the gutters, by their middles and sizes, their tops level with its sill. */
const ledges = forgeBore.ledges.map(({min, max}) => ({
  position: [(min[0] + max[0]) / 2, forgeBore.sill - forgeBore.ledgeThickness / 2, (min[1] + max[1]) / 2] as Vec3,
  size: [max[0] - min[0], forgeBore.ledgeThickness, max[1] - min[1]] as Vec3,
}))

/** The brass gutters round the Forge and its vestibule on their iron brackets and hangers, which orbs dropping through the ceiling roll down into the vestibule, and the `plaster` ledges they end and start on at both faces of the walls between them. */
export default function ForgeGutter({plaster}: {plaster: Material}) {
  const parts = useDisposable(useMemo(() => {
    const geometries = Object.values(forgeGutters).map(gutter => new GutterGeometry(gutter))
    return {
      geometries,
      collision: geometries.map(geometry => colliderGeometry(geometry.collision)),
      dispose() {
        for (const geometry of geometries) {
          geometry.dispose()
        }
      },
    }
  }, []))
  const brass = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#a88a56',
    metalness: 0.8,
    roughness: 0.38,
  }), []))
  // The rooflights’ painted cast iron.
  const iron = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#4c463c',
    metalness: 0.2,
    roughness: 0.7,
  }), []))
  return <RigidBody colliders={false} name='forge-gutter' type='fixed'>
    {parts.collision.map((args, index) => <MeshSurfaceCollider key={index} args={args} />)}
    {parts.geometries.map(({brackets, channel}, index) => <group key={index}>
      <mesh castShadow geometry={channel} material={brass} name='forge-gutter-channel' receiveShadow />
      <mesh castShadow geometry={brackets} material={iron} name='forge-gutter-brackets' receiveShadow />
    </group>)}
    {ledges.map(({position, size}) => <group key={position.join()}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
      <Box material={plaster} name='forge-gutter-ledge' position={position} size={size} />
    </group>)}
  </RigidBody>
}
