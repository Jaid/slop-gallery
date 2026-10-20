import type {Vec3} from '../types.ts'

import {rooms} from '../walls.ts'

const dine = rooms.find(room => room.id === 'dine')!

export type SeatKind = 'head' | 'side'
/** A chair in the table’s frame: `position` is on the floor under the middle of its seat, and `yaw` turns its front (local +z) toward the table. */
export type Seat = {
  kind: SeatKind
  position: Vec3
  yaw: number
}
export type CenterpieceKind = 'candelabrum' | 'tazza'
export type Centerpiece = {
  kind: CenterpieceKind
  /** along the table’s length, from its middle */
  z: number
}
/** A solid volume for the physics world, in the table’s frame. Cuboids give their half extents, cylinders their half height and radius. */
export type FeastCollider = {
  name: string
  position: Vec3
  yaw: number
} & ({
  halfExtents: Vec3
  shape: 'cuboid'
} | {
  halfHeight: number
  radius: number
  shape: 'cylinder'
})

/**
 * A long mahogany refectory table down the middle of Dine, set for a banquet. All values are in meters, in the table’s frame: the origin is on the floor under the middle of the top, +z runs along its length toward the room’s south wall.
 *
 * It leaves 5.9 m to either end wall, so the Salon arch and the visit spot stay open, and about 4.8 m beside the pushed-in chairs to the paneled walls, which keeps every boiserie frame in view and in reach.
 */
export const feastTable = {
  /** world position of the frame’s origin: the middle of Dine’s floor */
  position: [dine.center[0], 0, dine.center[1]] as Vec3,
  length: 12,
  width: 1.25,
  /** top surface above the floor */
  height: 0.76,
  topThickness: 0.065,
  /** boards glued edge to edge across the width */
  boards: 4,
  apron: {
    height: 0.09,
    thickness: 0.03,
    /** the aprons’ outer faces stand this far behind the top’s edges */
    inset: 0.072,
  },
  leg: {
    /** six pairs, one between every pair of neighboring chairs, every 2.3 m */
    z: [-5.75, -3.45, -1.15, 1.15, 3.45, 5.75],
    /** square block under the top that takes the aprons */
    block: 0.1,
    /** widest point of the turned bulb */
    radius: 0.078,
  },
  /** low stretchers tying the legs together: one across every pair, one down the middle */
  stretcher: {
    y: 0.12,
    height: 0.07,
    width: 0.06,
  },
  runner: {
    width: 0.4,
    thickness: 0.004,
    /** how far it hangs down over each end of the top */
    drop: 0.3,
    /** gilt braid along both edges */
    braid: 0.012,
  },
  chair: {
    /** chairs along each side, centered on the table */
    perSide: 10,
    pitch: 1.15,
    /** how far the front of a pushed-in seat tucks under the top’s edge */
    tuck: 0.065,
    /** distance from a head chair’s seat middle to the end of the top */
    headGap: 0.45,
  },
  /** each diner’s charger plate, from the table’s edge to its middle */
  settingInset: 0.195,
} as const

/** derived extents of the top and its frame */
export const feastTableFrame = {
  halfLength: feastTable.length / 2,
  halfWidth: feastTable.width / 2,
  /** underside of the top, where legs and aprons end */
  underside: feastTable.height - feastTable.topThickness,
  /** distance from the table’s axis to the middle of a leg block, which sits flush with the aprons’ outer faces */
  legX: feastTable.width / 2 - feastTable.apron.inset - feastTable.leg.block / 2,
} as const

export type SeatDimensions = {
  /** armrests’ top, for carvers */
  armHeight?: number
  /** top of the back posts’ finials */
  backHeight: number
  /** front to back */
  depth: number
  /** top of the seat cushion */
  seatHeight: number
  /** across the seat */
  width: number
}
export const seatDimensions: Record<SeatKind, SeatDimensions> = {
  side: {
    width: 0.5,
    depth: 0.48,
    seatHeight: 0.47,
    backHeight: 1.2,
  },
  head: {
    width: 0.64,
    depth: 0.54,
    seatHeight: 0.47,
    backHeight: 1.38,
    armHeight: 0.68,
  },
}

const sideChairZ = Array.from({length: feastTable.chair.perSide}, (_, index) => (index - (feastTable.chair.perSide - 1) / 2) * feastTable.chair.pitch)
/** ten high-backed side chairs along either long side, pushed in between the legs, and a carver at each end */
export const feastSeats: ReadonlyArray<Seat> = [
  ...[-1, 1].flatMap(side => sideChairZ.map((z): Seat => ({
    kind: 'side',
    position: [side * (feastTableFrame.halfWidth - feastTable.chair.tuck + seatDimensions.side.depth / 2), 0, z],
    // Local +z faces the table: toward −x on the east side, +x on the west side.
    yaw: side * -Math.PI / 2,
  }))),
  ...[-1, 1].map((side): Seat => ({
    kind: 'head',
    position: [0, 0, side * (feastTableFrame.halfLength + feastTable.chair.headGap)],
    yaw: side > 0 ? Math.PI : 0,
  })),
]

/** Candelabra and fruit tazzas stand on the runner, alternating down its length. */
export const centerpieceY = feastTable.height + feastTable.runner.thickness
export const feastCenterpieces: ReadonlyArray<Centerpiece> = [
  {
    kind: 'candelabrum',
    z: 0,
  },
  ...[-1, 1].flatMap(side => [
    {
      kind: 'tazza',
      z: side * 1.725,
    },
    {
      kind: 'candelabrum',
      z: side * 3.45,
    },
    {
      kind: 'tazza',
      z: side * 5.05,
    },
  ] satisfies Array<Centerpiece>),
]

