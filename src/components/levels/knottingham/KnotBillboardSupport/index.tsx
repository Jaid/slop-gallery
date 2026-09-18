import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import BillboardPanelGeometry from 'knot-materials/BillboardPanelGeometry.ts'
import {billboardParts} from 'knot-materials/signs.ts'
import {useEffect} from 'react'

import Box from '#src/components/Scene/primitives.tsx'
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
      <Branch if={index === 0} else={<Box material={material} size={size} />}><mesh castShadow geometry={panel} material={material} receiveShadow /></Branch>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </group>)}
  </RigidBody>
}
