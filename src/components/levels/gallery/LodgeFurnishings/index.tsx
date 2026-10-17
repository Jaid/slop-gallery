import type {Vec3} from '#src/lib/gallery/types.ts'
import type LodgeMaterials from '#src/lib/materials/LodgeMaterials.ts'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import lodge from '#src/lib/gallery/lodge.ts'
import CandlestickGeometry from '#src/lib/gallery/lodgeInterior/CandlestickGeometry.ts'
import CoffeeTableGeometry from '#src/lib/gallery/lodgeInterior/CoffeeTableGeometry.ts'
import FirewoodStack from '#src/lib/gallery/lodgeInterior/FirewoodStack.ts'
import lodgeInterior, {bookCenters, lodgeFurnitureColliders} from '#src/lib/gallery/lodgeInterior/layout.ts'
import UpholsteredSeatGeometry from '#src/lib/gallery/lodgeInterior/UpholsteredSeatGeometry.ts'
import WagonWheelGeometry from '#src/lib/gallery/lodgeInterior/WagonWheelGeometry.ts'

const {armchairs, books, candlesticks, chandelier, coffeeTable, fireplace, firewood, rug, sofa} = lodgeInterior
const mantelTop = fireplace.opening + fireplace.lintelHeight + fireplace.mantel.size[1]
const mantelZ = fireplace.front - fireplace.mantel.overhang + fireplace.mantel.size[2] / 2

/** Seating, table, rug, wagon-wheel chandelier, firewood and mantel candlestick of the Lodge, in the room’s frame. */
export default function LodgeFurnishings({materials}: {materials: LodgeMaterials}) {
  const isHeavy = useGraphicsMode()
  const sofaGeometry = useDisposable(useMemo(() => new UpholsteredSeatGeometry(sofa.seats, lodgeInterior.seatWidth), []))
  const armchairGeometry = useDisposable(useMemo(() => new UpholsteredSeatGeometry(1, lodgeInterior.seatWidth + 0.08), []))
  const table = useDisposable(useMemo(() => new CoffeeTableGeometry(coffeeTable.size), []))
  const wheel = useDisposable(useMemo(() => new WagonWheelGeometry(lodge.height - chandelier.position[1]), []))
  const candlestick = useDisposable(useMemo(() => new CandlestickGeometry, []))
  const stack = useDisposable(useMemo(() => new FirewoodStack(firewood), []))
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
      {books.map(({size, yaw}, index) => <mesh key={index} castShadow material={materials.books[index]} position={[0.28 + index * 0.01, bookCenters[index], -0.06 + index * 0.015]} receiveShadow rotation={[0, yaw, 0]}>
        <boxGeometry args={size} />
      </mesh>)}
    </group>
    <group name='lodge-chandelier' position={chandelier.position}>
      {/* The light burns among the candles, so the wheel would throw its spokes across the whole room; real candle flames are too broad for that. */}
      <mesh geometry={wheel.iron} material={materials.iron} />
      <mesh geometry={wheel.wax} material={materials.wax} />
      <mesh geometry={wheel.flames} material={materials.flame} />
      {/* In the candle plane, below the rim, so the iron never shadows its own light; heavy graphics let it ground the furniture with shadows. */}
      <pointLight castShadow={isHeavy} color={chandelier.color} decay={2} distance={chandelier.distance} intensity={chandelier.intensity} position={[0, chandelier.lightY, 0]} shadow-camera-far={chandelier.distance} shadow-camera-near={0.1} shadow-mapSize={[1024, 1024]} shadow-normalBias={0.035} shadow-radius={chandelier.shadowRadius} />
    </group>
    <group name='lodge-firewood' position={firewood.position}>
      {stack.logs.map(({geometry, position, roll}, index) => <mesh key={index} castShadow geometry={geometry} material={materials.firewood} position={position} receiveShadow rotation={[Math.PI / 2, roll, 0]} />)}
    </group>
    {candlesticks.map(x => <Candlestick key={x} geometry={candlestick} materials={materials} position={[-x, mantelTop, mantelZ]} />)}
  </group>
}

function Candlestick({geometry, materials, position}: {
  geometry: CandlestickGeometry
  materials: LodgeMaterials
  position: Vec3
}) {
  return <group name='lodge-candlestick' position={position}>
    {/* Small enough that its shadow would only blow up into a giant silhouette on the walls. */}
    <mesh geometry={geometry.iron} material={materials.iron} />
    <mesh geometry={geometry.wax} material={materials.wax} />
    <mesh geometry={geometry.flame} material={materials.flame} />
  </group>
}
