import type {NodeMaterial, Texture} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import CoveredPassage from '#component/levels/gallery/CoveredPassage'
import TimberTransition from '#component/levels/gallery/TimberTransition'
import Box from '#src/components/Scene/primitives.tsx'
import {corridorPassage, lodgeThreshold} from '#src/lib/gallery/corridor.ts'
import {lodgeFloorPlanks, lodgeTunnel, lodgeTunnelTransition} from '#src/lib/gallery/lodge.ts'
import lodgeTimber from '#src/lib/gallery/lodgeTimber.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import PlankMaterial from '#src/lib/materials/PlankMaterial.ts'

/** The castle-stone tunnel from the Lodge to the corridor, with its timber transition and the threshold in the corridor’s doorway. */
export default function LodgeTunnel({material, wood}: {
  material: NodeMaterial
  wood: Texture
}) {
  const lining = useDisposable(useMemo(() => lightIndoors(new LodgeWoodMaterial), []))
  const timber = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial(lodgeTimber(wood))), [wood]))
  // The Lodge’s plank floor, continued board for board into the tunnel’s timber transition and over its threshold in the corridor’s doorway.
  const floor = useDisposable(useMemo(() => lightIndoors(new PlankMaterial(lodgeFloorPlanks)), []))
  return <group name='lodge-tunnel'>
    <CoveredPassage lamps={['lodge-tunnel_pendants']} material={material} passage={lodgeTunnel} transition={lodgeTunnelTransition} />
    <TimberTransition floor={floor} lining={lining} timber={timber} transition={lodgeTunnelTransition} />
    <Box material={floor} name='lodge-threshold' position={[lodgeThreshold.center[0], corridorPassage.floorY - 0.12, lodgeThreshold.center[1]]} size={[lodgeThreshold.size[0], 0.24, lodgeThreshold.size[1]]} />
  </group>
}
