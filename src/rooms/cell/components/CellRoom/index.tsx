import type {ArenaPolish, ArenaSurfaces} from '#component/ArenaShell'

import {CylinderCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {CylinderGeometry, ExtrudeGeometry} from 'three/webgpu'

import ArenaShell, {useArenaMarble, useArenaSurfaces} from '#component/ArenaShell'
import Chandelier from '#component/Chandelier'
import Orb from '#component/Orb'
import Pedestal, {usePedestal} from '#component/Pedestal'
import ShadowPool from '#component/ShadowPool'
import {useGallery} from '#src/lib/gallery.ts'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {halloweenOrb, orbRadius} from '#src/lib/gallery/orbs.ts'
import {pedestalHeight} from '#src/lib/gallery/PedestalGeometry.ts'
import roundRevealGeometry from '#src/lib/gallery/roundRevealGeometry.ts'
import {roundVestibuleFloorShape} from '#src/lib/gallery/roundVestibule.ts'
import {cellVestibule} from '#src/rooms/cell/Cell.ts'
import sandbox from '#src/worlds/sandbox/index.ts'

const cell = sandbox.room('cell')
const {floorTile} = cell.room
const [width, depth] = cell.size
const [x, z] = cell.center
const walls = sandbox.walls.filter(wall => wall.room === cell.id)
const vestibuleWall = walls.find(wall => wall.id === cell.room.globalId('vestibule'))!
const [vestibuleX, , vestibuleZ] = cell.toWorld([cellVestibule.center[0], 0, cellVestibule.center[1]])
// Whole tiles from the north-west corner, which the walls then meet at a tile’s edge all the way round.
const floorOrigin = [x - width / 2, z - depth / 2] as const
/** Polished hard like the Cinnabar’s terrazzo, so the chandelier and the velvet mirror clearly in it. */
const polish: ArenaPolish = {
  strength: 0.4,
  grazingStrength: 0.2,
}
const slabThickness = 0.24
const circleSegments = 96

/** The Sandbox’s one room: the Arena’s shell around the Cell’s floor plan under the Sienna’s chandelier, its round vestibule with the Halloween Orb on a pedestal, lit besides by the Arena’s studio fill from no visible source. */
export default function CellRoom() {
  const resetEpoch = useGallery(s => s.resetEpoch)
  const surfaces = useArenaSurfaces()
  const pedestal = usePedestal()
  return <group name='cell'>
    <ambientLight intensity={0.45} />
    <hemisphereLight color='#e1edff' groundColor='#80705d' intensity={1.3} />
    {/* The chandelier’s lamp borrows one of its slots for its shadow. */}
    <ShadowPool />
    <ArenaShell center={cell.center} floorOrigin={floorOrigin} height={cell.height} polish={polish} size={cell.size} surfaces={surfaces} tile={floorTile} walls={walls} />
    <group position={[x, 0, z]}>
      <Chandelier key={resetEpoch} lamp={cell.room.globalId('chandelier')} />
    </group>
    <Vestibule surfaces={surfaces} />
    <Pedestal {...pedestal} position={[vestibuleX, 0, vestibuleZ]} />
    <Orb key={resetEpoch} orb={halloweenOrb} position={[vestibuleX, pedestalHeight + orbRadius + 0.005, vestibuleZ]} />
  </group>
}

/** The round vestibule north of the room: the Arena’s marble on its floor and out under its arch, its plaster ceiling and the velvet reveal that lines the arch out to the room’s north wall. */
function Vestibule({surfaces}: {surfaces: ArenaSurfaces}) {
  const marble = useArenaMarble(floorOrigin, floorTile, polish)
  const parts = useDisposable(useMemo(() => {
    const slab = new ExtrudeGeometry(roundVestibuleFloorShape(cellVestibule), {
      depth: slabThickness,
      bevelEnabled: false,
      curveSegments: circleSegments,
    })
    // Its top as high as the room’s marble, so both mirror in one plane.
    slab.rotateX(-Math.PI / 2).translate(0, 0.001 - slabThickness, 0)
    const ceiling = new CylinderGeometry(cellVestibule.radius, cellVestibule.radius, 0.18, circleSegments)
    const reveals = vestibuleWall.holes!.map(hole => roundRevealGeometry(vestibuleWall, hole, cellVestibule.arch))
    return {
      slab,
      ceiling,
      reveals,
      floorCollision: colliderGeometry(slab),
      revealCollision: reveals.map(colliderGeometry),
      dispose() {
        for (const geometry of [slab, ceiling, ...reveals]) {
          geometry.dispose()
        }
      },
    }
  }, []))
  return <>
    <group name='cell-vestibule' position={[vestibuleX, 0, vestibuleZ]}>
      <RigidBody colliders={false} type='fixed'>
        <TrimeshCollider args={parts.floorCollision} />
        <CylinderCollider args={[0.09, cellVestibule.radius]} position={[0, cell.height, 0]} />
        <mesh geometry={parts.slab} material={marble} name='cell-vestibule-floor' receiveShadow />
      </RigidBody>
      <Branch if={marble.reflectionTarget}><group position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><primitive object={marble.reflectionTarget!} /></group></Branch>
      <mesh castShadow geometry={parts.ceiling} material={surfaces.ceiling} name='cell-vestibule-ceiling' position={[0, cell.height, 0]} receiveShadow />
    </group>
    {/* In the round wall’s own frame, as the reveals are built. */}
    <group name='cell-vestibule-reveals' position={vestibuleWall.center} rotation={[0, vestibuleWall.rotation, 0]}>
      <RigidBody colliders={false} type='fixed'>
        {parts.revealCollision.map((args, i) => <TrimeshCollider key={i} args={args} />)}
        {parts.reveals.map((geometry, i) => <mesh key={i} castShadow geometry={geometry} material={surfaces.velvet} name='cell-vestibule-reveal' receiveShadow />)}
      </RigidBody>
    </group>
  </>
}
