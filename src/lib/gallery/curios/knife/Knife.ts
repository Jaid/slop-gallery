import type {Vec3} from '../../types.ts'
import type {LatticePoint} from '../lattice.ts'

import {BufferGeometry, Float32BufferAttribute, SphereGeometry} from 'three/webgpu'

import ForgedSteelMaterial from '#src/lib/materials/ForgedSteelMaterial.ts'
import GrainedWoodMaterial from '#src/lib/materials/GrainedWoodMaterial.ts'
import {studioEnvironment} from '#src/lib/materials/metal.ts'

import {mergeParts} from '../../../geometry.ts'
import {banquetTable} from '../../banquet.ts'
import {withWoodGrain} from '../../woodGrain.ts'
import Curio, {CurioModel} from '../base/Curio.ts'
import latticeGeometry from '../lattice.ts'
import {pumpkinSpot} from '../pumpkin/Pumpkin.ts'

/** how long the blade is from its heel to its front, in meters */
const bladeLength = 0.2
/** how thick the blade is along its spine, and along its edge */
const spineThickness = 0.0042
const edgeThickness = 0.0004
/** how far up from its edge toward its spine the honed bevel reaches, as a share of the blade’s height */
const bevel = 0.15
/** how many columns the blade is cut into from heel to front, and how many rows from edge to spine */
const bladeColumns = 36
const bladeRows = 18
/** how long the handle is, and half its height and thickness, which it swells to a little in its middle */
const handleLength = 0.118
const handleHalf = [0.0145, 0.0112] as const
/** where along the handle its three rivets go through it, and their heads’ radius */
const rivets = [-0.022, -0.059, -0.096] as const
const rivetRadius = 0.0036
/** how many points round the handle and its cap */
const handleAround = 24
/** the spine of the blade at `x` along it: straight, rising a little toward the front */
const spine = (x: number) => 0.0132 + 0.008 * x / bladeLength
/** the edge of the blade at `x` along it, swelling into a slight belly */
const edge = (x: number) => -0.078 - 0.01 * Math.sin(Math.PI * x / bladeLength)
/** How far a corner rounded off by `radius` cuts in at `height` over the edge. */
const rounded = (radius: number, height: number) => (height < radius ? radius - Math.sqrt(radius ** 2 - (radius - height) ** 2) : 0)
/** how thick the blade is at the share `f` of the way from its edge up to its spine and the share `s` from its heel to its front: thin at the edge, swelling quickly through the bevel and slowly on to the spine, a little thinner toward the front */
const thickness = (f: number, s: number) => (edgeThickness + (spineThickness - edgeThickness) * Math.min(1, f / bevel) ** 1.2 * (0.86 + 0.14 * f)) * (1 - 0.2 * s)
/** The blade: two faces tapering from the spine to the edge, joined round all four sides, its front corner and heel corner at the edge rounded off. Each vertex carries its `steelMask`: no hole, and polish down the bevel. */
function bladeGeometry() {
  const points = Array.from({length: bladeRows}, (_, row) => {
    const f = (row / (bladeRows - 1)) ** 1.5
    return Array.from({length: bladeColumns}, (_, column) => {
      const s = column / (bladeColumns - 1)
      // Height over the edge at the heel and the front, to round off the corners there
      const heel = rounded(0.006, f * (spine(0) - edge(0)))
      const front = bladeLength + 0.004 * f - rounded(0.014, f * (spine(bladeLength) - edge(bladeLength)))
      const x = heel + s * (front - heel)
      return {
        x,
        y: edge(x) + f * (spine(x) - edge(x)),
        half: thickness(f, s) / 2,
        polish: 1 - Math.min(1, Math.max(0, (f - bevel * 0.8) / (bevel * 0.6))),
      }
    })
  })
  const positions: Array<number> = []
  const masks: Array<number> = []
  const indices: Array<number> = []
  const vertex = (x: number, y: number, z: number, polish: number) => {
    positions.push(x, y, z)
    masks.push(0, polish)
    return positions.length / 3 - 1
  }
  // Both faces, each over the whole grid, wound to face out
  for (const side of [1, -1]) {
    const base = positions.length / 3
    for (const row of points) {
      for (const {x, y, half, polish} of row) {
        vertex(x, y, side * half, polish)
      }
    }
    for (let row = 0; row < bladeRows - 1; row++) {
      for (let column = 0; column < bladeColumns - 1; column++) {
        const a = base + row * bladeColumns + column
        const [b, c, d] = [a + 1, a + bladeColumns, a + bladeColumns + 1]
        indices.push(...side > 0 ? [a, b, c, b, d, c] : [a, c, b, b, c, d])
      }
    }
  }
  // Round the rim counterclockwise seen from the front face: along the edge, up the front, back along the spine and down the heel
  const rim = [
    ...points[0],
    ...points.slice(1).map(row => row.at(-1)!),
    ...points.at(-1)!.toReversed().slice(1),
    ...points.toReversed().slice(1).map(row => row[0]),
  ]
  for (let index = 0; index < rim.length - 1; index++) {
    const [from, to] = [rim[index], rim[index + 1]]
    const a = vertex(from.x, from.y, from.half, from.polish)
    const b = vertex(from.x, from.y, -from.half, from.polish)
    const c = vertex(to.x, to.y, to.half, to.polish)
    const d = vertex(to.x, to.y, -to.half, to.polish)
    indices.push(a, b, c, c, b, d)
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('steelMask', new Float32BufferAttribute(masks, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
/** half the handle’s height and thickness at `x` along it, swelling a little toward its middle */
const handleAt = (x: number) => {
  const swell = 1 + 0.07 * Math.sin(Math.PI * Math.min(1, -x / handleLength))
  return [handleHalf[0] * swell, handleHalf[1] * swell] as const
}
/** the height of the handle’s middle line: its top flush with the blade’s spine at the heel */
const handleY = spine(0) - handleHalf[0]
/** A ring round the handle’s line at `x`, as wide and thick as given, with the extra values of every point. */
function ring(x: number, [halfHeight, halfThickness]: readonly [number, number], values?: ReadonlyArray<number>) {
  return Array.from({length: handleAround}, (_, column): LatticePoint => {
    const angle = Math.PI * 2 * column / handleAround
    return {
      position: [x, handleY + halfHeight * Math.cos(angle), halfThickness * Math.sin(angle)],
      ...values ? {values} : {},
    }
  })
}

/**
 * A heavy cleaver with a hand-forged blade, mottled with dark patina but for its honed edge, its square front a little rounded at the edge, on an oval ash handle held by three steel rivets and capped by a steel pommel.
 * It lies on the Banquet’s table, to steer the flavor the Forge’s alchemy machine gives a Transparent Orb to a Horror Orb.
 * In its own frame, the blade lies in the plane of x and y, its heel at the origin and its edge down, and the handle runs back along -x.
 */
export default class Knife extends Curio {
  readonly id = 'knife'
  readonly mass = 0.9
  // Beside the pumpkin, on the side of the room’s entrance from the Lobby’s south door, as if about to carve it
  readonly position: Vec3 = [pumpkinSpot[0] - 0.06, banquetTable.height + 0.016, pumpkinSpot[2] + 0.34]
  readonly reach = 0.26
  readonly room = 'banquet'
  // Lying flat on its side, its spine toward the pumpkin and its edge away
  override readonly rotation: Vec3 = [-Math.PI / 2, 0, 0.35]
  readonly title = 'A cleaver, sharper than it looks'

  createModel() {
    const stations = Array.from({length: 14}, (_, index) => -handleLength * index / 13)
    // Closed at the heel round the blade, and running on into the pommel at its far end
    const handle = withWoodGrain(latticeGeometry(stations.map(x => ring(x, handleAt(x))), {start: {position: [0, handleY, 0]}}), (x, y, z) => [x, y + z * 0.4], 0.37)
    // The pommel: a steel ferrule a little proud of the wood, closing in a dome
    const capStart = -handleLength + 0.003
    const [endHeight, endThickness] = handleAt(-handleLength)
    const dome = Array.from({length: 7}, (_, index) => index / 6 * Math.PI / 2)
    const capRings = [
      [capStart, 0.97],
      [capStart - 0.002, 1.06],
      [capStart - 0.011, 1.08],
      [capStart - 0.014, 1.04],
      ...dome.slice(1, -1).map(angle => [capStart - 0.014 - 0.009 * Math.sin(angle), 1.04 * Math.cos(angle)]),
    ] as const
    const capPolish = [0, 0.7] as const
    const cap = latticeGeometry(capRings.map(([x, scale]) => ring(x, [endHeight * scale, endThickness * scale], capPolish)), {
      start: {
        position: [capStart, handleY, 0],
        values: capPolish,
      },
      end: {
        position: [capStart - 0.023, handleY, 0],
        values: capPolish,
      },
      extra: {
        name: 'steelMask',
        size: 2,
      },
    })
    const heads = rivets.flatMap(x => [-1, 1].map(side => {
      const head = new SphereGeometry(rivetRadius, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)
      head.deleteAttribute('uv')
      head.scale(1, 0.45, 1).rotateX(side * Math.PI / 2)
      head.translate(x, handleY, side * (handleAt(x)[1] - 0.0004))
      const mask = new Float32Array(head.getAttribute('position').count * 2).map((_, index) => (index % 2 ? 0.8 : 0))
      head.setAttribute('steelMask', new Float32BufferAttribute(mask, 2))
      return head
    }))
    const steel = mergeParts([bladeGeometry(), cap, ...heads])
    return new CurioModel([
      {
        name: 'knife-steel',
        geometry: steel,
        material: new ForgedSteelMaterial({environment: studioEnvironment}),
      },
      {
        name: 'knife-handle',
        geometry: handle,
        material: new GrainedWoodMaterial({
          heartwood: ['#7a5534', '#a77d4f'],
          latewood: '#5a3a1f',
        }, {roughness: 0.5}),
      },
    ])
  }
}
