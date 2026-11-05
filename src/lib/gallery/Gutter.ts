import type PassageRoute from './passages/PassageRoute.ts'
import type {RouteStation} from './passages/PassageRoute.ts'

/** the mouth a gutter opens into at its start, where orbs drop or roll into it, like a rainwater head: wider round its inside and its rims leaning in to turn a bouncing orb back down, for `length` meters before it eases into its usual channel over as long again */
export type GutterCatch = {
  length: number
  /** how far round from the bottom its rims reach there */
  lip: number
  /** the radius of its round inside there */
  radius: number
}

/** a stretch along a gutter where a wall stands beside it, on its left (−1) or its right (1), which its brackets hold it out from */
export type GutterSpan = {
  from: number
  side: -1 | 1
  to: number
}
/** an upright plane an open end of a gutter is cut along, like the front of a ledge it rests on or starts from: a point of it in plan and the horizontal direction it faces */
export type GutterCut = {
  normal: Point
  point: Point
}
export type GutterOptions = {
  /** where orbs drop or roll into it at its start, its rims lean in */
  catch?: GutterCatch
  /** the height of its underside’s ceiling, which its hangers hang from */
  ceiling?: number
  /** whether an end plate closes its start, where orbs drop into it, or it lies open there, cut along `cuts.start` if given */
  closed: boolean
  /** the planes its open ends are cut along instead of straight across */
  cuts?: {
    end?: GutterCut
    start?: GutterCut
  }
  /** how steeply it falls along its whole length */
  grade: number
  /** how high over the floor the channel’s bottom lies at its start */
  head: number
  /** the stretches along it hung from the ceiling instead */
  hung?: ReadonlyArray<readonly [from: number, to: number]>
  /** how far in front of the center lines of the walls it follows its middle runs */
  offset?: number
  /** the stretches along it beside walls, which its brackets hold it out from */
  spans?: ReadonlyArray<GutterSpan>
}
type Point = readonly [x: number, z: number]

/**
 * A brass gutter carried on iron brackets in the walls beside it or hung from the ceiling, which an orb rolls down: an open channel, round inside, falling at an even grade along its route from its start to its end, the route’s own floor height left aside.
 * Its start is closed by an end plate or lies open, and its end lies open; an open end is cut straight across or along a plane.
 * All values are in meters, in the world’s frame.
 */
export default class Gutter {
  /** how far apart its brackets and hangers stand along it, at most */
  readonly bracketSpacing = 1.1
  readonly catch?: GutterCatch
  readonly ceiling: number
  readonly closed: boolean
  readonly cuts: NonNullable<GutterOptions['cuts']>
  readonly grade: number
  readonly head: number
  readonly hung: ReadonlyArray<readonly [from: number, to: number]>
  /** how far up both sides from its bottom the channel reaches, in radians: shallow enough for the upper half of an orb rolling along it to show over its rims from the floor */
  readonly lip = Math.PI * 70 / 180
  readonly offset: number
  /** the radius of the channel’s round inside, in which an orb rolls with a little room to spare */
  readonly radius = 0.18
  readonly spans: ReadonlyArray<GutterSpan>
  /** how thick its brass is */
  readonly thickness = 0.012

  constructor(readonly route: PassageRoute, {catch: catchment, ceiling = Number.NaN, closed, cuts = {}, grade, head, hung = [], offset = 0, spans = []}: GutterOptions) {
    if (!(grade > 0) || !Number.isFinite(head)) {
      throw new RangeError('A gutter needs to fall and to start at a finite height.')
    }
    if (closed && cuts.start) {
      throw new RangeError('A gutter closed at its start can’t be cut open there.')
    }
    if (hung.length && !Number.isFinite(ceiling)) {
      throw new RangeError('A gutter hung from the ceiling needs to know how high it is.')
    }
    if (catchment) {
      this.catch = catchment
    }
    this.ceiling = ceiling
    this.closed = closed
    this.cuts = cuts
    this.grade = grade
    this.head = head
    this.hung = hung
    this.offset = offset
    this.spans = spans
  }

  /** Where the channel’s middle lies, `along` meters down it, with its heading and its bottom’s height. */
  at(along: number): RouteStation & {bottom: number} {
    return {
      ...this.route.at(along),
      bottom: this.bottom(along),
    }
  }

  /** How high the channel’s bottom lies `along` meters down it. */
  bottom(along: number) {
    return this.head - this.grade * along
  }

  /** How far round from the bottom the channel’s rims reach `along` meters down it: leaning in over its catch, then easing smoothly down to its usual lip. */
  lipAt(along: number) {
    return this.catch ? this.caught(along, this.catch.lip, this.lip) : this.lip
  }

  /** The radius of the channel’s round inside `along` meters down it: wider over its catch, then easing smoothly down to its usual radius. */
  radiusAt(along: number) {
    return this.catch ? this.caught(along, this.catch.radius, this.radius) : this.radius
  }

  /** The value over the catch, easing smoothly into the usual one after it. */
  private caught(along: number, inCatch: number, usual: number) {
    const {length} = this.catch!
    const eased = Math.min(Math.max((along - length) / length, 0), 1)
    return inCatch + (usual - inCatch) * eased * eased * (3 - 2 * eased)
  }
}
