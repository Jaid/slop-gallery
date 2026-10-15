import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import EntranceGeometry from '#src/lib/gallery/EntranceGeometry.ts'
import BronzeMaterial from '#src/lib/materials/BronzeMaterial.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'
import WalnutMaterial from '#src/lib/materials/WalnutMaterial.ts'

export default function MainEntrance() {
  const geometry = useDisposable(useMemo(() => new EntranceGeometry, []))
  const stone = useDisposable(useMemo(() => new LimestoneMaterial, []))
  const wood = useDisposable(useMemo(() => new WalnutMaterial, []))
  const bronze = useDisposable(useMemo(() => new BronzeMaterial, []))
  // The existing solid north wall remains its collider: there is no unfinished exterior.
  return <group name='lobby-main-entrance' userData={{closed: true}}>
    <mesh castShadow geometry={geometry.leaves} material={wood} name='entrance-walnut-doors' receiveShadow />
    <mesh castShadow geometry={geometry.frame} material={stone} name='entrance-stone-surround' receiveShadow />
    <mesh castShadow geometry={geometry.metal} material={bronze} name='entrance-bronze-details' receiveShadow />
  </group>
}
