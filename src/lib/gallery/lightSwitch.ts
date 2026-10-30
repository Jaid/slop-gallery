import type {WallReservation} from '../placement/wallGeometry.ts'

/**
 * An old push-button light switch: a gilt plate with a mother-of-pearl button that switches on above an ebony one that switches off. Pressing either pushes it in and pops the other out.
 * All values are in meters, measured from the middle of the plate’s back on the wall.
 */
const lightSwitch = {
  /** width, height and depth of the plate */
  plate: [0.074, 0.118, 0.006],
  /** how far the plate’s edges are rounded */
  plateRadius: 0.0022,
  /** how far each button sits above or below the plate’s middle */
  buttonOffset: 0.024,
  buttonRadius: 0.0085,
  /** how far a button stands proud of the plate, pushed in (just past its collar) and popped out */
  buttonTravel: [0.003, 0.009],
  /** the gilt ring around each button */
  collar: {
    radius: 0.0125,
    depth: 0.0025,
  },
  /** the two gilt screw heads holding the plate, each this far above or below its middle */
  screw: {
    offset: 0.048,
    radius: 0.0032,
    depth: 0.0012,
  },
} as const

export default lightSwitch

/** The space a light switch plate centered `u` along its wall and `y` over its floor keeps free of artworks. */
export function lightSwitchReservation(u: number, y: number): WallReservation {
  const width = lightSwitch.plate[0]
  const height = lightSwitch.plate[1]
  return {
    u,
    width,
    bottom: y - height / 2,
    height: y + height / 2,
    profile: 'rectangle',
    reason: 'Let’s keep the light switch clear.',
  }
}
