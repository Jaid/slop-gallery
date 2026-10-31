import type {Wall} from '#src/lib/placement/wallGeometry.ts'
import type {FloorSize} from '#src/rooms/index.ts'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'
import {color, mix, texture} from 'three/tsl'
import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'
import {useGraphicsModeValue} from 'use-graphics-mode'

import {surfaceTexture} from '#src/components/Scene/materials.ts'
import WallSurface from '#src/components/Scene/WallSurface.tsx'
import {CheckeredMarbleFloorMaterial, cremaMarfil, neroMarquina} from '#src/lib/materials/marble/index.ts'
import VelvetWallMaterial from '#src/lib/materials/VelvetWallMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

export type ArenaShellProps = {
  /** the middle of the floor plan, in world meters */
  center: Point
  /** a corner of the floor’s tile grid, in world meters */
  floorOrigin: Point
  /** how high the ceiling hangs over the floor, which lies at y = 0 */
  height: number
  size: FloorSize
  /** edge length of the floor’s marble tiles */
  tile: number
  /** the walls around the floor plan, as the world placed and mitered them */
  walls: ReadonlyArray<Wall>
}
type Point = readonly [x: number, z: number]

/**
 * The Arena’s shell around a rectangular floor plan, without lights: polished cream and Nero Marquina marble in a checkerboard on a dark slab, mirroring the room in heavy mode, crushed velvet walls with black lacquered trim and a dark plaster ceiling, with colliders for the floor and the ceiling.
 */
export default function ArenaShell({center, floorOrigin, height, size, tile, walls}: ArenaShellProps) {
  const [x, z] = center
  const [width, depth] = size
  const {floorReflections, surfaceAnisotropy} = useGraphicsModeValue(getGraphicsProfile)
  const plaster = useDisposable(useMemo(() => surfaceTexture('plaster', surfaceAnisotropy), [surfaceAnisotropy]))
  const slab = useDisposable(useMemo(() => new RoundedBoxGeometry(width, 0.24, depth, 2, 0.035), [width, depth]))
  const ceiling = useDisposable(useMemo(() => new RoundedBoxGeometry(width, 0.18, depth, 2, 0.045), [width, depth]))
  const wallMaterial = useDisposable(useMemo(() => new VelvetWallMaterial, []))
  // Baseboards and cornice in black semi-gloss paint under a clear lacquer, which draws a crisp line of light along every edge.
  const trimMaterial = useDisposable(useMemo(() => new MeshPhysicalNodeMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    color: '#141315',
    envMapIntensity: 0.6,
    metalness: 0,
    roughness: 0.42,
  }), []))
  const ceilingMaterial = useDisposable(useMemo(() => {
    const material = new MeshStandardNodeMaterial({
      envMapIntensity: 0.7,
      metalness: 0,
      roughness: 0.9,
    })
    const finish = mix(texture(plaster).rgb, color('#381b1d'), 0.82)
    material.colorNode = finish
    material.emissiveNode = finish.mul(0.18)
    return material
  }, [plaster]))
  const floorMaterial = useDisposable(useMemo(() => new CheckeredMarbleFloorMaterial({
    dark: neroMarquina,
    directSpecular: 0.1,
    drift: true,
    grazingStrength: 0,
    light: cremaMarfil,
    loss: 0,
    origin: floorOrigin,
    reflections: floorReflections,
    roughness: 0,
    seed: 3,
    strength: 0.2,
    tile,
  }), [floorOrigin, floorReflections, tile]))
  const reflection = floorMaterial.reflectionTarget
  return <>
    {walls.map(wall => <WallSurface key={wall.id} material={trimMaterial} plaster={plaster} surfaceMaterial={wallMaterial} surfaceRoom='vesper' wall={wall} />)}
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[width / 2, 0.12, depth / 2]} position={[x, -0.12, z]} />
      <CuboidCollider args={[width / 2, 0.09, depth / 2]} position={[x, height, z]} />
    </RigidBody>
    <mesh castShadow geometry={slab} name='arena-floor-slab' position={[x, -0.12, z]} receiveShadow>
      <meshStandardNodeMaterial color='#23201d' roughness={0.8} />
    </mesh>
    <mesh material={floorMaterial} name='arena-marble-floor' position={[x, 0.001, z]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <Branch if={reflection}><primitive object={reflection!} /></Branch>
    </mesh>
    <mesh castShadow geometry={ceiling} material={ceilingMaterial} name='arena-ceiling' position={[x, height, z]} receiveShadow />
  </>
}
