const width = 16
const antechamberDoorWidth = 2.6
const sideDoorWidth = 2.8
// The north extension has a glazed floor opening over the Oculus, as far from the north wall as from the side walls.
const lobby = {
  previousNorthZ: -8,
  northZ: -32,
  southZ: 8,
  width,
  antechamberDoorWidth,
  sideDoorWidth,
  // The side arches and the Antechamber doorway are equally far from the south corners, measured to their nearest edges.
  sideDoorZ: (antechamberDoorWidth - sideDoorWidth) / 2,
  opening: {
    center: [0, -24],
    size: [8, 8],
  },
} as const

export default lobby
