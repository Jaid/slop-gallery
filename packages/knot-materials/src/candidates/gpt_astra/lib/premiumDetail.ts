import {positionView} from 'three/tsl'

export function premiumDetail() {
  return positionView.length().smoothstep(1.15, 5.2).oneMinus()
}
