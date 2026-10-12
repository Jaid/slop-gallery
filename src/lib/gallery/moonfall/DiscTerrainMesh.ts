import {mulberry32} from 'math/random'

export type DiscTerrainOptions = {
  height: (x: number, z: number) => number
  /** hard vertex budget, including the rim and center */
  maxVertices: number
  radius: number
  /** vertices on the outer circle, shared with the surrounding floor’s hole */
  rimSegments: number
  /** distance between candidate samples of the height field */
  spacing: number
  /** maximum vertical deviation between the mesh and the height field at any sample */
  tolerance: number
}

const next = (edge: number) => (edge % 3 === 2 ? edge - 2 : edge + 1)
const previous = (edge: number) => (edge % 3 === 0 ? edge + 2 : edge - 1)
/** binary max-heap of triangle errors with lazy invalidation through stamps */
class ErrorHeap {
  readonly errors: Array<number> = []
  private stamps: Array<number> = []
  private triangles: Array<number> = []

  pop(): [number, number, number] {
    const result: [number, number, number] = [this.errors[0], this.triangles[0], this.stamps[0]]
    const last = this.errors.length - 1
    this.swap(0, last)
    this.errors.pop()
    this.triangles.pop()
    this.stamps.pop()
    let i = 0
    while (true) {
      const left = i * 2 + 1
      const right = left + 1
      let largest = i
      if (left < last && this.errors[left] > this.errors[largest]) {
        largest = left
      }
      if (right < last && this.errors[right] > this.errors[largest]) {
        largest = right
      }
      if (largest === i) {
        break
      }
      this.swap(i, largest)
      i = largest
    }
    return result
  }

  push(error: number, triangle: number, stamp: number) {
    let i = this.errors.length
    this.errors.push(error)
    this.triangles.push(triangle)
    this.stamps.push(stamp)
    while (i > 0) {
      const parent = i - 1 >> 1
      if (this.errors[parent] >= this.errors[i]) {
        break
      }
      this.swap(i, parent)
      i = parent
    }
  }

  private swap(a: number, b: number) {
    [this.errors[a], this.errors[b]] = [this.errors[b], this.errors[a]];
    [this.triangles[a], this.triangles[b]] = [this.triangles[b], this.triangles[a]];
    [this.stamps[a], this.stamps[b]] = [this.stamps[b], this.stamps[a]]
  }
}

/**
 * Low-poly approximation of a height field over a disc by greedy insertion: the sample with the
 * largest vertical error becomes a vertex until every sample lies within the tolerance. Detail
 * therefore follows relief instead of a polar grid, and edges stay Delaunay through local flips.
 */
export default class DiscTerrainMesh {
  /** triangle indices, wound to face +y */
  readonly indices: Array<number> = []
  /** largest remaining vertical error over all samples */
  readonly maxError: number
  /** x, height, z per vertex; vertex heights are exact height field samples */
  readonly positions: Array<number> = []

  private best: Array<number> = []
  private bestError: Array<number> = []
  private candidateUsed: Uint8Array
  private candidateX: Float64Array
  private candidateY: Float64Array
  private candidateZ: Float64Array
  private columns: number
  private dirty = new Set<number>
  private edgeStack: Array<number> = []
  private halfedges: Array<number> = []
  private heap = new ErrorHeap
  private origin: number
  private rows: number
  private spacing: number
  private stamps: Array<number> = []
  private triangles: Array<number> = []
  private xs: Array<number> = []
  private ys: Array<number> = []
  private zs: Array<number> = []

