/** the roll about a Knot’s own z axis that stands it on the bridge between two of its three lobes, the third pointing straight up, which turns its x axis upright */
export const knotStandingRoll = Math.PI / 2

/** how tall an unscaled Knot stands at {@link knotStandingRoll}, in meters: the span of its vertices along x */
export const knotStandingHeight = 1.4668

/**
 * how deep a standing Knot’s displaced surface may sink into what it stands on, in meters. A standing Knot takes no contact skin for its displacement: Fiber’s Rapier predicts contacts only 2 mm ahead, and a skin thicker than that rounds off the narrow edge it stands on, so it topples.
 */
export const standingKnotSink = 0.01

/**
 * A Knot of `height` standing at {@link knotStandingRoll}, measured from its undisplaced collider `vertices`: the scale that makes it that tall, its collider vertices at that scale and how far its origin rises over the foot it stands on.
 */
export function standKnot(vertices: Float32Array, height: number) {
  let bottom = Infinity
  let top = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    bottom = Math.min(bottom, vertices[i])
    top = Math.max(top, vertices[i])
  }
  const scale = height / (top - bottom)
  return {
    lift: -bottom * scale,
    scale,
    vertices: vertices.map(value => value * scale),
  }
}
