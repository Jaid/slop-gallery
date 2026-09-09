import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'

import {glasswellCeiling, lowerGallery} from '#src/lib/gallery/lowerGallery.ts'

import GlasswellBalcony from './GlasswellBalcony.tsx'
import GlasswellGround from './GlasswellGround.tsx'
import GlasswellRailings from './GlasswellRailings.tsx'
import {Box} from './primitives.tsx'
import TunnelDisplays from './TunnelDisplays.tsx'

const {glasswell, tunnel, floorY} = lowerGallery
const ceilingY = glasswell.ceiling.topY - glasswell.ceiling.thickness / 2

export default function GlasswellRoom({material}: {material: Material}) {
  return <group name="glasswell-room">
    <GlasswellBalcony material={material}/>
    <GlasswellGround material={material}/>
    <GlasswellRailings/>
    <TunnelDisplays material={material}/>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider position={[glasswell.center[0], floorY - 0.12, glasswell.center[1]]} args={[glasswell.size[0] / 2, 0.12, glasswell.size[1] / 2]}/>
      <Box name="glasswell-floor" position={[glasswell.center[0], floorY - 0.12, glasswell.center[1]]} size={[glasswell.size[0], 0.24, glasswell.size[1]]} material={material}/>
      {glasswellCeiling.map(({center: [x, z], size: [width, depth]}, i) => <group key={i}>
        <CuboidCollider position={[glasswell.center[0] + x, ceilingY, glasswell.center[1] + z]} args={[width / 2, glasswell.ceiling.thickness / 2, depth / 2]}/>
        <Box name="glasswell-ceiling-rim" position={[glasswell.center[0] + x, ceilingY, glasswell.center[1] + z]} size={[width, glasswell.ceiling.thickness, depth]} material={material}/>
      </group>)}
      <CuboidCollider position={[tunnel.x, floorY - 0.12, (tunnel.northZ + tunnel.southZ) / 2]} args={[tunnel.width / 2, 0.12, (tunnel.southZ - tunnel.northZ) / 2]}/>
      <Box name="lower-tunnel-floor" position={[tunnel.x, floorY - 0.12, (tunnel.northZ + tunnel.southZ) / 2]} size={[tunnel.width, 0.24, tunnel.southZ - tunnel.northZ]} material={material}/>
      <CuboidCollider position={[tunnel.x, floorY + tunnel.height + 0.09, (tunnel.northZ + tunnel.southZ) / 2]} args={[tunnel.width / 2, 0.09, (tunnel.southZ - tunnel.northZ) / 2]}/>
      <Box name="lower-tunnel-ceiling" position={[tunnel.x, floorY + tunnel.height + 0.09, (tunnel.northZ + tunnel.southZ) / 2]} size={[tunnel.width, 0.18, tunnel.southZ - tunnel.northZ]} material={material}/>
    </RigidBody>
  </group>
}
