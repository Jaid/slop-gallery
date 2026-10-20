import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import LobbyTympanumGeometry, {lobbyTympanum} from '#src/lib/gallery/LobbyTympanumGeometry.ts'
import CelestialMosaicMaterial from '#src/lib/materials/CelestialMosaicMaterial.ts'

/** A solid celestial tympanum on the south lunette, sharing the vault’s stone and gold finishes. */
export default function LobbyTympanum({gilt, stone}: {
  gilt: Material
  stone: Material
}) {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new LobbyTympanumGeometry, []))
  const mosaic = useDisposable(useMemo(() => new CelestialMosaicMaterial(isHeavy), [isHeavy]))
  const collision = useMemo(() => geometry.collision(), [geometry])
  return <group name='lobby-celestial-tympanum' position={[0, 0, lobbyTympanum.wallZ]} rotation={[0, Math.PI, 0]}>
    <RigidBody colliders={false} type='fixed'><MeshSurfaceCollider args={collision} /></RigidBody>
    <mesh castShadow geometry={geometry.field} material={mosaic} name='lobby-tympanum-mosaic' receiveShadow />
    <mesh castShadow geometry={geometry.stone} material={stone} name='lobby-tympanum-limestone' receiveShadow />
    <mesh castShadow geometry={geometry.gold} material={gilt} name='lobby-tympanum-gilt' receiveShadow />
  </group>
}
