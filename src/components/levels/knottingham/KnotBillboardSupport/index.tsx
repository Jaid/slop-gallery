import {CuboidCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import BillboardPanelGeometry from 'knot-materials/BillboardPanelGeometry.ts'
import {knotPreviewHeight, knotPreviewWidth} from 'knot-materials/KnotPreviewLayout.ts'
import {billboardParts} from 'knot-materials/signs.ts'
import {useMemo} from 'react'

import Box from '#src/components/Scene/primitives.tsx'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'

const parts = billboardParts(knotPreviewWidth, knotPreviewHeight)

export default function Support() {
  const panel = useDisposable(useMemo(() => new BillboardPanelGeometry(...parts[0].size), []))
  const material = useDisposable(useMemo(() => new LodgeWoodMaterial, []))
  return <RigidBody colliders={false} name='billboard-support' type='fixed'>
    {parts.map(({position, rotation, size}, index) => <group key={index} position={position} rotation={rotation}>
      <Branch if={index === 0} else={<Box material={material} size={size} />}><mesh castShadow geometry={panel} material={material} receiveShadow /></Branch>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </group>)}
  </RigidBody>
}
