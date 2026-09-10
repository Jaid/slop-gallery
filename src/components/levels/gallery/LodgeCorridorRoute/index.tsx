import type {Material} from 'three/webgpu'

import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import CorridorStairs from '#component/levels/gallery/CorridorStairs'
import CoveredPassage from '#component/levels/gallery/CoveredPassage'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import {corridorPassage} from '#src/lib/gallery/corridor.ts'
import {lodgeTunnel, lodgeWindowRibCutouts} from '#src/lib/gallery/lodge.ts'
import {LodgeWoodMaterial} from '#src/lib/materials/LodgeWoodMaterial.ts'

export default function LodgeCorridorRoute({material}: {material: Material}) {
  const lining = useMemo(() => new LodgeWoodMaterial, [])
  const grain = useMemo(() => surfaceTexture('wood'), [])
  const timber = useMemo(() => new MeshStandardNodeMaterial({
    map: grain,
    bumpMap: grain,
    bumpScale: 0.012,
    color: '#e9c99f',
    roughness: 0.72,
    envMapIntensity: 0.2,
  }), [grain])
  useEffect(() => () => {
    lining.dispose()
    grain.dispose()
    timber.dispose()
  }, [lining, grain, timber])
  return <group name="lodge-corridor-route">
    <CoveredPassage passage={lodgeTunnel} material={material}/>
    <CoveredPassage passage={corridorPassage} material={lining} timber={timber} ribCutouts={lodgeWindowRibCutouts}/>
    <CorridorStairs timber={timber} lining={lining}/>
  </group>
}

