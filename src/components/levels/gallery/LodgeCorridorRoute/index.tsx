import type {NodeMaterial} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import {useGraphicsModeValue} from 'use-graphics-mode'

import CorridorStairs from '#component/levels/gallery/CorridorStairs'
import CoveredPassage from '#component/levels/gallery/CoveredPassage'
import TimberTransition from '#component/levels/gallery/TimberTransition'
import {surfaceTexture} from '#src/components/Scene/materials.ts'
import Box from '#src/components/Scene/primitives.tsx'
import {corridorPassage, lodgeThreshold} from '#src/lib/gallery/corridor.ts'
import {subtractFloorOpening} from '#src/lib/gallery/floors.ts'
import {lodgeFloorPlanks, lodgeTunnel, lodgeTunnelTransition, lodgeWindowRibCutouts} from '#src/lib/gallery/lodge.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import PlankMaterial from '#src/lib/materials/PlankMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

const corridorPaving = corridorPassage.floors.flatMap(floor => subtractFloorOpening(floor, lodgeThreshold))

export default function LodgeCorridorRoute({material, corridorLining}: {
  /** the corridor’s board lining, shared with its walls and already lit by {@link lightIndoors} */
  corridorLining: NodeMaterial
  material: NodeMaterial
}) {
  const lining = useDisposable(useMemo(() => lightIndoors(new LodgeWoodMaterial), []))
  const {surfaceAnisotropy} = useGraphicsModeValue(getGraphicsProfile)
  const grain = useDisposable(useMemo(() => surfaceTexture('wood', surfaceAnisotropy), [surfaceAnisotropy]))
  const timberOptions = useMemo(() => ({
    map: grain,
    bumpMap: grain,
    bumpScale: 0.012,
    color: '#e9c99f',
    roughness: 0.72,
    envMapIntensity: 0.2,
  }), [grain])
  const timber = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial(timberOptions)), [timberOptions]))
  // The corridor is lit by its lanterns alone, so its portals need their own copy of the timber.
  const corridorTimber = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial(timberOptions)), [timberOptions]))
  // The Lodge’s plank floor, continued board for board into the tunnel’s timber transition and over its threshold in the corridor’s doorway.
  const floor = useDisposable(useMemo(() => lightIndoors(new PlankMaterial(lodgeFloorPlanks)), []))
  return <group name='lodge-corridor-route'>
    <CoveredPassage material={material} passage={lodgeTunnel} transition={lodgeTunnelTransition} />
    <TimberTransition floor={floor} lining={lining} timber={timber} transition={lodgeTunnelTransition} />
    <CoveredPassage material={corridorLining} passage={corridorPassage} paving={corridorPaving} ribCutouts={lodgeWindowRibCutouts} sole timber={corridorTimber} />
    <Box material={floor} name='lodge-threshold' position={[lodgeThreshold.center[0], corridorPassage.floorY - 0.12, lodgeThreshold.center[1]]} size={[lodgeThreshold.size[0], 0.24, lodgeThreshold.size[1]]} />
    <CorridorStairs lining={corridorLining} timber={corridorTimber} />
  </group>
}
