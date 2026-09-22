import type {Node} from 'three/webgpu'

import {mx_noise_float, mx_worley_noise_vec3, vec2, vec3} from 'three/tsl'

import {cellNoiseVec3} from '../../../lib/cellNoiseVec3.ts'
import {wrapCell} from '../../../lib/wrapCell.ts'

/** Leaded glass: hand-cut worley quarries with soldered came borders, each pane its own glass recipe. */
export function panes(tile: Node<'vec2'>, cols: Node<'float'> | number, rows: Node<'float'> | number) {
  const size = vec2(cols, rows)
  const q = tile.mul(size)
  const cell = q.floor()
  const id = wrapCell(cell, size)
  const local = q.fract().sub(0.5)
  const random = cellNoiseVec3(vec3(id.x, id.y, 0))
  const bend = mx_noise_float(vec3(tile.x.mul(3), tile.y.mul(3), 0)).mul(0.12)
  const seam = mx_worley_noise_vec3(tile.add(vec2(bend, bend.mul(-0.6))).add(0.5), 1, 0)
  const gap = seam.y.sub(seam.x)
  const footprint = gap.fwidth().max(0.0004)
  const cameWidth = footprint.mul(1.4).add(0.06)
  const cameCore = gap.smoothstep(0.02, 0.06).oneMinus()
  const came = gap.smoothstep(cameWidth.mul(0.35), cameWidth).oneMinus()
  return {
    came: came.clamp(0, 1),
    cameCore: cameCore.clamp(0, 1),
    glass: came.oneMinus().clamp(0, 1),
    glassCore: cameCore.oneMinus().clamp(0, 1),
    local,
    random,
  }
}
