import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect} from 'react'

import Box from '#src/components/Scene/primitives.tsx'
import BillboardPanelGeometry from '#src/lib/knots/BillboardPanelGeometry.ts'
import {billboardParts} from '#src/lib/knots/signs.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'

export default function Support({width, height}: {
  height: number
  width: number
}) {
  const parts = billboardParts(width, height)
  const panel = new BillboardPanelGeometry(...parts[0].size)
  useEffect(() => () => panel.dispose(), [panel])
  const material = new LodgeWoodMaterial
  useEffect(() => () => material.dispose(), [material])
  return <RigidBody colliders={false} name='billboard-support' type='fixed'>
    {parts.map(({position, rotation, size}, index) => <group key={index} position={position} rotation={rotation}>
      {index === 0 ? <mesh castShadow geometry={panel} material={material} receiveShadow /> : <Box material={material} size={size} />}
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </group>)}
  </RigidBody>
}
