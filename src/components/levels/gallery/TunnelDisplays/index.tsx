import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import {Object3D} from 'three/webgpu'

import Box from '#src/components/Scene/primitives.tsx'
import tunnelDisplays from '#src/lib/gallery/tunnelDisplays.ts'

const displayLightTarget = () => {
  const target = new Object3D
  target.position.set(0, 1.4, 0)
  return target
}
const DisplayExhibit = ({kind, material}: {
  kind: number
  material: Material
}) => {
  const target = displayLightTarget()
  return <>
    <primitive object={target} />
    <Box material={material} position={[0, 0.45, 0]} size={[1.15, 0.9, 1.15]} />
    <Box color='#788586' metalness={0.65} position={[0, 0.93, 0]} roughness={0.35} size={[1.2, 0.06, 1.2]} />
    <mesh castShadow position={[0, 1.65, 0]} receiveShadow rotation={[0.2, 0.35, kind === 3 ? Math.PI / 4 : 0]}>
      <Branch if={kind === 0}><torusKnotGeometry args={[0.42, 0.13, 96, 16, 2, 3]} /></Branch>
      <Branch if={kind === 1}><octahedronGeometry args={[0.68, 0]} /></Branch>
      <Branch if={kind === 2}><sphereGeometry args={[0.44, 32, 24]} /></Branch>
      <Branch if={kind === 3}><boxGeometry args={[0.8, 0.8, 0.8]} /></Branch>
      <Branch if={kind === 4}><torusGeometry args={[0.48, 0.16, 20, 64]} /></Branch>
      <Branch if={kind === 5}><icosahedronGeometry args={[0.64, 1]} /></Branch>
      <meshStandardNodeMaterial color={kind % 2 === 0 ? '#9c957d' : '#83999a'} metalness={0.65} roughness={0.3} />
    </mesh>
    <Branch if={kind === 2}>{[0, 1, 2].map(i => <mesh key={i} castShadow position={[0, 1.65, 0]} rotation={[i * Math.PI / 3, Math.PI / 4, 0]}>
      <torusGeometry args={[0.63, 0.025, 8, 64]} /><meshStandardNodeMaterial color='#b1ada0' metalness={0.8} roughness={0.25} />
    </mesh>)}</Branch>
    <Box color='#242f32' position={[0, 3.47, 0]} size={[0.5, 0.1, 0.5]} />
    <mesh position={[0, 3.41, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.16, 24]} /><meshBasicNodeMaterial color='#ece1c4' />
    </mesh>
    <spotLight angle={0.65} castShadow color='#eee4cf' decay={2} distance={4.5} intensity={32} penumbra={0.7} position={[0, 3.35, 0.25]} shadow-mapSize={[512, 512]} shadow-normalBias={0.015} target={target} />
  </>
}

export default function TunnelDisplays({material}: {material: Material}) {
  return <group name='sealed-tunnel-displays'>
    {tunnelDisplays.map(display => <group key={display.side} name={`tunnel-display-${display.side}`}>
      <RigidBody colliders={false} type='fixed'>
        {display.shell.map(({position, size}, i) => <group key={i}>
          <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} position={position} />
          <Box material={material} position={position} size={size} />
        </group>)}
      </RigidBody>
      {display.exhibits.map(exhibit => <group key={exhibit.id} name={exhibit.id} position={exhibit.position}>
        <DisplayExhibit kind={exhibit.kind} material={material} />
      </group>)}
    </group>)}
  </group>
}
