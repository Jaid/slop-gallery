import type {Vec3} from '../gallery/types.ts'

/** One left-aligned row per displayed creator, with walking space around every edge. */
export default class KnotLayout {
  readonly bounds: {height: number
    maxX: number
    minX: number
    northZ: number
    southZ: number}
  readonly center: Vec3
  readonly firstRowZ = 2
  readonly itemSpacing = 3.5
  readonly previewX: number
  readonly rowHalfWidth: number
  readonly rowSpacing = 5.5
  readonly size: Vec3

  constructor(readonly rowLengths: ReadonlyArray<number>) {
    if (rowLengths.some(length => !Number.isSafeInteger(length) || length < 1)) {
      throw new Error('Knot rows must contain a positive number of items.')
    }
    this.rowHalfWidth = Math.max(0, ...rowLengths.map(length => (length - 1) * this.itemSpacing / 2))
    this.previewX = -this.rowHalfWidth - 6.25
    this.bounds = {
      minX: this.previewX - 2.5,
      maxX: this.rowHalfWidth + 4.5,
      northZ: this.rowZ(Math.max(0, rowLengths.length - 1)) - this.rowSpacing,
      southZ: this.firstRowZ + this.rowSpacing,
      height: 5.8,
    }
    const {minX, maxX, northZ, southZ, height} = this.bounds
    this.size = [maxX - minX, height, southZ - northZ]
    this.center = [(minX + maxX) / 2, 0, (northZ + southZ) / 2]
  }

  rowCenterX(length: number) {
    return -this.rowHalfWidth + (length - 1) * this.itemSpacing / 2
  }

  rowZ(index: number) {
    return this.firstRowZ - index * this.rowSpacing
  }
}
