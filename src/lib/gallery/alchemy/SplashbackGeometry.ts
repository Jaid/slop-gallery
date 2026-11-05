import type {BufferGeometry} from 'three/webgpu'

import {CylinderGeometry, ExtrudeGeometry, Shape} from 'three/webgpu'

import {alchemySplashback} from './alchemyMachine.ts'

/** An upright band round the sink’s middle, between the radii, as high as given and as far round as the sweep, centered on the wall behind, with its edges eased by `ease`. */
function band(inner: number, outer: number, height: number, sweep: number, ease: number) {
  // Turned up onto the bench below, the shape’s −y runs toward the wall, +z.
  const [from, to] = [-Math.PI / 2 - sweep / 2, -Math.PI / 2 + sweep / 2]
  const shape = new Shape
  shape.absarc(0, 0, outer, from, to, false)
  shape.absarc(0, 0, inner, to, from, true)
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, {
    depth: height - ease * 2,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: ease,
    bevelThickness: ease,
    bevelOffset: -ease,
    curveSegments: 64,
  })
  return geometry.rotateX(-Math.PI / 2).translate(0, ease, 0)
}

/**
 * The splashback round the back of the alchemy machine’s sink, see {@link alchemySplashback}, in the sink’s frame round the middle of its rim: its brass `shell`, the leather `padding` lining it, and as `collision` the padding’s face, which faces the sink’s middle.
 */
export default class SplashbackGeometry {
  readonly collision: BufferGeometry
  readonly padding: BufferGeometry
  readonly shell: BufferGeometry

  constructor() {
    const {height, padding, radius, shell, sweep} = alchemySplashback
    this.shell = band(radius + padding, radius + padding + shell, height, sweep, 0.003)
    // A little short of the shell’s ends and its top, swelling out of it
    this.padding = band(radius, radius + padding + 0.002, height - 0.03, sweep - shell * 2 / radius, 0.008)
    const face = new CylinderGeometry(radius, radius, height, 64, 4, true, -sweep / 2, sweep)
    face.translate(0, height / 2, 0)
    // Wound to face inward, toward the sink’s middle, where orbs strike it
    const indices = face.getIndex()!
    for (let index = 0; index < indices.count; index += 3) {
      const first = indices.getX(index)
      indices.setX(index, indices.getX(index + 2))
      indices.setX(index + 2, first)
    }
    this.collision = face
  }

  dispose() {
    for (const geometry of [this.collision, this.padding, this.shell]) {
      geometry.dispose()
    }
  }
}
