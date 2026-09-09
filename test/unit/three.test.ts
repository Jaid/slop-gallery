import {expect, test} from 'bun:test'

import {Mesh} from 'three'
import {Brush} from 'three-bvh-csg'
import {Mesh as WebgpuMesh} from 'three/webgpu'

test('CSG uses its ESM entry point and shares Three’s core with the WebGPU scene', () => {
  // The CommonJS entry loads Three’s deprecated require() shim as of r186.
  expect(import.meta.resolve('three-bvh-csg')).toBe(import.meta.resolve('three-bvh-csg/src/index.js'))
  expect(Mesh).toBe(WebgpuMesh)
  expect(Brush.prototype).toBeInstanceOf(WebgpuMesh)
})
