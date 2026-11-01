import type {ArenaPolish, ArenaSurfaces} from '#component/ArenaShell'

import {CylinderCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {CylinderGeometry, ExtrudeGeometry} from 'three/webgpu'

import ArenaShell, {useArenaMarble, useArenaSurfaces} from '#component/ArenaShell'
import Chandelier from '#component/Chandelier'
import Orb from '#component/Orb'
import OrbHolder, {useOrbHolder} from '#component/OrbHolder'
import Pedestal, {usePedestal} from '#component/Pedestal'
import ShadowPool from '#component/ShadowPool'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {orbSeat} from '#src/lib/gallery/OrbHolderGeometry.ts'
import {pedestalHeight} from '#src/lib/gallery/PedestalGeometry.ts'
import roundRevealGeometry from '#src/lib/gallery/roundRevealGeometry.ts'
import {roundVestibuleFloorShape} from '#src/lib/gallery/roundVestibule.ts'
import {mergeParts} from '#src/lib/geometry.ts'
import CellDoor from '#src/rooms/cell/components/CellDoor/index.tsx'
import sandbox from '#src/worlds/sandbox/index.ts'

const cell = sandbox.room('cell')
const {layout} = cell.room
const {chandelierLift, floorTile, vestibule} = layout
const [width, depth] = cell.size
const [x, z] = cell.center
const walls = sandbox.walls.filter(wall => wall.room === cell.id)
const northWall = walls.find(wall => wall.id === cell.room.globalId('north'))!
const door = northWall.holes?.find(hole => hole.name === 'door')
/** where a point of the floor plan, relative to the room’s origin, lies in the world */
const worldPoint = ([pointX, pointZ]: readonly [number, number]) => {
  const [worldX, , worldZ] = cell.toWorld([pointX, 0, pointZ])
  return [worldX, worldZ] as const
}
// Whole tiles from the north-west corner, which the walls then meet at a tile’s edge all the way round.
const floorOrigin = [x - width / 2, z - depth / 2] as const
/** Polished hard like the Cinnabar’s terrazzo, so the chandelier and the velvet mirror clearly in it. */
const polish: ArenaPolish = {
  strength: 0.4,
  grazingStrength: 0.2,
}
const slabThickness = 0.24
const circleSegments = 96

/** The Sandbox’s one room: the Arena’s shell around the Cell’s floor plan under the Sienna’s chandelier, lit besides by the Arena’s studio fill from no visible source, and beyond its north wall the spaces with the items on their pedestals, or the door that closes it while there are none. */
export default function CellRoom() {
  const surfaces = useArenaSurfaces()
  return <group name='cell'>
    <ambientLight intensity={0.45} />
    <hemisphereLight color='#e1edff' groundColor='#80705d' intensity={1.3} />
    {/* Each chandelier’s lamp borrows one of its slots for its shadow. */}
    <ShadowPool />
    <ArenaShell center={cell.center} floorOrigin={floorOrigin} height={cell.height} polish={polish} size={cell.size} surfaces={surfaces} tile={floorTile} walls={walls} />
    <group position={[x, chandelierLift, z]}>
      <Chandelier lamp={cell.room.globalId('chandelier')} />
    </group>
    <Branch if={door} else={<Vestibule surfaces={surfaces} />}><CellDoor hole={door!} surfaces={surfaces} wall={northWall} /></Branch>
  </group>
}

/** Every round space beyond the north wall: the Arena’s marble on their floors and out under their arches, their plaster ceilings, the velvet reveals that line the arches out to the walls they open through, the vestibule’s chandelier and the items on their pedestals, every orb resting in a holder on its pedestal’s cap. */
function Vestibule({surfaces}: {surfaces: ArenaSurfaces}) {
  const marble = useArenaMarble(floorOrigin, floorTile, polish)
  const pedestal = usePedestal()
  const holder = useOrbHolder()
  const parts = useDisposable(useMemo(() => {
    const slab = mergeParts(layout.spaces.map(space => {
      const geometry = new ExtrudeGeometry(roundVestibuleFloorShape(space), {
        depth: slabThickness,
        bevelEnabled: false,
        curveSegments: circleSegments,
      })
      // Its top as high as the room’s marble, so all of them mirror in one plane.
      const [spaceX, spaceZ] = worldPoint(space.center)
      return geometry.rotateX(-Math.PI / 2).translate(spaceX, 0.001 - slabThickness, spaceZ)
    }))
    const ceiling = mergeParts(layout.spaces.map(space => {
      const [spaceX, spaceZ] = worldPoint(space.center)
      const disk = new CylinderGeometry(space.radius, space.radius, 0.18, circleSegments)
      return disk.translate(spaceX, cell.height, spaceZ)
    }))
    // Every arch through a round wall, lined out to the plane where the wall it opens onto touches it.
    const reveals = mergeParts(layout.spaces.flatMap(space => {
      const wall = walls.find(candidate => candidate.id === cell.room.globalId(space.name))!
      return wall.holes!.map(hole => roundRevealGeometry(wall, hole, layout.arch).rotateY(wall.rotation).translate(...wall.center))
    }))
    return {
      slab,
      ceiling,
      reveals,
      floorCollision: colliderGeometry(slab),
      revealCollision: colliderGeometry(reveals),
      dispose() {
        for (const geometry of [slab, ceiling, reveals]) {
          geometry.dispose()
        }
      },
    }
  }, []))
  const [vestibuleX, vestibuleZ] = worldPoint(vestibule!.center)
  return <group name='cell-vestibule'>
    <RigidBody colliders={false} type='fixed'>
      <TrimeshCollider args={parts.floorCollision} />
      <TrimeshCollider args={parts.revealCollision} />
      {layout.spaces.map(space => {
        const [spaceX, spaceZ] = worldPoint(space.center)
        return <CylinderCollider key={space.name} args={[0.09, space.radius]} position={[spaceX, cell.height, spaceZ]} />
      })}
    </RigidBody>
    <mesh geometry={parts.slab} material={marble} name='cell-vestibule-floor' receiveShadow />
    <Branch if={marble.reflectionTarget}><group position={[vestibuleX, 0.001, vestibuleZ]} rotation={[-Math.PI / 2, 0, 0]}><primitive object={marble.reflectionTarget!} /></group></Branch>
    <mesh castShadow geometry={parts.ceiling} material={surfaces.ceiling} name='cell-vestibule-ceiling' receiveShadow />
    <mesh castShadow geometry={parts.reveals} material={surfaces.velvet} name='cell-vestibule-reveal' receiveShadow />
    <group position={[vestibuleX, chandelierLift, vestibuleZ]}>
      <Chandelier lamp={cell.room.globalId('vestibule_chandelier')} />
    </group>
    {sandbox.items.map((orb, index) => {
      const {position, rotation} = layout.pedestals[index]
      const [pedestalX, pedestalZ] = worldPoint(position)
      return <group key={orb.id}>
        <Pedestal {...pedestal} position={[pedestalX, 0, pedestalZ]} rotation={rotation}><OrbHolder {...holder} /></Pedestal>
        {/* Let down onto the holder’s lip from just over it. */}
        <Orb orb={orb} position={[pedestalX, pedestalHeight + orbSeat + 0.002, pedestalZ]} />
      </group>
    })}
  </group>
}
