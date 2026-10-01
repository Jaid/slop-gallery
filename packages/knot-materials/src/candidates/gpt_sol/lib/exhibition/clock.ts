import {time} from 'three/tsl'

import {TAU} from '../../../../lib/TAU.ts'

/** Slow gallery breathing; the long inspection film returns to the same material state after 16 seconds. */
export const exhibitionSeconds = 16
export const exhibitionPhase = time.mul(TAU / exhibitionSeconds)
