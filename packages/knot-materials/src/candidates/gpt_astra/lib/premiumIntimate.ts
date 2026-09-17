import {positionView} from 'three/tsl'

export function premiumIntimate() {
  return positionView.length().smoothstep(0.75, 2.6).oneMinus()
}
