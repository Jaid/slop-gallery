import type {WallReservation} from '../placement/wallGeometry.ts'

/**
 * Old push-button switches: a gilt plate with a column of buttons, pressing one of which pushes it in and pops the pressed one out.
 * All values are in meters, measured from the middle of the plate’s back on the wall.
 */
const lightSwitch = {
  /** width, height and depth of the plate */
  plate: [0.09, 0.16, 0.007],
  /** how far the plate’s edges are rounded */
  plateRadius: 0.0026,
  /** the distance between the middles of neighboring buttons, which are centered on the plate */
  buttonSpacing: 0.04,
  buttonRadius: 0.0105,
  /** how far a button stands proud of the plate, pushed in (just past its collar) and popped out */
  buttonTravel: [0.0035, 0.011],
  /** the gilt ring around each button */
  collar: {
    radius: 0.0155,
    depth: 0.003,
  },
  /** the two gilt screw heads holding the plate, each this far above or below its middle */
  screw: {
    offset: 0.066,
    radius: 0.0038,
    depth: 0.0014,
  },
  /** the room left between neighboring plates */
  gap: 0.03,
} as const

export default lightSwitch

/** How far the middle of the button at the index sits above the middle of a plate with `count` buttons, the first one on top. */
export function switchButtonY(index: number, count: number) {
  return ((count - 1) / 2 - index) * lightSwitch.buttonSpacing
}

/** The space a switch plate centered `u` along its wall and `y` over its floor keeps free of artworks. */
export function lightSwitchReservation(u: number, y: number): WallReservation {
  const width = lightSwitch.plate[0]
  const height = lightSwitch.plate[1]
  return {
    u,
    width,
    bottom: y - height / 2,
    height: y + height / 2,
    profile: 'rectangle',
    reason: 'Let’s keep the light switches clear.',
  }
}
