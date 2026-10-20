import type {Material} from 'three/webgpu'

import {CuboidCollider, CylinderCollider, RigidBody} from '@react-three/rapier'

import OculusGround from '#component/levels/gallery/OculusGround'
import OculusRailings from '#component/levels/gallery/OculusRailings'
import SlopedBox from '#component/levels/gallery/SlopedBox'
import TunnelDisplays from '#component/levels/gallery/TunnelDisplays'
import Box from '#src/components/Scene/primitives.tsx'
import lowerGallery, {oculusCeiling, oculusLandingPlinths, tunnelFloorHeight, tunnelSlope} from '#src/lib/gallery/lowerGallery.ts'
import oculusBalcony from '#src/lib/gallery/oculusBalcony.ts'

const {oculus, tunnel} = lowerGallery
const {floorY} = oculus
const tunnelCenterZ = (tunnel.northZ + tunnel.southZ) / 2
const tunnelCenterY = tunnelFloorHeight(tunnelCenterZ)
const ceilingY = oculus.ceiling.topY - oculus.ceiling.thickness / 2

export default function OculusRoom({material}: {material: Material}) {
  return <group name='oculus-room'>
    <OculusGround material={material} />
    <OculusRailings />
    <TunnelDisplays material={material} />
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={oculusBalcony.size.map(value => value / 2) as [number, number, number]} position={oculusBalcony.position} />
      <Box material={material} name='oculus-balcony' position={oculusBalcony.position} size={oculusBalcony.size} />
      {oculusLandingPlinths.map(({side, position, radius, height}) => <group key={side} position={position}>
        <CylinderCollider args={[height / 2, radius]} />
        <mesh castShadow material={material} name={`oculus-landing-plinth-${side}`} receiveShadow><cylinderGeometry args={[radius, radius, height, 32]} /></mesh>
      </group>)}
      <CuboidCollider args={[oculus.size[0] / 2, 0.12, oculus.size[1] / 2]} position={[oculus.center[0], floorY - 0.12, oculus.center[1]]} />
      <Box material={material} name='oculus-floor' position={[oculus.center[0], floorY - 0.12, oculus.center[1]]} size={[oculus.size[0], 0.24, oculus.size[1]]} />
      {oculusCeiling.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider args={[width / 2, oculus.ceiling.thickness / 2, depth / 2]} position={[oculus.center[0] + x, ceilingY, oculus.center[1] + z]} />
        <Box material={material} name='oculus-ceiling-rim' position={[oculus.center[0] + x, ceilingY, oculus.center[1] + z]} size={[width, oculus.ceiling.thickness, depth]} />
      </group>)}
      <SlopedBox material={material} name='lower-tunnel-floor' position={[tunnel.x, tunnelCenterY - 0.12, tunnelCenterZ]} size={[tunnel.width, 0.24, tunnel.southZ - tunnel.northZ]} slope={tunnelSlope} />
      <SlopedBox material={material} name='lower-tunnel-ceiling' position={[tunnel.x, tunnelCenterY + tunnel.height + 0.09, tunnelCenterZ]} size={[tunnel.width, 0.18, tunnel.southZ - tunnel.northZ]} slope={tunnelSlope} />
    </RigidBody>
  </group>
}
