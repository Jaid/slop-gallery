import type {FeastMaterialSlot} from '#src/lib/gallery/feastTable/FeastSegmentGeometry.ts'
import type {FeastCollider} from '#src/lib/gallery/feastTable/layout.ts'
import type {RoomId} from '#src/lib/gallery/types.ts'

import {CuboidCollider, CylinderCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import FeastSegmentGeometry from '#src/lib/gallery/feastTable/FeastSegmentGeometry.ts'
import FeastTableGeometry from '#src/lib/gallery/feastTable/FeastTableGeometry.ts'
import feastTable, {feastColliders, feastSegments} from '#src/lib/gallery/feastTable/layout.ts'
import FeastTableMaterials from '#src/lib/materials/FeastTableMaterials.ts'

/** Lets room culling leave out the whole table whenever Dine is out of sight; see `feastSegments`. */
const inDine = {room: 'dine'} as const satisfies {room: RoomId}
/** Light passes through flames and they never cast shadows. */
const shadowless = new Set<FeastMaterialSlot>(['flame'])

/** Dine’s banquet: a long mahogany refectory table under a damask runner, set for twenty-two with velvet chairs, porcelain, gilt goblets, candelabra and fruit. */
export default function FeastTable() {
  const materials = useDisposable(useMemo(() => new FeastTableMaterials, []))
  const table = useDisposable(useMemo(() => new FeastTableGeometry, []))
  const segments = useDisposable(useMemo(() => {
    const built = feastSegments.map((_, index) => new FeastSegmentGeometry(index))
    return Object.assign(built, {dispose: () => {
      for (const segment of built) {
        segment.dispose()
      }
    }})
  }, []))
  const {cuboids, cylinders} = useMemo(() => {
    const all = feastColliders()
    return {
      cuboids: all.filter((collider): collider is Extract<FeastCollider, {shape: 'cuboid'}> => collider.shape === 'cuboid'),
      cylinders: all.filter((collider): collider is Extract<FeastCollider, {shape: 'cylinder'}> => collider.shape === 'cylinder'),
    }
  }, [])
  return <group name='dine-feast-table' position={feastTable.position}>
    <RigidBody colliders={false} type='fixed'>
      {cuboids.map(collider => <CuboidCollider key={collider.name} args={collider.halfExtents} name={collider.name} position={collider.position} rotation={[0, collider.yaw, 0]} />)}
      {cylinders.map(collider => <CylinderCollider key={collider.name} args={[collider.halfHeight, collider.radius]} name={collider.name} position={collider.position} />)}
    </RigidBody>
    <mesh castShadow geometry={table.wood} material={materials.wood} name='feast-table-mahogany' receiveShadow userData={inDine} />
    <mesh castShadow geometry={table.runner} material={materials.runner} name='feast-table-runner' receiveShadow userData={inDine} />
    <mesh castShadow geometry={table.braid} material={materials.braid} name='feast-table-runner-braid' receiveShadow userData={inDine} />
    {segments.map((segment, index) => <group key={index} name={`feast-table-run-${index}`}>
      {segment.parts.map(({geometry, slot}) => <mesh key={slot} castShadow={!shadowless.has(slot)} geometry={geometry} material={materials[slot]} name={`feast-${slot}-${index}`} receiveShadow={!shadowless.has(slot)} userData={inDine} />)}
    </group>)}
  </group>
}
