// The north extension has a glazed floor opening over the Oculus, as far from the north wall as from the side walls.
const lobby = {
  previousNorthZ: -8,
  northZ: -32,
  southZ: 8,
  width: 16,
  opening: {
    center: [0, -24],
    size: [8, 8],
  },
} as const

export default lobby
