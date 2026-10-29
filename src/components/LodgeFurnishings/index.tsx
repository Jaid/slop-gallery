import type LodgeMaterials from '#src/lib/materials/LodgeMaterials.ts'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import CoffeeTableGeometry from '#src/lib/gallery/lodgeInterior/CoffeeTableGeometry.ts'
import lodgeInterior, {lodgeFurnitureColliders} from '#src/lib/gallery/lodgeInterior/layout.ts'
import UpholsteredSeatGeometry from '#src/lib/gallery/lodgeInterior/UpholsteredSeatGeometry.ts'
import WagonWheelGeometry from '#src/lib/gallery/lodgeInterior/WagonWheelGeometry.ts'

const {armchairs, chandelier, coffeeTable, rug, sofa} = lodgeInterior

/** Seating, table, rug and wagon-wheel chandelier of the Lodge, in the room’s frame. */
export default function LodgeFurnishings({materials}: {materials: LodgeMaterials}) {
  const sofaGeometry = useDisposable(useMemo(() => new UpholsteredSeatGeometry(sofa.seats, lodgeInterior.seatWidth), []))
  const armchairGeometry = useDisposable(useMemo(() => new UpholsteredSeatGeometry(1, lodgeInterior.seatWidth + 0.08), []))
  const table = useDisposable(useMemo(() => new CoffeeTableGeometry(coffeeTable.size), []))
  const wheel = useDisposable(useMemo(() => new WagonWheelGeometry(chandelier.drop), []))
  const seats = [
    {
      geometry: sofaGeometry,
      ...sofa,
    },
    ...armchairs.map(placement => ({
      geometry: armchairGeometry,
      ...placement,
    })),
  ]
  return <group name='lodge-furnishings'>
    <RigidBody colliders={false} type='fixed'>
      {lodgeFurnitureColliders().map(({name, position, yaw, size}) => <CuboidCollider key={name} args={[size[0] / 2, size[1] / 2, size[2] / 2]} name={name} position={[position[0], position[1] + size[1] / 2, position[2]]} rotation={[0, yaw, 0]} />)}
    </RigidBody>
    <mesh material={materials.rug} name='lodge-rug' position={[rug.position[0], rug.thickness / 2, rug.position[2]]} receiveShadow>
      <boxGeometry args={[rug.size[0], rug.thickness, rug.size[1]]} />
    </mesh>
    {seats.map(({geometry, position, yaw}, index) => <group key={index} name={index ? 'lodge-armchair' : 'lodge-sofa'} position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow geometry={geometry.leather} material={materials.leather} receiveShadow />
      <mesh castShadow geometry={geometry.timber} material={materials.timber} receiveShadow />
    </group>)}
    <group name='lodge-coffee-table' position={coffeeTable.position}>
      <mesh castShadow geometry={table.timber} material={materials.timber} receiveShadow />
    </group>
    <group name='lodge-chandelier' position={chandelier.position} rotation={[0, chandelier.yaw, 0]}>
      {/* The light burns among the candles, so the wheel would throw its spokes across the whole room; real candle flames are too broad for that. */}
      <mesh geometry={wheel.iron} material={materials.iron} />
      <mesh geometry={wheel.wax} material={materials.wax} />
      <mesh geometry={wheel.flames} material={materials.flame} />
    </group>
  </group>
}
