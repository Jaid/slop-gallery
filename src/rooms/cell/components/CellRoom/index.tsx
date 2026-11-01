import type {ArenaPolish, ArenaSurfaces} from '#component/ArenaShell'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {ExtrudeGeometry} from 'three/webgpu'
import {useGraphicsModeValue} from 'use-graphics-mode'

import {ArenaFloor, useArenaSurfaces} from '#component/ArenaShell'
import CeilingLeds from '#component/CeilingLeds'
import Chandelier from '#component/Chandelier'
import Orb from '#component/Orb'
import OrbHolder, {useOrbHolder} from '#component/OrbHolder'
import Pedestal, {usePedestal} from '#component/Pedestal'
import ShadowPool from '#component/ShadowPool'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {cellLedY} from '#src/lib/gallery/CellCeilingGeometry.ts'
import {orbSeat} from '#src/lib/gallery/OrbHolderGeometry.ts'
import {pedestalHeight} from '#src/lib/gallery/PedestalGeometry.ts'
import roundRevealGeometry from '#src/lib/gallery/roundRevealGeometry.ts'
import {roundVestibuleFloorShape} from '#src/lib/gallery/roundVestibule.ts'
import {mergeParts} from '#src/lib/geometry.ts'
import DamaskWallpaperMaterial from '#src/lib/materials/DamaskWallpaperMaterial.ts'
import JoineryWoodMaterial from '#src/lib/materials/JoineryWoodMaterial.ts'
import WoodFloorMaterial from '#src/lib/materials/WoodFloorMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {cellLed} from '#src/rooms/cell/Cell.ts'
import CellCeiling from '#src/rooms/cell/components/CellCeiling/index.tsx'
import CellDoor from '#src/rooms/cell/components/CellDoor/index.tsx'
import sandbox from '#src/worlds/sandbox/index.ts'

const cell = sandbox.room('cell')
const {layout} = cell.room
const {chandelierLift, floorTile, vestibule} = layout
const [width, depth] = cell.size
const [x, z] = cell.center
const roundWallIds = new Set(layout.spaces.map(space => cell.room.globalId(space.name)))
const walls = sandbox.walls.filter(wall => wall.room === cell.id)
/** the hall’s four walls, papered like the Sienna’s, the velvet of the spaces beyond lining the arch through the north one */
const hallWalls = walls.filter(wall => !roundWallIds.has(wall.id))
/** the round walls of the spaces beyond the north wall, upholstered in the Arena’s velvet */
const roundWalls = walls.filter(wall => roundWallIds.has(wall.id))
const northWall = walls.find(wall => wall.id === cell.room.globalId('north'))!
const door = northWall.holes?.find(hole => hole.name === 'door')
/** where a point of the floor plan, relative to the room’s origin, lies in the world */
const worldPoint = ([pointX, pointZ]: readonly [number, number]) => {
  const [worldX, , worldZ] = cell.toWorld([pointX, 0, pointZ])
  return [worldX, worldZ] as const
}
// Whole tiles from the north-west corner, which the walls then meet at a tile’s edge all the way round.
const floorOrigin = [x - width / 2, z - depth / 2] as const
/** Polished enough that the chandelier and the walls mirror in it, more faintly than in the Cinnabar’s terrazzo. */
const polish: ArenaPolish = {
  strength: 0.2,
  grazingStrength: 0.1,
}
const slabThickness = 0.24
const circleSegments = 96
/** the Banquet’s LED panel in the middle of the vestibule’s ceiling and the lamp under it, which flickers and dies with it */
const led = vestibule && {
  lamps: [{
    id: cell.room.globalId('led'),
    strength: cellLed.strength,
  }],
  slots: [{
    id: 'vestibule',
    position: cell.toWorld([vestibule.center[0], cellLedY(layout.height), vestibule.center[1]]),
    row: 0,
    slot: 0,
  }],
}
/** how far one repeat of the wood’s texture reaches along x and z, as the Vesper’s floor spreads its 3 × 3 repeats over 12 × 24 m */
const woodRepeat = [4, 8] as const

