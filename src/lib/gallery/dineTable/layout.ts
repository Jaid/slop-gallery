import type {Vec3} from '../types.ts'

import {rooms} from '../walls.ts'

const room = rooms.find(candidate => candidate.id === 'dine')!
/** A freestanding banquet along Dine’s long axis, measured from the middle of its floor. */
const dineTable = {
  position: [room.center[0], room.floorY, room.center[1]] as Vec3,
  width: 2.4,
  length: 14.4,
  height: 0.82,
  topThickness: 0.09,
  cornerRadius: 0.12,
  trestles: [-5.4, 0, 5.4],
  runner: {
    width: 0.54,
    length: 13.4,
  },
  candelabras: [-4.5, 0, 4.5],
  chair: {
    width: 0.62,
    depth: 0.64,
    seatY: 0.46,
    height: 1.19,
  },
} as const

export type BanquetPlace = {
  id: string
  position: Vec3
  /** Turn around y; the chair faces local −z and the setting’s diner sits toward local +z. */
  yaw: number
}

const sidePlaces = Array.from({length: 8}, (_, index) => (index - 3.5) * 1.7)
/** Eight chairs per side and one at each end; even the backs leave over 3.8 m to the walls. */
export const banquetChairs: ReadonlyArray<BanquetPlace> = [
  ...[-1, 1].flatMap(side => sidePlaces.map((z, index) => ({
    id: `${side < 0 ? 'west' : 'east'}-${index}`,
    position: [side * 1.73, 0, z] as Vec3,
    yaw: side * Math.PI / 2,
  }))),
  ...[-1, 1].map(side => ({
    id: side < 0 ? 'north' : 'south',
    position: [0, 0, side * 7.75] as Vec3,
    yaw: side < 0 ? Math.PI : 0,
  })),
]

/** The setting origin is the plate center; local +z faces the diner, and −z faces the table’s center. */
export const banquetSettings: ReadonlyArray<BanquetPlace> = banquetChairs.map(chair => ({
  ...chair,
  position: [
    chair.position[0] - Math.sin(chair.yaw) * (chair.position[0] ? 0.9 : 0.97),
    dineTable.height,
    chair.position[2] - Math.cos(chair.yaw) * (chair.position[0] ? 0.9 : 0.97),
  ],
}))

export default dineTable
