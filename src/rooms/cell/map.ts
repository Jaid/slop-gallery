import type CellLayout from './CellLayout.ts'

import {columnPedestalRadius} from '#src/lib/gallery/ColumnPedestalGeometry.ts'

/** how far the drawing keeps inside the walls’ center lines */
const inset = 0.3
const round = (value: number) => Math.round(value * 1e4) / 1e4 + 0

/**
 * The Cell’s floor plan for the map, as SVG markup in meters relative to the room’s origin: the room, and beyond its north wall, if it opens there, the passage on to the round room and the round room itself, with the columns in it.
 * The viewBox frames the walls’ center lines.
 */
export default function cellMap(layout: CellLayout) {
  const [width, depth] = layout.size
  const half = width / 2 - inset
  const archHalf = layout.arch.width / 2 - inset
  const shapes: Array<string> = []
  const {vestibule} = layout
  if (vestibule) {
    const [x, z] = vestibule.center
    // Through the north wall and the passage beyond, a little into the round room’s inset.
    const notch = layout.northZ - layout.passage - inset - 0.025
    shapes.push(`<path d="M ${-half} ${-half} H ${round(x - archHalf)} V ${round(notch)} H ${round(x + archHalf)} V ${-half} H ${half} V ${half} H ${-half} Z"/>`, `<circle cx="${round(x)}" cy="${round(z)}" r="${round(vestibule.radius - inset)}"/>`)
  } else {
    shapes.push(`<rect x="${-half}" y="${-half}" width="${round(half * 2)}" height="${round(half * 2)}"/>`)
  }
  // Every column by its plinth.
  const pedestals = layout.pedestals.map(({position: [x, z]}) => `<circle cx="${round(x)}" cy="${round(z)}" r="${columnPedestalRadius.foot}"/>`)
  const xs = [-width / 2, width / 2, ...vestibule ? [vestibule.center[0] - vestibule.radius, vestibule.center[0] + vestibule.radius] : []]
  const zs = [-depth / 2, depth / 2, ...vestibule ? [vestibule.center[1] - vestibule.radius] : []]
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(minX)} ${round(minZ)} ${round(maxX - minX)} ${round(maxZ - minZ)}" fill="#fff">`,
    ...shapes.map(shape => `  ${shape}`),
    ...pedestals.length ? ['  <g fill="#d4d4d4">', ...pedestals.map(pedestal => `    ${pedestal}`), '  </g>'] : [],
    '</svg>',
  ].join('\n')
}
