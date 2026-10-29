import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'

import DisplayStairway from '#component/DisplayStairway'
import SlopedBox from '#component/SlopedBox'
import Box from '#src/components/Scene/primitives.tsx'
import lowerGallery, {tunnelFloorHeight, tunnelSlope} from '#src/lib/gallery/lowerGallery.ts'
import tunnelDisplays from '#src/lib/gallery/tunnelDisplays.ts'
import lamps from '#src/rooms/exhibition/lamps.ts'

const DisplayExhibit = ({kind, material}: {
  kind: number
  material: Material
}) => {
  return <>
    <SlopedBox bottomSlope={tunnelSlope} collision={false} material={material} position={[0, 0.45, 0]} size={[1.15, 0.9, 1.15]} slope={0} />
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
  </>
}
/** Three housings on the tunnel’s ceiling, abreast of each row of exhibits, whose plain colored lights light both displays at once. */
const tunnelLightZs = tunnelDisplays[0].exhibits.map(exhibit => exhibit.position[2])
const tunnelLightColors = [lamps.tunnel_green, lamps.tunnel_blue, lamps.tunnel_red].map(lamp => lamp.tint)

export default function TunnelDisplays({material}: {material: Material}) {
  return <group name='tunnel-displays'>
    {tunnelDisplays.map(display => <group key={display.side} name={`tunnel-display-${display.side}`}>
      <RigidBody colliders={false} type='fixed'>
        {display.shell.map(({position, size}, i) => <group key={i}>
          <SlopedBox material={material} position={position} size={size} slope={tunnelSlope} />
        </group>)}
      </RigidBody>
      {display.exhibits.map(exhibit => <group key={exhibit.id} name={exhibit.id} position={exhibit.position}>
        <DisplayExhibit kind={exhibit.kind} material={material} />
      </group>)}
      <DisplayStairway material={material} stairway={display.stairway} />
    </group>)}
    {tunnelLightZs.map((z, i) => <group key={z} name='tunnel-ceiling-light' position={[lowerGallery.tunnel.x, tunnelFloorHeight(z) + lowerGallery.tunnel.height, z]} rotation={[-Math.atan(tunnelSlope), 0, 0]}>
      <Box color='#242f32' position={[0, -0.04, 0]} size={[0.5, 0.1, 0.5]} />
      <mesh position={[0, -0.091, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 24]} /><meshBasicNodeMaterial color={tunnelLightColors[i]} toneMapped={false} />
      </mesh>
    </group>)}
  </group>
}
