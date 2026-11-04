import type {Blending, PlaneGeometry} from 'three/webgpu'

import {uniform} from 'three/tsl'
import {DoubleSide, InstancedBufferAttribute, InstancedMesh, MeshBasicNodeMaterial, NormalBlending, Vector3} from 'three/webgpu'

import TransparentSpriteOutputsNode from '#src/lib/rendering/TransparentSpriteOutputsNode.ts'

export type EffectSpritesOptions = {
  /** how they blend over the scene, normally by default */
  blending?: Blending
  /** whether the tone mapping takes their colors in like a lit surface’s; off by default, for things that glow */
  toneMapped?: boolean
}

/** Sets an attribute on the geometry that holds a vector of `rows`’ length for every instance, one row each. */
export function instanceAttribute(geometry: PlaneGeometry, name: string, rows: ReadonlyArray<ReadonlyArray<number>>) {
  const size = rows[0]?.length ?? 1
  const values = new Float32Array(rows.length * size)
  for (const [index, row] of rows.entries()) {
    values.set(row, index * size)
  }
  geometry.setAttribute(name, new InstancedBufferAttribute(values, size))
}

/**
 * Quads an effect draws around a fusion’s portal in one instanced draw, soft and depth-less like the portal’s own sprites: their color blends, while the geometry buffers keep the scene behind them (`TransparentSpriteOutputsNode`). The vertex shader lays every one out and animates it by the clock, the seconds since the result flipped out, so the source quad’s bounds say nothing and they are never culled.
 * Positions are relative to the portal’s middle, which the mesh stands at.
 */
export default class EffectSprites extends InstancedMesh<PlaneGeometry, MeshBasicNodeMaterial> {
  readonly uniforms = {
    /** seconds since the result flipped out; before that, none shows */
    clock: uniform(-1),
    /** the floor’s height below the portal’s middle, as a negative offset in meters */
    floor: uniform(-1.8),
    /** out of the wall, toward the room */
    normal: uniform(new Vector3(0, 0, 1)),
    /** along the wall, to the right of someone facing it */
    tangent: uniform(new Vector3(1, 0, 0)),
  }

  constructor(name: string, geometry: PlaneGeometry, count: number, {blending = NormalBlending, toneMapped = false}: EffectSpritesOptions = {}) {
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped,
      side: DoubleSide,
    })
    material.blending = blending
    material.name = name
    material.mrtNode = new TransparentSpriteOutputsNode
    super(geometry, material, count)
    this.name = name
    this.frustumCulled = false
  }

  override dispose() {
    this.geometry.dispose()
    this.material.dispose()
    super.dispose()
  }
}
