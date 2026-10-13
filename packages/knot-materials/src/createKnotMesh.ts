import type {BufferGeometry, MeshPhysicalNodeMaterial} from 'three/webgpu'

import {Mesh} from 'three/webgpu'

import KnotMaterial from './lib/KnotMaterial.ts'

/** Preserve one geometry and transform for the shell and its optional solid interior. Material owns both lifetimes. */
export default function createKnotMesh<Geometry extends BufferGeometry>(geometry: Geometry, material: MeshPhysicalNodeMaterial) {
  const mesh = new Mesh(geometry, material)
  if (material instanceof KnotMaterial && material.coreMaterial) {
    const core = new Mesh(geometry, material.coreMaterial)
    core.name = material.coreMaterial.name
    core.raycast = () => {}
    core.frustumCulled = false
    mesh.add(core)
  }
  return mesh
}
