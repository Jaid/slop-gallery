import {TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import OrbHolderGeometry from '#src/lib/gallery/OrbHolderGeometry.ts'
import GunmetalMaterial from '#src/lib/materials/GunmetalMaterial.ts'

/** The holders’ shared geometry, collider and material, for any number of them. */
export function useOrbHolder() {
  const geometry = useDisposable(useMemo(() => new OrbHolderGeometry, []))
  const material = useDisposable(useMemo(() => new GunmetalMaterial, []))
  const collision = useMemo(() => colliderGeometry(geometry.collision), [geometry])
  return {
    collision,
    geometry,
    material,
  }
}

/** A gunmetal stand an orb rests in, standing on whatever it is put on, like a pedestal’s cap, and part of the body that carries it. */
export default function OrbHolder({collision, geometry, material}: ReturnType<typeof useOrbHolder>) {
  return <group name='orb-holder'>
    <TrimeshCollider args={collision} />
    <mesh castShadow geometry={geometry.metal} material={material} name='orb-holder-metal' receiveShadow />
  </group>
}
