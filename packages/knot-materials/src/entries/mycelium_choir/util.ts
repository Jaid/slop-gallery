import {positionView, time} from 'three/tsl'

export function choirPulse() {
  return time
    .mul(0.92)
    .add(positionView.length().mul(2.15))
    .sin()
    .mul(0.5)
    .add(0.5)
    .pow(5)
}
