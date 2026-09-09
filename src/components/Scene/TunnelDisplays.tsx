import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useMemo} from 'react'
import {Object3D} from 'three/webgpu'

import {tunnelDisplays} from '#src/lib/gallery/tunnelDisplays.ts'

import {Box} from './primitives.tsx'

function DisplayExhibit({kind, material}: {kind: number
  material: Material}) {
  const target = useMemo(() => {
    const object = new Object3D
    object.position.set(0, 1.4, 0)
    return object
  }, [])
  return <>
    <primitive object={target}/>
    <Box position={[0, 0.45, 0]} size={[1.15, 0.9, 1.15]} material={material}/>
    <Box position={[0, 0.93, 0]} size={[1.2, 0.06, 1.2]} color="#788586" metalness={0.65} roughness={0.35}/>
    <mesh position={[0, 1.65, 0]} rotation={[0.2, 0.35, kind === 3 ? Math.PI / 4 : 0]} castShadow receiveShadow>
      {kind === 0 && <torusKnotGeometry args={[0.42, 0.13, 96, 16, 2, 3]}/>}
      {kind === 1 && <octahedronGeometry args={[0.68, 0]}/>}
      {kind === 2 && <sphereGeometry args={[0.44, 32, 24]}/>}
      {kind === 3 && <boxGeometry args={[0.8, 0.8, 0.8]}/>}
      {kind === 4 && <torusGeometry args={[0.48, 0.16, 20, 64]}/>}
      {kind === 5 && <icosahedronGeometry args={[0.64, 1]}/>}
      <meshStandardNodeMaterial color={kind % 2 === 0 ? '#9c957d' : '#83999a'} metalness={0.65} roughness={0.3}/>
    </mesh>
    {kind === 2 && [0, 1, 2].map(i => <mesh key={i} position={[0, 1.65, 0]} rotation={[i * Math.PI / 3, Math.PI / 4, 0]} castShadow>
      <torusGeometry args={[0.63, 0.025, 8, 64]}/><meshStandardNodeMaterial color="#b1ada0" metalness={0.8} roughness={0.25}/>
    </mesh>)}
    <Box position={[0, 3.47, 0]} size={[0.5, 0.1, 0.5]} color="#242f32"/>
    <mesh position={[0, 3.41, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.16, 24]}/><meshBasicNodeMaterial color="#ece1c4"/>
    </mesh>
    <spotLight position={[0, 3.35, 0.25]} target={target} intensity={32} color="#eee4cf" distance={4.5} angle={0.65} penumbra={0.7} decay={2} castShadow shadow-mapSize={[512, 512]} shadow-normalBias={0.015}/>
  </>
}

export default function TunnelDisplays({material}: {material: Material}) {
  return <group name="sealed-tunnel-displays">
    {tunnelDisplays.map(display => <group key={display.side} name={`tunnel-display-${display.side}`}>
      <RigidBody type="fixed" colliders={false}>
        {display.shell.map(({position, size}, i) => <group key={i}>
          <CuboidCollider position={position} args={[size[0] / 2, size[1] / 2, size[2] / 2]}/>
          <Box position={position} size={size} material={material}/>
        </group>)}
      </RigidBody>
      {display.exhibits.map(exhibit => <group key={exhibit.id} name={exhibit.id} position={exhibit.position}>
        <DisplayExhibit kind={exhibit.kind} material={material}/>
      </group>)}
    </group>)}
  </group>
}

