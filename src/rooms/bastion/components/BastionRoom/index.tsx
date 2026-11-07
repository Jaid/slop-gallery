import type {NodeMaterial, Texture} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import CoveredPassage from '#component/CoveredPassage'
import CoveredRoute from '#component/CoveredRoute'
import TimberTransition from '#component/TimberTransition'
import {bastionApproach, bastionCurve, bastionLanterns, bastionMouth, bastionTransition} from '#src/lib/gallery/bastion.ts'
import {bastionLink, bastionLinkLanterns, climbMouthHollow, lodgeSpur, lodgeSpurLanterns} from '#src/lib/gallery/bastionNetwork.ts'
import {climbApproach, climbApproachLantern, climbHairpin, climbLanterns, climbMouth, climbRun, climbRunLantern} from '#src/lib/gallery/climb.ts'
import {lodgeFloorPlanks} from '#src/lib/gallery/lodge.ts'
import lodgeTimber from '#src/lib/gallery/lodgeTimber.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'
import LodgeWoodMaterial from '#src/lib/materials/LodgeWoodMaterial.ts'
import PlankMaterial from '#src/lib/materials/PlankMaterial.ts'
import BastionCistern from '#src/rooms/bastion/components/BastionCistern/index.tsx'
import BastionCrater from '#src/rooms/bastion/components/BastionCrater/index.tsx'
import BastionGate from '#src/rooms/bastion/components/BastionGate/index.tsx'

const lanterns = Object.values(bastionLanterns)

/** Both castle-stone wings and their curved link: around the apse into Lodge and up the western hairpin into Forge, with the crater in the landing where the link opens and the cistern behind the Forge’s vestibule. */
export default function BastionRoom({material, wood}: {
  material: NodeMaterial
  wood: Texture
}) {
  const lining = useDisposable(useMemo(() => lightIndoors(new LodgeWoodMaterial), []))
  const timber = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial(lodgeTimber(wood))), [wood]))
  // The Lodge’s plank floor, continued board for board into the timber transition.
  const floor = useDisposable(useMemo(() => lightIndoors(new PlankMaterial(lodgeFloorPlanks)), []))
  return <group name='bastion-room'>
    <CoveredPassage hollow={climbMouthHollow} material={material} passage={climbMouth} />
    <CoveredRoute lanterns={Object.values(climbLanterns)} material={material} passage={climbHairpin} />
    <CoveredRoute lanterns={[climbRunLantern]} material={material} passage={climbRun} />
    <CoveredRoute lanterns={[climbApproachLantern]} material={material} passage={climbApproach} />
    <BastionCistern stone={material} />
    <CoveredRoute lanterns={bastionLinkLanterns} material={material} passage={bastionLink} />
    <CoveredRoute lanterns={lodgeSpurLanterns} material={material} passage={lodgeSpur} />
    <BastionGate />
    <CoveredPassage material={material} passage={bastionMouth} />
    <CoveredRoute lanterns={lanterns} material={material} passage={bastionCurve} />
    <BastionCrater stone={material} />
    <CoveredPassage material={material} passage={bastionApproach} transition={bastionTransition} />
    <TimberTransition floor={floor} lining={lining} timber={timber} transition={bastionTransition} />
  </group>
}