  constructor(options: DiscTerrainOptions) {
    const {radius, rimSegments, spacing, height} = options
    this.spacing = spacing
    this.addVertex(0, 0, height(0, 0))
    for (let i = 0; i < rimSegments; i++) {
      const angle = i / rimSegments * Math.PI * 2
      const x = radius * Math.cos(angle)
      const z = radius * Math.sin(angle)
      this.addVertex(x, z, height(x, z))
    }
    // Samples stay clear of the rim chords so every insertion lands strictly inside the polygon.
    const inner = radius * Math.cos(Math.PI / rimSegments) - spacing * 0.75
    this.columns = Math.ceil(radius * 2 / spacing) + 1
    this.rows = this.columns
    this.origin = -radius
    const count = this.columns * this.rows
    this.candidateX = new Float64Array(count)
    this.candidateZ = new Float64Array(count)
    this.candidateY = new Float64Array(count)
    this.candidateUsed = new Uint8Array(count)
    // A seeded jitter keeps samples off shared edges and avoids a visibly regular lattice.
    const randomState = mulberry32.create(0x6C_6F_77)
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        const i = row * this.columns + column
        const x = this.origin + (column + (mulberry32.sample(randomState) - 0.5) * 0.6) * spacing
        const z = this.origin + (row + (mulberry32.sample(randomState) - 0.5) * 0.6) * spacing
        this.candidateX[i] = x
        this.candidateZ[i] = z
        if (Math.hypot(x, z) < inner && Math.hypot(x, z) > spacing * 0.5) {
          this.candidateY[i] = height(x, z)
        } else {
          this.candidateUsed[i] = 1
        }
      }
    }
    for (let i = 0; i < rimSegments; i++) {
      this.addTriangle(0, 1 + i, 1 + (i + 1) % rimSegments)
    }
    for (let i = 0; i < rimSegments; i++) {
      const spoke = 3 * i + 2
      const following = 3 * ((i + 1) % rimSegments)
      this.link(spoke, following)
    }
    for (let t = 0; t < rimSegments; t++) {
      this.scan(t)
    }
    let maxError = 0
    while (this.heap.errors.length) {
      const [error, triangle, stamp] = this.heap.pop()
      if (stamp !== this.stamps[triangle]) {
        continue
      }
      if (error <= options.tolerance || this.xs.length >= options.maxVertices) {
        maxError = error
        break
      }
      this.insert(triangle)
    }
    this.maxError = maxError
    for (let i = 0; i < this.xs.length; i++) {
      this.positions.push(this.xs[i], this.ys[i], this.zs[i])
    }
    for (let i = 0; i < this.triangles.length; i += 3) {
      const [a, b, c] = [this.triangles[i], this.triangles[i + 1], this.triangles[i + 2]]
      // Triangles are counterclockwise in (x, z), which faces −y; flip them to face upward.
      this.indices.push(a, c, b)
    }
  }

  /** height of the triangulated surface, or undefined outside the disc */
  heightAt(x: number, z: number) {
    for (let t = 0; t < this.triangles.length; t += 3) {
      const weights = this.barycentric(t, x, z)
      if (weights?.every(weight => weight >= -1e-9)) {
        return weights[0] * this.ys[this.triangles[t]] + weights[1] * this.ys[this.triangles[t + 1]] + weights[2] * this.ys[this.triangles[t + 2]]
      }
    }
  }

  private addTriangle(a: number, b: number, c: number) {
    const t = this.triangles.length
    this.triangles.push(a, b, c)
    this.halfedges.push(-1, -1, -1)
    this.stamps.push(0)
    this.best.push(-1)
    this.bestError.push(0)
    return t / 3
  }

  private addVertex(x: number, z: number, y: number) {
    this.xs.push(x)
    this.zs.push(z)
    this.ys.push(y)
    return this.xs.length - 1
  }

  private barycentric(t: number, x: number, z: number) {
    const a = this.triangles[t]
    const b = this.triangles[t + 1]
    const c = this.triangles[t + 2]
    const area = this.orient(a, b, c)
    if (area === 0) {
      return
    }
    const ax = this.xs[a]
    const az = this.zs[a]
    const bx = this.xs[b]
    const bz = this.zs[b]
    const cx = this.xs[c]
    const cz = this.zs[c]
    const wa = ((bx - x) * (cz - z) - (bz - z) * (cx - x)) / area
    const wb = ((cx - x) * (az - z) - (cz - z) * (ax - x)) / area
    return [wa, wb, 1 - wa - wb] as const
  }

  /** positive when d lies inside the circumcircle of the counterclockwise triangle a, b, c */
  private inCircle(a: number, b: number, c: number, d: number) {
    const adx = this.xs[a] - this.xs[d]
    const adz = this.zs[a] - this.zs[d]
    const bdx = this.xs[b] - this.xs[d]
    const bdz = this.zs[b] - this.zs[d]
    const cdx = this.xs[c] - this.xs[d]
    const cdz = this.zs[c] - this.zs[d]
    const ad = adx * adx + adz * adz
    const bd = bdx * bdx + bdz * bdz
    const cd = cdx * cdx + cdz * cdz
    return adx * (bdz * cd - bd * cdz) - adz * (bdx * cd - bd * cdx) + ad * (bdx * cdz - bdz * cdx)
  }

  private insert(t: number) {
    const candidate = this.best[t]
    this.candidateUsed[candidate] = 1
    const p = this.addVertex(this.candidateX[candidate], this.candidateZ[candidate], this.candidateY[candidate])
    const e = t * 3
    const a = this.triangles[e]
    const b = this.triangles[e + 1]
    const c = this.triangles[e + 2]
    const outerA = this.halfedges[e]
    const outerB = this.halfedges[e + 1]
    const outerC = this.halfedges[e + 2]
    this.triangles[e + 2] = p
    const t1 = this.addTriangle(b, c, p)
    const t2 = this.addTriangle(c, a, p)
    const e1 = t1 * 3
    const e2 = t2 * 3
    this.link(e, outerA)
    this.link(e1, outerB)
    this.link(e2, outerC)
    this.link(e + 1, e1 + 2)
    this.link(e1 + 1, e2 + 2)
    this.link(e2 + 1, e + 2)
    this.dirty.clear()
    this.dirty.add(t).add(t1).add(t2)
    this.legalize(e)
    this.legalize(e1)
    this.legalize(e2)
    for (const triangle of this.dirty) {
      this.scan(triangle)
    }
  }

  /** Flips edges opposite a new vertex until the neighborhood is Delaunay again. */
  private legalize(start: number) {
    const stack = this.edgeStack
    stack.length = 0
    stack.push(start)
    while (stack.length) {
      const a = stack.pop()!
      const b = this.halfedges[a]
      if (b === -1) {
        continue
      }
      const a0 = a - a % 3
      const b0 = b - b % 3
      const ar = previous(a)
      const al = next(a)
      const bl = previous(b)
      const br = next(b)
      const p0 = this.triangles[ar]
      const pr = this.triangles[a]
      const pl = this.triangles[al]
      const p1 = this.triangles[bl]
      const scale = (this.xs[pr] - this.xs[pl]) ** 2 + (this.zs[pr] - this.zs[pl]) ** 2
      // The tolerance keeps cocircular rim vertices from flipping back and forth forever.
      if (this.inCircle(p0, pr, pl, p1) <= 1e-12 * scale * scale) {
        continue
      }
      this.triangles[a] = p1
      this.triangles[b] = p0
      const hbl = this.halfedges[bl]
      const har = this.halfedges[ar]
      this.link(a, hbl)
      this.link(b, har)
      this.link(ar, bl)
      this.dirty.add(a0 / 3).add(b0 / 3)
      stack.push(a, br)
    }
  }

  private link(a: number, b: number) {
    this.halfedges[a] = b
    if (b !== -1) {
      this.halfedges[b] = a
    }
  }

  private orient(a: number, b: number, c: number) {
    return (this.xs[b] - this.xs[a]) * (this.zs[c] - this.zs[a]) - (this.zs[b] - this.zs[a]) * (this.xs[c] - this.xs[a])
  }

  /** Finds the sample in triangle t that the current surface approximates worst. */
  private scan(t: number) {
    const e = t * 3
    const a = this.triangles[e]
    const b = this.triangles[e + 1]
    const c = this.triangles[e + 2]
    const ax = this.xs[a]
    const az = this.zs[a]
    const bx = this.xs[b]
    const bz = this.zs[b]
    const cx = this.xs[c]
    const cz = this.zs[c]
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax)
    // Strictly interior samples only, so an insertion never creates a degenerate triangle.
    const margin = Math.abs(area) * 1e-9
    const jitter = this.spacing * 0.3
    const firstColumn = Math.max(0, Math.floor((Math.min(ax, bx, cx) - jitter - this.origin) / this.spacing))
    const lastColumn = Math.min(this.columns - 1, Math.ceil((Math.max(ax, bx, cx) + jitter - this.origin) / this.spacing))
    const firstRow = Math.max(0, Math.floor((Math.min(az, bz, cz) - jitter - this.origin) / this.spacing))
    const lastRow = Math.min(this.rows - 1, Math.ceil((Math.max(az, bz, cz) + jitter - this.origin) / this.spacing))
    let best = -1
    let bestError = 0
    if (area > 0) {
      const ay = this.ys[a]
      const by = this.ys[b]
      const cy = this.ys[c]
      for (let row = firstRow; row <= lastRow; row++) {
        for (let column = firstColumn; column <= lastColumn; column++) {
          const i = row * this.columns + column
          if (this.candidateUsed[i]) {
            continue
          }
          const x = this.candidateX[i]
          const z = this.candidateZ[i]
          const wa = (bx - x) * (cz - z) - (bz - z) * (cx - x)
          const wb = (cx - x) * (az - z) - (cz - z) * (ax - x)
          const wc = area - wa - wb
          if (wa <= margin || wb <= margin || wc <= margin) {
            continue
          }
          const error = Math.abs((wa * ay + wb * by + wc * cy) / area - this.candidateY[i])
          if (!(error > bestError)) {
            continue
          }
          bestError = error
          best = i
        }
      }
    }
    this.stamps[t]++
    this.best[t] = best
    this.bestError[t] = bestError
    if (best !== -1) {
      this.heap.push(bestError, t, this.stamps[t])
    }
  }
}
