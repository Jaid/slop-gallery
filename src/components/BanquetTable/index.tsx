import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import {banquetTableColliders} from '#src/lib/gallery/banquet.ts'
import BanquetTableGeometry from '#src/lib/gallery/BanquetTableGeometry.ts'
import GrainedWoodMaterial from '#src/lib/materials/GrainedWoodMaterial.ts'

/** The Banquet’s long farmhouse table of lacquered chestnut-brown pine, in the room’s frame, standing in its middle. */
export default function BanquetTable() {
  const geometry = useDisposable(useMemo(() => new BanquetTableGeometry, []))
  const wood = useDisposable(useMemo(() => new GrainedWoodMaterial({
    heartwood: ['#3c1b0c', '#70391a'],
    latewood: '#2b140a',
  }, {roughness: 0.4}), []))
  return <group name='banquet-table'>
    <RigidBody colliders={false} type='fixed'>
      {banquetTableColliders().map(({center, name, size}, index) => <CuboidCollider key={index} args={[size[0] / 2, size[1] / 2, size[2] / 2]} name={name} position={center} />)}
    </RigidBody>
    <mesh castShadow geometry={geometry.timber} material={wood} receiveShadow />
  </group>
}