/** where a seat’s place setting lies on the top: the plate’s middle, in the table’s frame, and the turn of the diner’s frame */
export function placeSetting(seat: Seat) {
  if (seat.kind === 'head') {
    const z = Math.sign(seat.position[2]) * (feastTableFrame.halfLength - feastTable.settingInset)
    // Head settings stand on the runner.
    return {
      position: [0, feastTable.height + feastTable.runner.thickness, z] as Vec3,
      yaw: seat.yaw,
    }
  }
  const x = Math.sign(seat.position[0]) * (feastTableFrame.halfWidth - feastTable.settingInset)
  return {
    position: [x, feastTable.height, seat.position[2]] as Vec3,
    yaw: seat.yaw,
  }
}

/**
 * The chairs, settings and centerpieces are merged in three runs along the table: the middle one and both ends, so the camera’s frustum can leave out the runs it doesn’t see. Every mesh of the table declares Dine as its room, because the bounding spheres of such long, low meshes reach below the floor, out of every room box, and room culling would otherwise never leave them out.
 */
export const feastSegments = [
  [-Infinity, -2.3],
  [-2.3, 2.3],
  [2.3, Infinity],
] as const

export const segmentOf = (z: number) => feastSegments.findIndex(([from, to]) => z >= from && z < to)

/**
 * Sizes of the tableware. A setting’s offsets are in the diner’s frame: x to the diner’s left, z away from the diner, from the plate’s middle.
 */
export const tableware = {
  plate: {
    radius: 0.15,
    height: 0.018,
  },
  goblet: {
    /** to the upper right of the plate, as glasses are set */
    offset: [-0.115, 0.16] as const,
    radius: 0.042,
    height: 0.18,
  },
  fork: {offset: [0.185, 0] as const},
  knife: {offset: [-0.185, 0] as const},
  candelabrum: {
    /** the base and the drip pans’ reach; the arms spread wider, high above the goblets */
    radius: 0.09,
    /** to the top of the candles, without their flames */
    height: 0.56,
  },
  tazza: {
    radius: 0.13,
    height: 0.24,
  },
} as const

/** a point beside a setting’s plate, from an offset in the diner’s frame, in the table’s frame on its top */
export function settingOffset(setting: ReturnType<typeof placeSetting>, [left, away]: readonly [number, number]): Vec3 {
  // The diner faces local +z, so their left is local +x.
  const cos = Math.cos(setting.yaw)
  const sin = Math.sin(setting.yaw)
  return [setting.position[0] + left * cos + away * sin, setting.position[1], setting.position[2] - left * sin + away * cos]
}

/** Solid volumes of the table, its chairs and the tableware for the physics world, in the table’s frame. */
export function feastColliders(): Array<FeastCollider> {
  const {height, topThickness} = feastTable
  const {halfLength, halfWidth, legX, underside} = feastTableFrame
  const colliders: Array<FeastCollider> = [
    {
      name: 'feast-table-top',
      shape: 'cuboid',
      position: [0, height - topThickness / 2, 0],
      yaw: 0,
      halfExtents: [halfWidth, topThickness / 2, halfLength],
    },
    ...feastTable.leg.z.flatMap(z => [-1, 1].map((side): FeastCollider => ({
      name: `feast-table-leg-${side < 0 ? 'west' : 'east'}-${z}`,
      shape: 'cuboid',
      position: [side * legX, underside / 2, z],
      yaw: 0,
      halfExtents: [feastTable.leg.radius, underside / 2, feastTable.leg.radius],
    }))),
  ]
  for (const [index, seat] of feastSeats.entries()) {
    const {width, depth, seatHeight, backHeight} = seatDimensions[seat.kind]
    const forward = [Math.sin(seat.yaw), Math.cos(seat.yaw)] as const
    const back = depth / 2 - 0.025
    colliders.push({
      name: `feast-chair-${index}-seat`,
      shape: 'cuboid',
      position: [seat.position[0], seatHeight / 2, seat.position[2]],
      yaw: seat.yaw,
      halfExtents: [width / 2, seatHeight / 2, depth / 2],
    }, {
      name: `feast-chair-${index}-back`,
      shape: 'cuboid',
      position: [seat.position[0] - forward[0] * back, (seatHeight + backHeight) / 2, seat.position[2] - forward[1] * back],
      yaw: seat.yaw,
      halfExtents: [width / 2, (backHeight - seatHeight) / 2, 0.025],
    })
    const setting = placeSetting(seat)
    colliders.push({
      name: `feast-plate-${index}`,
      shape: 'cylinder',
      position: [setting.position[0], setting.position[1] + tableware.plate.height / 2, setting.position[2]],
      yaw: 0,
      halfHeight: tableware.plate.height / 2,
      radius: tableware.plate.radius,
    })
    const goblet = settingOffset(setting, tableware.goblet.offset)
    colliders.push({
      name: `feast-goblet-${index}`,
      shape: 'cylinder',
      position: [goblet[0], goblet[1] + tableware.goblet.height / 2, goblet[2]],
      yaw: 0,
      halfHeight: tableware.goblet.height / 2,
      radius: tableware.goblet.radius,
    })
  }
  for (const piece of feastCenterpieces) {
    const {radius, height: pieceHeight} = tableware[piece.kind]
    colliders.push({
      name: `feast-${piece.kind}-${piece.z}`,
      shape: 'cylinder',
      position: [0, centerpieceY + pieceHeight / 2, piece.z],
      yaw: 0,
      halfHeight: pieceHeight / 2,
      radius,
    })
  }
  return colliders
}

export default feastTable
