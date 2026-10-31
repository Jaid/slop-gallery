import type Passage from '#src/lib/gallery/passages/Passage.ts'
import type {Vec3} from '#src/lib/gallery/types.ts'
import type {Lamp} from '../base/Room.ts'

import {bastionApproach, bastionHairpin, bastionLanterns, bastionMouth, bastionPassageLanterns, bastionRun} from '#src/lib/gallery/bastion.ts'
import {fortressOrigin} from '#src/lib/gallery/fortress.ts'
import {passageLight, passageLightCount, routeLight} from '#src/lib/gallery/pendants/mounts.ts'

const [originX, originY, originZ] = fortressOrigin
/** `below` meters under the middle of the lantern whose light hangs at the position, with how it shines: like the Fortress’ lanterns */
const lantern = ([x, y, z]: Vec3, shine: Pick<Lamp, 'decay' | 'range' | 'strength'> = {}, below = 0.3): Lamp => ({
  position: [x - originX, y - below - originY, z - originZ],
  strength: 30,
  tint: '#ffcd8a',
  range: 7,
  decay: 1.75,
  shadow: true,
  ...shine,
})
/** The lights of the lanterns a straight passage keeps, by their mount order across its spans. */
const keptLights = (passage: Passage, kept: ReadonlyArray<boolean>) => passage.spans.flatMap((_, span) => Array.from({length: passageLightCount(passage, span)}, (__, index) => passageLight(passage, span, index))).filter((_, mount) => kept[mount])
const [mouth, elbow] = keptLights(bastionMouth, bastionPassageLanterns.mouth)
const [run] = keptLights(bastionRun, bastionPassageLanterns.run)
const [approach] = keptLights(bastionApproach, bastionPassageLanterns.approach)

export default {
  // Under the Cinnabar, halfway along the run west, which the Oculus sees through the doorway, and before the elbow at its end.
  lantern_mouth: lantern(mouth),
  lantern_elbow: lantern(elbow),
  // Halfway up the west leg, round the apex of the turn and halfway up the east leg.
  lantern_west: lantern(routeLight(bastionHairpin, bastionLanterns.west)),
  lantern_turn: lantern(routeLight(bastionHairpin, bastionLanterns.turn)),
  lantern_climb: lantern(routeLight(bastionHairpin, bastionLanterns.east)),
  // Halfway along the run north, over the Lodge’s roof, and along the strip past the screen wall’s arch.
  lantern_run: lantern(run),
  lantern_strip: lantern(approach),
} satisfies Record<string, Lamp>
