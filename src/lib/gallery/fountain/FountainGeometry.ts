import type {BufferGeometry} from 'three/webgpu'

import {CircleGeometry, CylinderGeometry, LatheGeometry, QuadraticBezierCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3} from 'three/webgpu'

import {mergeParts} from '../../geometry.ts'
import fountain from './config.ts'

const ring = (radius: number, tube: number, y: number) => new TorusGeometry(radius, tube, 8, 96).rotateX(Math.PI / 2).translate(0, y, 0)
const stream = (start: Vector3, control: Vector3, end: Vector3, radius: number) => new TubeGeometry(new QuadraticBezierCurve3(start, control, end), 32, radius, 8, false)

/** Three carved basins and real parabolic water paths, merged by material. */
export default class FountainGeometry {
  readonly brass: BufferGeometry
  readonly pools: BufferGeometry
  readonly stone: BufferGeometry
  readonly streams: BufferGeometry

  constructor() {
    const lathe = (profile: Array<[number, number]>) => new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), 96)
    const stone: Array<BufferGeometry> = [
      lathe([[0, 0.03], [1.88, 0.03], [2.05, 0.13], [2.05, 0.23], [1.94, 0.3], [1.92, 0.55], [2.01, 0.66], [2.01, 0.73], [1.87, 0.77], [1.8, 0.65], [1.76, 0.35], [0, 0.35]]),
      lathe([[0, 0.33], [0.52, 0.33], [0.52, 0.45], [0.38, 0.56], [0.3, 1.18], [0.46, 1.32], [0.49, 1.4], [0.74, 1.44], [0.99, 1.61], [1.13, 1.79], [1.13, 1.89], [1.04, 1.92], [0.95, 1.69], [0.58, 1.56], [0, 1.56]]),
      lathe([[0, 1.56], [0.25, 1.56], [0.27, 1.77], [0.18, 2.26], [0.32, 2.43], [0.4, 2.48], [0.63, 2.68], [0.65, 2.83], [0.57, 2.87], [0.51, 2.66], [0.25, 2.57], [0, 2.57]]),
      lathe([[0, 2.56], [0.16, 2.56], [0.16, 2.83], [0.09, 3.03], [0.08, 3.2], [0, 3.2]]),
    ]
    const brass = [ring(1.96, 0.012, 0.68), ring(0.47, 0.018, 1.37), ring(1.1, 0.012, 1.86), ring(0.62, 0.01, 2.81), new SphereGeometry(0.105, 24, 16).translate(0, 3.15, 0)]
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8
      stone.push(new CylinderGeometry(0.025, 0.035, 0.56, 8).translate(0.325, 0.88, 0).rotateY(angle))
      brass.push(new SphereGeometry(0.035, 8, 6).scale(1, 1.7, 1).translate(1.96, 0.48, 0).rotateY(angle))
    }
    this.stone = mergeParts(stone)
    this.brass = mergeParts(brass)
    this.pools = mergeParts([[1.82, fountain.poolY], [1.04, 1.82], [0.565, 2.8]].map(([radius, y]) => new CircleGeometry(radius, 96).rotateX(-Math.PI / 2).translate(0, y, 0)))
    const streams: Array<BufferGeometry> = []
    // A central jet separates into falling strands before reaching the upper bowl.
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3
      streams.push(stream(new Vector3(0, 3.2, 0), new Vector3(0.08, 5.05, 0), new Vector3(0.27, 2.8, 0), 0.022).rotateY(angle))
    }
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6
      streams.push(stream(new Vector3(0.55, 2.82, 0), new Vector3(0.81, 2.92, 0), new Vector3(0.87, 1.82, 0), 0.021).rotateY(angle))
      streams.push(stream(new Vector3(1.07, 1.88, 0), new Vector3(1.69, 2.1, 0), new Vector3(1.63, fountain.poolY, 0), 0.031).rotateY(angle))
    }
    this.streams = mergeParts(streams)
  }

  dispose() {
    this.stone.dispose()
    this.brass.dispose()
    this.pools.dispose()
    this.streams.dispose()
  }
}
