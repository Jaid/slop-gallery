import type {Texture} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import CanvasText from '#component/CanvasText'
import {rooms} from '#src/lib/gallery.ts'

import BenchSeat from './BenchSeat.tsx'
import {Box} from './primitives.tsx'
import UndertoneOrbit from './UndertoneOrbit.tsx'

const room = rooms.find(candidate => candidate.id === 'undertone')!

export default function UndertoneRoom({stone}: {stone: Texture}) {
  return <group name="undertone-room" position={[room.center[0], room.floorY, room.center[1]]}>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[6, 0.15, 7]} position={[0, -0.15, 0]}/>
      <CuboidCollider args={[6, 0.15, 7]} position={[0, 5.9, 0]}/>
      <Box name="undertone-slate-floor" position={[0, -0.12, 0]} size={[12, 0.24, 14]} map={stone} color="#172b32" roughness={0.87} envMapIntensity={0}/>
      <Box name="undertone-ceiling" position={[0, 5.78, 0]} size={[12, 0.18, 14]} color="#0b141d" envMapIntensity={0}/>
    </RigidBody>
    {[-4, -2, 0, 2, 4].map(x => <Box key={x} position={[x, 5.5, 0]} size={[0.16, 0.4, 14]} color="#16252d" envMapIntensity={0}/>)}
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 5.65, 0.012, 0]}><boxGeometry args={[0.025, 0.012, 13.4]}/><meshBasicNodeMaterial color="#538e8a" toneMapped={false}/></mesh>
      <mesh position={[0, 0.012, side * 6.65]}><boxGeometry args={[11.3, 0.012, 0.025]}/><meshBasicNodeMaterial color="#538e8a" toneMapped={false}/></mesh>
      {[-4.7, 0, 4.7].map(z => <group key={z} position={[side * 5.72, 0, z]}>
        <Box position={[0, 2.2, 0]} size={[0.14, 2.8, 0.25]} color="#101e25" envMapIntensity={0}/>
        <mesh position={[-side * 0.085, 2.2, 0]}><boxGeometry args={[0.025, 2.45, 0.065]}/><meshBasicNodeMaterial color="#83c5bd" toneMapped={false}/></mesh>
      </group>)}
      <RigidBody type="fixed" colliders="cuboid">
        <group position={[side * 4.1, 0, -1.8]} rotation={[0, Math.PI / 2, 0]}>
          <BenchSeat position={[0, 0.48, 0]} size={[2.6, 0.2, 0.8]}/>
          {[-1, 1].map(x => <Box key={x} position={[x, 0.19, 0]} size={[0.14, 0.38, 0.65]} color="#34494b" metalness={0.5}/>)}
        </group>
      </RigidBody>
    </group>)}
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[1.65, 0.27, 1.65]} position={[0, 0.27, 0]}/>
      <Box name="undertone-orbit-plinth" position={[0, 0.22, 0]} size={[3.3, 0.44, 3.3]} color="#0d1920" map={stone} envMapIntensity={0}/>
      <Box position={[0, 0.49, 0]} size={[3.05, 0.1, 3.05]} color="#385558" metalness={0.5} roughness={0.6} envMapIntensity={0.15}/>
    </RigidBody>
    <UndertoneOrbit/>
    <pointLight position={[0, 2.8, 0]} color="#64bfb5" intensity={18} distance={9} decay={2}/>
    <pointLight position={[-3.8, 2.6, -3.5]} color="#a5cbd9" intensity={8} distance={7} decay={2}/>
    <pointLight position={[2.5, 3.8, 4]} color="#df9e63" intensity={10} distance={8} decay={2}/>
    <CanvasText text="THE UNDERTONE" position={[0, 3.85, 6.77]} rotation={[0, Math.PI, 0]} width={5.2} height={0.5} fontFamily="Georgia" color="#b5d1ce"/>
    <CanvasText text="Some ideas arrive at a lower frequency." position={[0, 3.27, 6.77]} rotation={[0, Math.PI, 0]} width={4.7} height={0.25} color="#809b9b"/>
    <CanvasText text="06 – A STUDY IN STILL MOTION" position={[0, 0.72, 1.8]} rotation={[-0.3, 0, 0]} width={2.9} height={0.2} color="#d5ad73"/>
  </group>
}
