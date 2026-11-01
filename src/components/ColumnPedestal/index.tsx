import type {Vec3} from '#src/lib/gallery.ts'
import type {ReactNode} from 'react'

import {RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import ColumnPedestalGeometry, {columnPedestalHeight} from '#src/lib/gallery/ColumnPedestalGeometry.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'

/** The columns’ shared geometry, collider and stone, for any number of them. */
export function useColumnPedestal() {
  const geometry = useDisposable(useMemo(() => new ColumnPedestalGeometry, []))
  const material = useDisposable(useMemo(() => new LimestoneMaterial, []))
  return {
    geometry,
    material,
  }
}

/** A slender fluted column of limestone, carrying something small like an orb on its round cap. */
export default function ColumnPedestal({position, rotation = 0, children, geometry, material}: ReturnType<typeof useColumnPedestal> & {
  /** what stands on its cap, fixed to it and turning with it, its y up from the cap */
  children?: ReactNode
  position: Vec3
  /** its turn about y */
  rotation?: number
}) {
  return <RigidBody colliders={false} position={position} rotation={[0, rotation, 0]} type='fixed'>
    <TrimeshCollider args={geometry.collision} />
    <mesh castShadow geometry={geometry.stone} material={material} name='column-pedestal-stone' receiveShadow />
    <group position={[0, columnPedestalHeight, 0]}>{children}</group>
  </RigidBody>
}
