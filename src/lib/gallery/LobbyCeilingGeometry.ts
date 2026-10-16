import type {BufferGeometry} from 'three/webgpu'

import {BoxGeometry, PlaneGeometry} from 'three/webgpu'

import {mergeParts} from '../geometry.ts'
import lobbyCeiling, {glazingBarOffsets, lobbyBeams, lobbyCoffers} from './lobbyCeiling.ts'

const box = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
  const geometry = new BoxGeometry(width, height, depth)
  return geometry.translate(x, y, z)
}

/**
 * Merged meshes of the Lobby’s coffered laylight ceiling, relative to the room center at floor level: plaster beams and
 * stepped frames, bronze glazing bars and the downward-facing glass. The slab itself stays with the room.
 */
export default class LobbyCeilingGeometry {
  readonly bars: BufferGeometry
  readonly glass: BufferGeometry
  readonly plaster: BufferGeometry

  constructor() {
    const {bar, beam, glassOffset, step, underside} = lobbyCeiling
    const plaster: Array<BufferGeometry> = []
    const bars: Array<BufferGeometry> = []
    const glass: Array<BufferGeometry> = []
    for (const {axis, at, from, to} of lobbyBeams()) {
      const length = to - from
      const middle = (from + to) / 2
      const bodyY = underside - beam.depth / 2
      const lipY = underside - beam.depth - beam.lipDepth / 2
      if (axis === 'x') {
        plaster.push(box(length, beam.depth, beam.width, middle, bodyY, at), box(length, beam.lipDepth, beam.lipWidth, middle, lipY, at))
      } else {
        plaster.push(box(beam.width, beam.depth, length, at, bodyY, middle), box(beam.lipWidth, beam.lipDepth, length, at, lipY, middle))
      }
    }
    const glassY = underside - glassOffset
    for (const coffer of lobbyCoffers()) {
      const [x, z] = coffer.center
      const clearWidth = coffer.size[0] - beam.width
      const clearDepth = coffer.size[1] - beam.width
      const stepY = underside - step.depth / 2
      // The step frames the field on all four sides; its long sides run the full clear width, its short ones fit between.
      for (const side of [-1, 1]) {
        plaster.push(box(clearWidth, step.depth, step.width, x, stepY, z + side * (clearDepth - step.width) / 2))
        plaster.push(box(step.width, step.depth, clearDepth - step.width * 2, x + side * (clearWidth - step.width) / 2, stepY, z))
      }
      if (!coffer.laylight) {
        continue
      }
      const [fieldWidth, fieldDepth] = coffer.field.size
      const pane = new PlaneGeometry(fieldWidth, fieldDepth)
      // Facing down, toward the room; its UVs span the field, which the glass uses for its falloff toward the frame.
      glass.push(pane.rotateX(Math.PI / 2).translate(x, glassY, z))
      const barY = glassY - bar.depth / 2
      for (const offset of glazingBarOffsets(fieldWidth)) {
        bars.push(box(bar.width, bar.depth, fieldDepth - bar.rim * 2, x + offset, barY, z))
      }
      for (const offset of glazingBarOffsets(fieldDepth)) {
        bars.push(box(fieldWidth - bar.rim * 2, bar.depth, bar.width, x, barY, z + offset))
      }
      // A slightly heavier rim closes the glass against the plaster step.
      for (const side of [-1, 1]) {
        bars.push(box(fieldWidth, bar.depth, bar.rim, x, barY, z + side * (fieldDepth - bar.rim) / 2))
        bars.push(box(bar.rim, bar.depth, fieldDepth - bar.rim * 2, x + side * (fieldWidth - bar.rim) / 2, barY, z))
      }
    }
    this.plaster = mergeParts(plaster)
    this.bars = mergeParts(bars)
    this.glass = mergeParts(glass)
  }

  dispose() {
    this.plaster.dispose()
    this.bars.dispose()
    this.glass.dispose()
  }
}
