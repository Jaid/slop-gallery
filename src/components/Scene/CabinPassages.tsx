import type {Material} from 'three/webgpu'

import {useEffect, useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {cabinApproach, cabinTunnel, cabinWindowRibCutouts} from '#src/lib/gallery/cabin.ts'
import {CabinWoodMaterial} from '#src/lib/materials/CabinWoodMaterial.ts'

import AmberStairs from './AmberStairs.tsx'
import CoveredPassage from './CoveredPassage.tsx'
import {surfaceTexture} from './materials.ts'

export default function CabinPassages({material}: {material: Material}) {
  const lining = useMemo(() => new CabinWoodMaterial, [])
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
  return <group name="cabin-route">
    <CoveredPassage passage={cabinTunnel} material={material}/>
    <CoveredPassage passage={cabinApproach} material={lining} timber={timber} ribCutouts={cabinWindowRibCutouts}/>
    <AmberStairs timber={timber} lining={lining}/>
  </group>
}

