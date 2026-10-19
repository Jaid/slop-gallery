import {oculusLowerRamps, oculusRampLandings} from '../lowerGallery.ts'
import RailingPath from './RailingPath.ts'

/** Guards a lower flight’s open edge and the outside of its turning landing, leaving the center divider open at the turn. */
export default class OculusSwitchbackRailing extends RailingPath {
  constructor(side: 'east' | 'west') {
    const flight = oculusLowerRamps.find(ramp => ramp.side === side)!
    const landing = oculusRampLandings.find(value => value.side === side)!
    const sign = side === 'west' ? -1 : 1
    const inset = 0.12
    const x = flight.x - sign * (flight.width / 2 - inset)
    const topY = flight.floorY + flight.rise
    const southZ = landing.position[2] + landing.size[2] / 2 - inset
    const wallX = landing.position[0] + sign * (landing.size[0] / 2 - 0.3)
    const radius = 0.2
    const points: Array<[number, number, number]> = [
      [x, flight.floorY, flight.startZ],
      [x, topY, flight.startZ + flight.run],
      [x, topY, southZ - radius],
    ]
    // Round the exposed corner so the tube and its collision never fold at a right angle.
    for (let i = 1; i <= 8; i++) {
      const angle = i / 8 * Math.PI / 2
      points.push([x + sign * radius * (1 - Math.cos(angle)), topY, southZ - radius + radius * Math.sin(angle)])
    }
    points.push([wallX, topY, southZ])
    super(points.map(ground => ({
      ground,
      height: flight.railHeight,
    })))
  }
}
