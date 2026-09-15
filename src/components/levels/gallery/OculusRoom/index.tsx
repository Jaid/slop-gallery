import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import OculusBalcony from '#component/levels/gallery/OculusBalcony'
import OculusGround from '#component/levels/gallery/OculusGround'
import OculusRailings from '#component/levels/gallery/OculusRailings'
import TunnelDisplays from '#component/levels/gallery/TunnelDisplays'
import Box from '#src/components/Scene/primitives.tsx'
import lowerGallery, {oculusCeiling} from '#src/lib/gallery/lowerGallery.ts'

const {oculus, tunnel, floorY} = lowerGallery
const ceilingY = oculus.ceiling.topY - oculus.ceiling.thickness / 2

export default function OculusRoom({material}: {material: Material}) {
  return <group name='oculus-room'>
    <OculusBalcony material={material} />
    <OculusGround material={material} />
    <OculusRailings />
    <TunnelDisplays material={material} />
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[oculus.size[0] / 2, 0.12, oculus.size[1] / 2]} position={[oculus.center[0], floorY - 0.12, oculus.center[1]]} />
      <Box material={material} name='oculus-floor' position={[oculus.center[0], floorY - 0.12, oculus.center[1]]} size={[oculus.size[0], 0.24, oculus.size[1]]} />
      {oculusCeiling.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider args={[width / 2, oculus.ceiling.thickness / 2, depth / 2]} position={[oculus.center[0] + x, ceilingY, oculus.center[1] + z]} />
        <Box material={material} name='oculus-ceiling-rim' position={[oculus.center[0] + x, ceilingY, oculus.center[1] + z]} size={[width, oculus.ceiling.thickness, depth]} />
      </group>)}
      <CuboidCollider args={[tunnel.width / 2, 0.12, (tunnel.southZ - tunnel.northZ) / 2]} position={[tunnel.x, floorY - 0.12, (tunnel.northZ + tunnel.southZ) / 2]} />
      <Box material={material} name='lower-tunnel-floor' position={[tunnel.x, floorY - 0.12, (tunnel.northZ + tunnel.southZ) / 2]} size={[tunnel.width, 0.24, tunnel.southZ - tunnel.northZ]} />
      <CuboidCollider args={[tunnel.width / 2, 0.09, (tunnel.southZ - tunnel.northZ) / 2]} position={[tunnel.x, floorY + tunnel.height + 0.09, (tunnel.northZ + tunnel.southZ) / 2]} />
      <Box material={material} name='lower-tunnel-ceiling' position={[tunnel.x, floorY + tunnel.height + 0.09, (tunnel.northZ + tunnel.southZ) / 2]} size={[tunnel.width, 0.18, tunnel.southZ - tunnel.northZ]} />
    </RigidBody>
  </group>
}
