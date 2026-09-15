import type {Material} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import CorridorStairs from '#component/levels/gallery/CorridorStairs'
import CoveredPassage from '#component/levels/gallery/CoveredPassage'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import {corridorPassage} from '#src/lib/gallery/corridor.ts'
import {lodgeTunnel, lodgeWindowRibCutouts} from '#src/lib/gallery/lodge.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'

export default function LodgeCorridorRoute({material}: {material: Material}) {
  const lining = new LodgeWoodMaterial
  const grain = surfaceTexture('wood')
  const timber = new MeshStandardNodeMaterial({
    map: grain,
    bumpMap: grain,
    bumpScale: 0.012,
    color: '#e9c99f',
    roughness: 0.72,
    envMapIntensity: 0.2,
  })
  useDisposable(lining)
  useDisposable(grain)
  useDisposable(timber)
  return <group name='lodge-corridor-route'>
    <CoveredPassage passage={lodgeTunnel} material={material} />
    <CoveredPassage passage={corridorPassage} material={lining} timber={timber} ribCutouts={lodgeWindowRibCutouts} />
    <CorridorStairs timber={timber} lining={lining} />
  </group>
}

