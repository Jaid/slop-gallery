import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import {lowerGallery, oculusCeiling} from '#src/lib/gallery/lowerGallery.ts'

import OculusBalcony from './OculusBalcony.tsx'
import OculusGround from './OculusGround.tsx'
import OculusRailings from './OculusRailings.tsx'
import {Box} from './primitives.tsx'
import TunnelDisplays from './TunnelDisplays.tsx'

const {oculus, tunnel, floorY} = lowerGallery
const ceilingY = oculus.ceiling.topY - oculus.ceiling.thickness / 2

export default function OculusRoom({material}: {material: Material}) {
  return <group name="oculus-room">
    <OculusBalcony material={material}/>
    <OculusGround material={material}/>
    <OculusRailings/>
    <TunnelDisplays material={material}/>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider position={[oculus.center[0], floorY - 0.12, oculus.center[1]]} args={[oculus.size[0] / 2, 0.12, oculus.size[1] / 2]}/>
      <Box name="oculus-floor" position={[oculus.center[0], floorY - 0.12, oculus.center[1]]} size={[oculus.size[0], 0.24, oculus.size[1]]} material={material}/>
      {oculusCeiling.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider position={[oculus.center[0] + x, ceilingY, oculus.center[1] + z]} args={[width / 2, oculus.ceiling.thickness / 2, depth / 2]}/>
        <Box name="oculus-ceiling-rim" position={[oculus.center[0] + x, ceilingY, oculus.center[1] + z]} size={[width, oculus.ceiling.thickness, depth]} material={material}/>
      </group>)}
      <CuboidCollider position={[tunnel.x, floorY - 0.12, (tunnel.northZ + tunnel.southZ) / 2]} args={[tunnel.width / 2, 0.12, (tunnel.southZ - tunnel.northZ) / 2]}/>
      <Box name="lower-tunnel-floor" position={[tunnel.x, floorY - 0.12, (tunnel.northZ + tunnel.southZ) / 2]} size={[tunnel.width, 0.24, tunnel.southZ - tunnel.northZ]} material={material}/>
      <CuboidCollider position={[tunnel.x, floorY + tunnel.height + 0.09, (tunnel.northZ + tunnel.southZ) / 2]} args={[tunnel.width / 2, 0.09, (tunnel.southZ - tunnel.northZ) / 2]}/>
      <Box name="lower-tunnel-ceiling" position={[tunnel.x, floorY + tunnel.height + 0.09, (tunnel.northZ + tunnel.southZ) / 2]} size={[tunnel.width, 0.18, tunnel.southZ - tunnel.northZ]} material={material}/>
    </RigidBody>
  </group>
}
