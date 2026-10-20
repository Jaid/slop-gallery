import type {TablewareParts} from './TablewareGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

import {Euler, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import FeastChairGeometry from './FeastChairGeometry.ts'
import {centerpieceY, feastCenterpieces, feastSeats, placeSetting, segmentOf} from './layout.ts'
import {candelabrumParts, emptyParts, placeSettingParts, tazzaParts} from './TablewareGeometry.ts'

/** the materials a run of the table is merged by */
export type FeastMaterialSlot = keyof TablewareParts | 'upholstery' | 'wood'

const pose = (x: number, y: number, z: number, yaw: number) => {
  const matrix = new Matrix4
  const turn = new Quaternion
  return matrix.compose(new Vector3(x, y, z), turn.setFromEuler(new Euler(0, yaw, 0)), new Vector3(1, 1, 1))
}
const transformed = (parts: Array<BufferGeometry>, matrix: Matrix4) => parts.map(part => part.applyMatrix4(matrix))
function collect(target: TablewareParts, source: TablewareParts, matrix: Matrix4) {
  for (const key of Object.keys(source) as Array<keyof TablewareParts>) {
    target[key].push(...transformed(source[key], matrix))
  }
}

/**
 * Everything that stands at or on one run of the feast table: its chairs, every diner’s setting and the centerpieces, merged per material in the table’s frame. Each chair is built with its own grain seed, so no two show the same figure.
 */
export default class FeastSegmentGeometry {
  /** one merged geometry per material that the run uses */
  readonly parts: ReadonlyArray<{
    geometry: BufferGeometry
    slot: FeastMaterialSlot
  }>

  constructor(segment: number) {
    const wood: Array<BufferGeometry> = []
    const upholstery: Array<BufferGeometry> = []
    const tableware = emptyParts()
    for (const [index, seat] of feastSeats.entries()) {
      if (segmentOf(seat.position[2]) !== segment) {
        continue
      }
      const chair = new FeastChairGeometry(seat.kind, index + 1)
      const matrix = pose(...seat.position, seat.yaw)
      wood.push(chair.wood.applyMatrix4(matrix))
      upholstery.push(chair.upholstery.applyMatrix4(matrix))
      tableware.gold.push(chair.gold.applyMatrix4(matrix))
      const setting = placeSetting(seat)
      const own = emptyParts()
      placeSettingParts(own)
      collect(tableware, own, pose(...setting.position, setting.yaw))
    }
    for (const [index, piece] of feastCenterpieces.entries()) {
      if (segmentOf(piece.z) !== segment) {
        continue
      }
      const own = emptyParts()
      if (piece.kind === 'candelabrum') {
        candelabrumParts(own)
      } else {
        tazzaParts(own, index)
      }
      // Turn alternate pieces so their arms and fruit don’t all line up.
      collect(tableware, own, pose(0, centerpieceY, piece.z, index % 2 ? Math.PI : 0))
    }
    const slots: Record<FeastMaterialSlot, Array<BufferGeometry>> = {
      wood,
      upholstery,
      ...tableware,
    }
    this.parts = (Object.entries(slots) as Array<[FeastMaterialSlot, Array<BufferGeometry>]>).filter(([, parts]) => parts.length).map(([slot, parts]) => ({
      slot,
      geometry: mergeParts(parts),
    }))
  }

  dispose() {
    for (const {geometry} of this.parts) {
      geometry.dispose()
    }
  }

  /** the merged geometry of one material, if the run uses it */
  geometry(slot: FeastMaterialSlot) {
    return this.parts.find(part => part.slot === slot)?.geometry
  }
}
