import type CellLayout from './CellLayout.ts'

/** how far the drawing keeps inside the walls’ center lines */
const inset = 0.3
/** a pedestal’s foot, which the drawing shows as a square */
const pedestalSize = 1.16
const round = (value: number) => Math.round(value * 1e4) / 1e4 + 0
const points = (corners: ReadonlyArray<readonly [number, number]>) => corners.map(([x, z]) => `${round(x)},${round(z)}`).join(' ')

/**
 * The Cell’s floor plan for the map, as SVG markup in meters relative to the room’s origin: the room, and beyond its north wall, if it opens there, the passage on to the vestibule, the vestibule, its alcoves and the passages under the arches between them, with the pedestals on them.
 * The viewBox frames the walls’ center lines.
 */
export default function cellMap(layout: CellLayout) {
  const [width, depth] = layout.size
  const half = width / 2 - inset
  const archHalf = layout.arch.width / 2 - inset
  const shapes: Array<string> = []
  if (layout.vestibule) {
    const [vestibuleX] = layout.vestibule.center
    // Through the north wall and the passage beyond, a little into the vestibule’s inset.
    const notch = layout.northZ - layout.passage - inset - 0.025
    shapes.push(`<path d="M ${-half} ${-half} H ${round(vestibuleX - archHalf)} V ${round(notch)} H ${round(vestibuleX + archHalf)} V ${-half} H ${half} V ${half} H ${-half} Z"/>`)
  } else {
    shapes.push(`<rect x="${-half}" y="${-half}" width="${round(half * 2)}" height="${round(half * 2)}"/>`)
  }
  for (const space of layout.spaces) {
    const [x, z] = space.center
    shapes.push(`<circle cx="${round(x)}" cy="${round(z)}" r="${round(space.radius - inset)}"/>`)
    // Every arch but the one into the room, whose notch the room’s outline draws, bridges the inset round both walls it opens through.
    for (const arch of space.arches) {
      if (arch.name === 'cell' || space.name !== 'vestibule') {
        continue
      }
      const along = [Math.cos(arch.angle), Math.sin(arch.angle)] as const
      const across = [-along[1], along[0]] as const
      const corner = (distance: number, side: number) => [x + along[0] * distance + across[0] * side * archHalf, z + along[1] * distance + across[1] * side * archHalf] as const
      const near = space.radius - inset - 0.025
      const far = space.radius + inset + 0.025
      shapes.push(`<polygon points="${points([corner(near, -1), corner(far, -1), corner(far, 1), corner(near, 1)])}"/>`)
    }
  }
  const pedestals = layout.pedestals.map(({position: [x, z], rotation}) => `<rect x="${round(x - pedestalSize / 2)}" y="${round(z - pedestalSize / 2)}" width="${pedestalSize}" height="${pedestalSize}"${rotation ? ` transform="rotate(${round(-rotation * 180 / Math.PI)} ${round(x)} ${round(z)})"` : ''}/>`)
  const xs = [-width / 2, width / 2, ...layout.spaces.flatMap(({center: [x], radius}) => [x - radius, x + radius])]
  const zs = [-depth / 2, depth / 2, ...layout.spaces.flatMap(({center: [, z], radius}) => [z - radius, z + radius])]
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(minX)} ${round(minZ)} ${round(maxX - minX)} ${round(maxZ - minZ)}" fill="#fff">`,
    ...shapes.map(shape => `  ${shape}`),
    ...pedestals.length ? ['  <g fill="#d4d4d4">', ...pedestals.map(pedestal => `    ${pedestal}`), '  </g>'] : [],
    '</svg>',
  ].join('\n')
}
