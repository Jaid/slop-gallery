import {CuboidCollider, RigidBody} from '@react-three/rapier'
import BranchComponent from 'branch-component'
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
      <BranchComponent else={<Box material={material} size={size} />} if={index === 0}><mesh castShadow geometry={panel} material={material} receiveShadow /></BranchComponent>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </group>)}
  </RigidBody>
}
