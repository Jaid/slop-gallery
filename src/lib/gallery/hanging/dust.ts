import type {DustParticle, HangingStage} from './base/HangingAnimation.ts'

import {between} from './motion.ts'

/** a point on the frame’s outline against the wall, with the direction straight out of the frame there along the wall */
type EdgePoint = {
  /** how far along the outline it lies, 0 to 1 counterclockwise from the bottom left corner */
  along: number
  outward: [number, number]
  x: number
  y: number
}

/** `count` points spread along the outline of the frame’s back, each a little off its even spacing; corners point out diagonally. */
export function outline({halfWidth, halfHeight, random}: Pick<HangingStage, 'halfHeight' | 'halfWidth' | 'random'>, count: number) {
  const perimeter = 4 * (halfWidth + halfHeight)
  const points: Array<EdgePoint> = []
  for (let i = 0; i < count; i++) {
    const along = (i + random() * 0.9) / count
    let distance = along * perimeter
    let x: number
    let y: number
    let outward: [number, number]
    if (distance < 2 * halfWidth) {
      x = -halfWidth + distance
      y = -halfHeight
      outward = [0, -1]
    } else if ((distance -= 2 * halfWidth) < 2 * halfHeight) {
      x = halfWidth
      y = -halfHeight + distance
      outward = [1, 0]
    } else if ((distance -= 2 * halfHeight) < 2 * halfWidth) {
      x = halfWidth - distance
      y = halfHeight
      outward = [0, 1]
    } else {
      distance -= 2 * halfWidth
      x = -halfWidth
      y = halfHeight - distance
      outward = [-1, 0]
    }
    // Near a corner, the air escapes diagonally.
    const cornerX = Math.max(0, 1 - (halfWidth - Math.abs(x)) / 0.12) * Math.sign(x)
    const cornerY = Math.max(0, 1 - (halfHeight - Math.abs(y)) / 0.12) * Math.sign(y)
    const blendedX = outward[0] || cornerX * 0.7
    const blendedY = outward[1] || cornerY * 0.7
    const length = Math.hypot(blendedX, blendedY)
    points.push({
      along,
      outward: [blendedX / length, blendedY / length],
      x,
      y,
    })
  }
  return points
}

/** Dust blown out from under the frame’s outline as it strikes the wall, along the wall and a little into the room, at `speed` m/s on average, drifting up a little in the warm air. */
export function outlineBurst(stage: HangingStage, {count, delay, speed}: {
  count: number
  delay: number
  speed: number
}): Array<DustParticle> {
  const {back, random} = stage
  return outline(stage, count).map(point => {
    // Now and then, the air escapes through a gap in a jet.
    const pace = speed * between(random, 0.55, 1.45) * (random() < 0.12 ? 1.9 : 1)
    const swerve = between(random, -0.35, 0.35)
    const [ox, oy] = point.outward
    return {
      delay: delay + random() * 0.025,
      drag: between(random, 3.6, 6),
      gravity: 0.04 - 0.3 * random(),
      life: between(random, 1.3, 2.4),
      opacity: between(random, 0.3, 0.55),
      origin: [point.x + ox * 0.015, point.y + oy * 0.015, back + between(random, 0.015, 0.07)],
      size: between(random, 0.1, 0.18),
      spread: between(random, 0.45, 0.8),
      velocity: [(ox - oy * swerve) * pace, (oy + ox * swerve) * pace, between(random, 0.12, 0.5)],
    }
  })
}

/** Fine motes that hang in the air longer than the puffs, catching the light, wherever `origin` puts them. */
export function motes(stage: HangingStage, {count, delay, origin, speed = 0.9}: {
  count: number
  delay: number
  origin: (point: EdgePoint) => [number, number, number]
  speed?: number
}): Array<DustParticle> {
  const {random} = stage
  return outline(stage, count).map(point => {
    const angle = random() * Math.PI * 2
    const pace = speed * between(random, 0.3, 1)
    return {
      delay: delay + random() * 0.05,
      drag: between(random, 2, 3.2),
      gravity: between(random, 0.04, 0.16),
      life: between(random, 2.8, 4.6),
      opacity: between(random, 0.55, 0.85),
      origin: origin(point),
      size: between(random, 0.01, 0.018),
      spread: between(random, 0.02, 0.032),
      velocity: [point.outward[0] * pace + Math.cos(angle) * 0.2, point.outward[1] * pace + Math.sin(angle) * 0.2, between(random, 0.1, 0.45)],
    }
  })
}
