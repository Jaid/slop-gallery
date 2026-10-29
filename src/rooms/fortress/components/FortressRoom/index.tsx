import type {NodeMaterial, Texture} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import CoveredPassage from '#component/CoveredPassage'
import TimberTransition from '#component/TimberTransition'
import {lodgeFloorPlanks, lodgeTunnel, lodgeTunnelTransition} from '#src/lib/gallery/lodge.ts'
import lodgeTimber from '#src/lib/gallery/lodgeTimber.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import PlankMaterial from '#src/lib/materials/PlankMaterial.ts'

/** The castle-stone passage from the Oculus to the Lodge, with its timber transition into the Lodge. */
export default function FortressRoom({material, wood}: {
  material: NodeMaterial
  wood: Texture
}) {
  const lining = useDisposable(useMemo(() => lightIndoors(new LodgeWoodMaterial), []))
  const timber = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial(lodgeTimber(wood))), [wood]))
  // The Lodge’s plank floor, continued board for board into the timber transition.
  const floor = useDisposable(useMemo(() => lightIndoors(new PlankMaterial(lodgeFloorPlanks)), []))
  return <group name='fortress-room'>
    <CoveredPassage material={material} passage={lodgeTunnel} transition={lodgeTunnelTransition} />
    <TimberTransition floor={floor} lining={lining} timber={timber} transition={lodgeTunnelTransition} />
  </group>
}
