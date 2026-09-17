import {time} from 'three/tsl'

export function heartbeat() {
  const t = time.mul(1.37)
  const primary = t.mul(Math.PI * 2).sin().max(0).pow(3)
  const echo = t.mul(Math.PI * 2).sub(0.28).sin().max(0).pow(4).mul(0.55)
  return primary.add(echo).mul(0.55).add(0.45)
}
