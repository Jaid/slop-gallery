import type {Vec3} from './types.ts'

/** where a row’s hanging candidate sign is placed, relative to the row center, and which way its faces point */
export type KnotCandidateSignPlacement = {
  /** rotation around the vertical axis */
  rotation: number
  x: number
  z: number
}

/**
 * One left-aligned row per displayed creator, with walking space around every edge.
 *
 * Every row gets a preview billboard at its west end, except when the whole exhibition is a single Knot: that one gets a plain square room centered on it, without a billboard.
 */
export default class KnotLayout {
  /** whether every row gets a preview billboard at its west end */
  readonly billboard: boolean
  readonly bounds: {
    height: number
    maxX: number
    minX: number
    northZ: number
    southZ: number
  }
  readonly candidateSign: KnotCandidateSignPlacement
  readonly center: Vec3
  readonly firstRowZ = 2
  readonly itemSpacing = 3.5
  readonly maxRowLength: number
  /** x of the row billboards, or null if the layout has none */
  readonly previewX: number | null
  readonly rowHalfWidth: number
  readonly rowSpacing = 5.5
  readonly size: Vec3

  constructor(readonly rowLengths: ReadonlyArray<number>) {
    if (rowLengths.some(length => !Number.isSafeInteger(length) || length < 1)) {
      throw new Error('Knot rows must contain a positive number of items.')
    }
    this.maxRowLength = Math.max(0, ...rowLengths)
    this.rowHalfWidth = Math.max(0, ...rowLengths.map(length => (length - 1) * this.itemSpacing / 2))
    this.billboard = rowLengths.reduce((sum, length) => sum + length, 0) !== 1
    const northZ = this.rowZ(Math.max(0, rowLengths.length - 1)) - this.rowSpacing
    const southZ = this.firstRowZ + this.rowSpacing
    if (this.billboard) {
      this.previewX = -this.rowHalfWidth - 6.25
      this.bounds = {
        minX: this.previewX - 2.5,
        maxX: this.rowHalfWidth + 4.5,
        northZ,
        southZ,
        height: 5.8,
      }
      // Hangs above the billboard and faces along the row.
      this.candidateSign = {
        x: this.previewX,
        z: 0,
        rotation: Math.PI / 2,
      }
    } else {
      // The lone Knot stands in the middle of a square room as wide as it is deep.
      this.previewX = null
      this.bounds = {
        minX: -this.rowSpacing,
        maxX: this.rowSpacing,
        northZ,
        southZ,
        height: 5.8,
      }
      // Hangs halfway between the Knot and the north wall, clear of the light above the Knot, and faces the spawn.
      this.candidateSign = {
        x: 0,
        z: -this.rowSpacing / 2,
        rotation: 0,
      }
    }
    const {minX, maxX, height} = this.bounds
    this.size = [maxX - minX, height, southZ - northZ]
    this.center = [(minX + maxX) / 2, 0, (northZ + southZ) / 2]
  }

  rowCenterX(length: number) {
    return -this.rowHalfWidth + (length - 1) * this.itemSpacing / 2
  }

  rowZ(index: number) {
    return this.firstRowZ - index * this.rowSpacing
  }

  slotX(index: number) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.maxRowLength) {
      throw new RangeError(`Invalid Knot slot index: ${index}`)
    }
    return -this.rowHalfWidth + index * this.itemSpacing
  }
}
