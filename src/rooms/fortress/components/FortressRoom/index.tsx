import type {NodeMaterial, Texture} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import CoveredPassage from '#component/CoveredPassage'
import CoveredRoute from '#component/CoveredRoute'
import TimberTransition from '#component/TimberTransition'
import {fortressApproach, fortressCurve, fortressLanterns, fortressMouth, fortressTransition} from '#src/lib/gallery/fortress.ts'
import {lodgeFloorPlanks} from '#src/lib/gallery/lodge.ts'
import lodgeTimber from '#src/lib/gallery/lodgeTimber.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import PlankMaterial from '#src/lib/materials/PlankMaterial.ts'

const lanterns = Object.values(fortressLanterns)

/** The castle-stone passage from the Oculus’ east doorway round its apse to the Lodge, with its timber transition into the Lodge. */
export default function FortressRoom({material, wood}: {
  material: NodeMaterial
  wood: Texture
}) {
  const lining = useDisposable(useMemo(() => lightIndoors(new LodgeWoodMaterial), []))
  const timber = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial(lodgeTimber(wood))), [wood]))
  // The Lodge’s plank floor, continued board for board into the timber transition.
  const floor = useDisposable(useMemo(() => lightIndoors(new PlankMaterial(lodgeFloorPlanks)), []))
  return <group name='fortress-room'>
    <CoveredPassage material={material} passage={fortressMouth} />
    <CoveredRoute lanterns={lanterns} material={material} passage={fortressCurve} />
    <CoveredPassage material={material} passage={fortressApproach} transition={fortressTransition} />
    <TimberTransition floor={floor} lining={lining} timber={timber} transition={fortressTransition} />
  </group>
}
