import type {Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {Object3D} from 'three/webgpu'

import MoonfallCrater from '#component/levels/gallery/MoonfallCrater'
import MoonfallOrbit from '#component/levels/gallery/MoonfallOrbit'
import Box from '#src/components/Scene/primitives.tsx'
import {rooms} from '#src/lib/gallery.ts'
import moonfallWallFixtures from '#src/lib/gallery/moonfall/fixtures.ts'
import {useShadowProps} from '#src/lib/rendering/shadowFilters.ts'

const room = rooms.find(candidate => candidate.id === 'moonfall')!
/** Moonfall’s lights only shine while the player is in Moonfall or the Oculus. */
const lightRooms = {rooms: ['moonfall', 'oculus']} as const
const moonfallLightTarget = () => {
  const target = new Object3D
  target.position.set(0, -1.5, 0)
  return target
}

export default function MoonfallRoom({stone}: {stone: Texture}) {
  const target = moonfallLightTarget()
  const shadow = useShadowProps(2048)
  const planetShadow = useShadowProps(1024, {isPoint: true})
  const [width, depth] = room.size
  return <group name='moonfall-room' position={[room.center[0], room.floorY, room.center[1]]}>
    <MoonfallCrater stone={stone} />
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[width / 2, 0.15, depth / 2]} position={[0, 5.9, 0]} />
      <Box color='#0b141d' envMapIntensity={0} name='moonfall-ceiling' position={[0, 5.78, 0]} size={[width, 0.18, depth]} />
    </RigidBody>
    {[-10, -6, -2, 2, 6, 10].map(x => <Box key={x} color='#16252d' envMapIntensity={0} position={[x, 5.5, 0]} size={[0.16, 0.4, depth]} />)}
    {moonfallWallFixtures.map(({side, lightX, lightZs, lamp}) => <group key={side}>
      <mesh position={[side * (width / 2 - 0.35), 0.012, 0]}><boxGeometry args={[0.025, 0.012, depth - 0.7]} /><meshBasicNodeMaterial color='#538e8a' toneMapped={false} /></mesh>
      <mesh position={[0, 0.012, side * (depth / 2 - 0.35)]}><boxGeometry args={[width - 0.7, 0.012, 0.025]} /><meshBasicNodeMaterial color='#538e8a' toneMapped={false} /></mesh>
      {lightZs.map(z => <group key={z} name='moonfall-wall-led' position={[lightX, 0, z]}>
        <Box color='#101e25' envMapIntensity={0} position={[0, 2.2, 0]} size={[0.14, 2.8, 0.25]} />
        <mesh position={[-side * 0.085, 2.2, 0]}><boxGeometry args={[0.025, 2.45, 0.065]} /><meshBasicNodeMaterial color='#83c5bd' toneMapped={false} /></mesh>
        <pointLight color='#91c9c4' distance={lamp.distance} intensity={lamp.intensity} position={[-side * 0.6, lamp.y, 0]} userData={lightRooms} />
      </group>)}
    </group>)}
    <MoonfallOrbit />
    <primitive object={target} />
    <spotLight angle={0.9} castShadow color='#e0d0b2' distance={15} intensity={860} penumbra={0.28} position={[-7, 3.3, -4]} shadow-bias={-0.0001} shadow-normalBias={0.025} target={target} userData={lightRooms} {...shadow} />
    {/* The planet’s glow, rising from the crater, throws the orbital sculpture’s shadow onto the ceiling. */}
    <pointLight castShadow color='#64bfb5' decay={1.25} distance={20} intensity={216} position={[5.37, 1.02, -0.19]} shadow-camera-far={20} shadow-camera-near={0.1} shadow-normalBias={0.035} userData={lightRooms} {...planetShadow} />
    <pointLight color='#af7e5f' decay={1} distance={15} intensity={27} position={[6, 2.6, 6.15]} userData={lightRooms} />
  </group>
}
