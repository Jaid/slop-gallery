import type {Material} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import CorridorStairs from '#component/levels/gallery/CorridorStairs'
import CoveredPassage from '#component/levels/gallery/CoveredPassage'
import TimberTransition from '#component/levels/gallery/TimberTransition'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import {corridorPassage} from '#src/lib/gallery/corridor.ts'
import {lodgeFloorFinish, lodgeTunnel, lodgeTunnelTransition, lodgeWindowRibCutouts} from '#src/lib/gallery/lodge.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import WorldMappedWoodMaterial from '#src/lib/materials/WorldMappedWoodMaterial.ts'

export default function LodgeCorridorRoute({material}: {material: Material}) {
  const lining = useDisposable(useMemo(() => new LodgeWoodMaterial, []))
  const grain = useDisposable(useMemo(() => surfaceTexture('wood'), []))
  const timber = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    map: grain,
    bumpMap: grain,
    bumpScale: 0.012,
    color: '#e9c99f',
    roughness: 0.72,
    envMapIntensity: 0.2,
  }), [grain]))
  const floor = useDisposable(useMemo(() => new WorldMappedWoodMaterial({
    ...lodgeFloorFinish,
    map: grain,
  }), [grain]))
  return <group name='lodge-corridor-route'>
    <CoveredPassage material={material} passage={lodgeTunnel} transition={lodgeTunnelTransition} />
    <TimberTransition floor={floor} lining={lining} timber={timber} transition={lodgeTunnelTransition} />
    <CoveredPassage material={lining} passage={corridorPassage} ribCutouts={lodgeWindowRibCutouts} timber={timber} />
    <CorridorStairs lining={lining} timber={timber} />
  </group>
}
