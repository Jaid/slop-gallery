import {CuboidCollider, RigidBody} from '@react-three/rapier'
import {useEffect, useMemo} from 'react'

import Box from '#src/components/Scene/primitives.tsx'
import {billboardParts} from '#src/lib/knots/signs.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'

export default function Support({width, height}: {height: number
  width: number}) {
  const material = useMemo(() => new LodgeWoodMaterial, [])
  useEffect(() => () => material.dispose(), [material])
  return <RigidBody name="billboard-support" type="fixed" colliders={false}>
    {billboardParts(width, height).map(({position, rotation, size}, index) => <group key={index} position={position} rotation={rotation}>
      <Box size={size} material={material}/>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]}/>
    </group>)}
  </RigidBody>
}
