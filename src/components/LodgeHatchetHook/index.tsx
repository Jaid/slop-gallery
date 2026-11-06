import type {Material} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'

import {lodgeHatchetHook} from '#src/lib/gallery/lodgeInterior/layout.ts'
import createLodgeHatchetHookGeometry from '#src/lib/gallery/lodgeInterior/LodgeHatchetHookGeometry.ts'

/** Permanent iron hook on the front of the right fireplace pillar; the hatchet is a separate, pickable prop. */
export default function LodgeHatchetHook({material}: {material: Material}) {
  const geometry = useDisposable(useMemo(() => createLodgeHatchetHookGeometry(), []))
  return <group name='lodge-hatchet-hook' position={lodgeHatchetHook.position}>
    <mesh castShadow geometry={geometry} material={material} name='lodge-hatchet-hook-iron' receiveShadow />
  </group>
}