/** The Sandbox’s one room: a hall with the Arena’s marble underfoot, papered like the Sienna under a coffered ceiling and the Sienna’s chandelier, lit besides by a faint studio fill from no visible source, and beyond its north wall the spaces with the items on their pedestals, or the door that closes it while there are none. */
export default function CellRoom() {
  const surfaces = useArenaSurfaces()
  // The Sienna’s damask, its baseboards, casings and cornice in one varnished timber, which the ceiling’s beams share.
  const damask = useDisposable(useMemo(() => new DamaskWallpaperMaterial, []))
  const joinery = useDisposable(useMemo(() => new JoineryWoodMaterial({grain: 'x'}), []))
  return <group name='cell'>
    <ambientLight intensity={0.15} />
    <hemisphereLight color='#e1edff' groundColor='#80705d' intensity={0.45} />
    {/* Each chandelier’s lamp borrows one of its slots for its shadow. */}
    <ShadowPool />
    <ArenaFloor center={cell.center} origin={floorOrigin} polish={polish} size={cell.size} tile={floorTile} />
    {hallWalls.map(wall => <WallSurface key={wall.id} material={joinery} plaster={surfaces.plaster} revealMaterial={wall === northWall ? surfaces.velvet : undefined} surfaceMaterial={damask} wall={wall} />)}
    <CellCeiling beams={joinery} />
    <group position={[x, chandelierLift, z]}>
      <Chandelier lamp={cell.room.globalId('chandelier')} />
    </group>
    <Branch if={door} else={<Vestibule surfaces={surfaces} />}><CellDoor hole={door!} surfaces={surfaces} wall={northWall} /></Branch>
  </group>
}

/** Every round space beyond the north wall: the Vesper’s varnished wood on their floors and out under their arches, the Arena’s velvet on their walls and on the reveals that line the arches out to the walls they open through, the Banquet’s LED panel in the middle of the vestibule’s ceiling, and the items on their pedestals, every orb resting in a holder on its pedestal’s cap. */
function Vestibule({surfaces}: {surfaces: ArenaSurfaces}) {
  const {floorReflections, surfaceAnisotropy} = useGraphicsModeValue(getGraphicsProfile)
  const wood = useDisposable(useMemo(() => {
    const texture = surfaceTexture('wood', surfaceAnisotropy)
    texture.repeat.set(1 / woodRepeat[0], 1 / woodRepeat[1])
    return texture
  }, [surfaceAnisotropy]))
  const floor = useDisposable(useMemo(() => new WoodFloorMaterial(wood, floorReflections), [floorReflections, wood]))
  const pedestal = usePedestal()
  const holder = useOrbHolder()
  const parts = useDisposable(useMemo(() => {
    const slab = mergeParts(layout.spaces.map(space => {
      const geometry = new ExtrudeGeometry(roundVestibuleFloorShape(space), {
        depth: slabThickness,
        bevelEnabled: false,
        curveSegments: circleSegments,
      })
      // Its top as high as the hall’s marble, so all of them mirror in one plane.
      const [spaceX, spaceZ] = worldPoint(space.center)
      return geometry.rotateX(-Math.PI / 2).translate(spaceX, 0.001 - slabThickness, spaceZ)
    }))
    // In meters across the world, so the grain runs on unbroken from one space into the next, along z like the Vesper’s.
    const position = slab.getAttribute('position')
    const uv = slab.getAttribute('uv')
    for (let index = 0; index < uv.count; index++) {
      uv.setXY(index, position.getX(index), -position.getZ(index))
    }
    // Every arch through a round wall, lined out to the plane where the wall it opens onto touches it.
    const reveals = mergeParts(layout.spaces.flatMap(space => {
      const wall = walls.find(candidate => candidate.id === cell.room.globalId(space.name))!
      return wall.holes!.map(hole => roundRevealGeometry(wall, hole, layout.arch).rotateY(wall.rotation).translate(...wall.center))
    }))
    return {
      slab,
      reveals,
      floorCollision: colliderGeometry(slab),
      revealCollision: colliderGeometry(reveals),
      dispose() {
        for (const geometry of [slab, reveals]) {
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
    </RigidBody>
    {roundWalls.map(wall => <WallSurface key={wall.id} material={surfaces.trim} plaster={surfaces.plaster} surfaceMaterial={surfaces.velvet} wall={wall} />)}
    <mesh geometry={parts.slab} material={floor} name='cell-vestibule-floor' receiveShadow />
    <Branch if={floor.reflectionTarget}><group position={[vestibuleX, 0.001, vestibuleZ]} rotation={[-Math.PI / 2, 0, 0]}><primitive object={floor.reflectionTarget!} /></group></Branch>
    <mesh castShadow geometry={parts.reveals} material={surfaces.velvet} name='cell-vestibule-reveal' receiveShadow />
    <CeilingLeds lamps={led!.lamps} name='cell-vestibule' slots={led!.slots} />
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
