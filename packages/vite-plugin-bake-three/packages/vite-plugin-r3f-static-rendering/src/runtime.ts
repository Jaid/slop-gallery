import type {ResourcePlan, SceneNode, StaticPlan} from './plan.ts'
import type {BufferGeometry, Material} from 'three/webgpu'

import {applyProps, useFrame} from '@react-three/fiber/webgpu'
import useDisposable from 'disposable-lifetime/react'
import {createElement, useMemo} from 'react'
import {BundleGroup, Group, InstancedMesh, Mesh, Object3D} from 'three/webgpu'

import {bundleSignature} from './runtimeBundleGuard.ts'

export type ResourceConstructor = new (...args: Array<unknown>) => BufferGeometry | Material
export type CompiledScene = {
  constructors: Readonly<Record<string, ResourceConstructor>>
  plan: StaticPlan
}

export function StaticScene({compiled}: {compiled: CompiledScene}) {
  // Identity is a resource-lifetime contract, including StrictMode effect replay.
  const resources = useDisposable(useMemo(() => new StaticSceneResources(compiled), [compiled]))
  useFrame(state => {
    if (resources.bundles.length) {
      resources.updateBundles(bundleSignature(state.scene, state.renderer, state.frame))
    }
  }, {
    before: 'render',
    enabled: compiled.plan.bundles > 0,
  })
  return createElement('primitive', {
    object: resources,
    dispose: null,
  })
}

/** All CPU/GPU resources belong to one mount; plans contain no shared Three instances. */
export class StaticSceneResources extends Object3D {
  readonly bundles: Array<BundleGroup> = []
  private readonly resources = new Set<{dispose: () => void}>
  private signature: string | undefined

  constructor(compiled: CompiledScene) {
    super()
    const resource = (plan: ResourcePlan) => {
      const Constructor = compiled.constructors[plan.type]
      const result = new Constructor(...plan.args)
      this.resources.add(result)
      applyProps(result, plan.props)
      return result
    }
    const build = (node: SceneNode, bundled = false): Object3D => {
      let object: Object3D
      if (node.kind === 'group') {
        object = new Group
      } else if (node.kind === 'bundle') {
        const group = new BundleGroup
        this.bundles.push(group)
        object = group
        bundled = true
      } else {
        const geometry = resource(node.geometry!) as BufferGeometry
        const material = resource(node.material!) as Material
        if (node.kind === 'instances') {
          const mesh = new InstancedMesh(geometry, material, node.matrices!.length / 16)
          mesh.instanceMatrix.array.set(node.matrices!)
          mesh.instanceMatrix.needsUpdate = true
          mesh.computeBoundingBox()
          mesh.computeBoundingSphere()
          this.resources.add(mesh)
          object = mesh
        } else {
          object = new Mesh(geometry, material)
        }
      }
      Object.assign(object, node.props)
      object.matrix.fromArray(node.matrix)
      object.matrix.decompose(object.position, object.quaternion, object.scale)
      object.matrixAutoUpdate = false
      // A BundleGroup records a render list. Do not freeze the first camera's
      // frustum selection into it; GPU clipping continues to handle offscreen members.
      if (bundled && object instanceof Mesh) {
        object.frustumCulled = false
      }
      for (const child of node.children) {
        object.add(build(child, bundled))
      }
      return object
    }
    try {
      for (const node of compiled.plan.nodes) {
        this.add(build(node))
      }
      this.updateMatrixWorld(true)
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  dispose() {
    for (const resource of this.resources) {
      resource.dispose()
    }
    this.resources.clear()
    this.clear()
  }

  updateBundles(signature: string) {
    if (this.signature !== signature) {
      this.signature = signature
      for (const bundle of this.bundles) {
        bundle.needsUpdate = true
      }
    }
  }
}
