import type {AudioOutput} from '#src/lib/audio/proceduralAudio.ts'
import type {PortalFrame} from '#src/lib/gallery/fusion/portalFrame.ts'

import playBloodGush from '#src/lib/audio/bloodGush.ts'

import EmergenceEffect from '../base/EmergenceEffect.ts'
import BloodSpray from './BloodSpray.ts'
import {bloodDrops, drying} from './flights.ts'

/** Blood spurts out of the portal on two heartbeats as the result of a successful fusion flips out, to shrieking violins, rains down and splats on the floor, while the portal drips after it, until the splats dry away. */
export default class BloodEffect extends EmergenceEffect {
  override readonly afterglow = drying.start + drying.stagger + drying.duration
  readonly id = 'horror-blood'

  createSprites() {
    return new BloodSpray(bloodDrops)
  }

  sound(audio: AudioOutput, frame: PortalFrame) {
    playBloodGush(audio, frame, bloodDrops)
  }
}
