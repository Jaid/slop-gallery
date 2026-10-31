import type {NodeMaterial} from 'three/webgpu'

import CoveredPassage from '#component/CoveredPassage'
import CoveredRoute from '#component/CoveredRoute'
import {bastionApproach, bastionHairpin, bastionLanterns, bastionMouth, bastionRun} from '#src/lib/gallery/bastion.ts'

const lanterns = Object.values(bastionLanterns)

/** The castle-stone passage from the Oculus’ west doorway under the Cinnabar, up the hairpin, north over the Lodge and round into the Cinnabar. */
export default function BastionRoom({material}: {material: NodeMaterial}) {
  return <group name='bastion-room'>
    <CoveredPassage material={material} passage={bastionMouth} />
    <CoveredRoute lanterns={lanterns} material={material} passage={bastionHairpin} />
    <CoveredPassage material={material} passage={bastionRun} />
    <CoveredPassage material={material} passage={bastionApproach} />
  </group>
}
