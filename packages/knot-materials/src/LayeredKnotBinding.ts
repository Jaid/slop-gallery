import type {MaterialBinding, MaterialCompilation} from 'three-async-materials'
import type AsyncMaterials from 'three-async-materials'
import type {MeshPhysicalNodeMaterial} from 'three/webgpu'

import {Mesh, MeshBasicNodeMaterial} from 'three/webgpu'

/** Warm both felt layers in their real contexts and expose them atomically, never leaking an uncompiled core. */
export default class LayeredKnotBinding {
  readonly binding: MaterialBinding
  readonly coreBinding: MaterialBinding
  readonly placeholder = new MeshBasicNodeMaterial({
    colorWrite: false,
    depthWrite: false,
    opacity: 0,
    alphaTest: 1,
  })
  private core?: Mesh
  private coreReady = false
  private mesh?: Mesh
  private previousMesh?: Mesh
  private shellPlaceholder?: Mesh['material']
  private shellReady = false

  constructor(queue: AsyncMaterials, private readonly shellMaterial: MeshPhysicalNodeMaterial, private readonly coreMaterial: MeshPhysicalNodeMaterial) {
    this.binding = queue.add(shellMaterial)
    this.coreBinding = queue.add(coreMaterial)
  }

  dispose() {
    this.ref(null)
    this.core = undefined
    this.previousMesh = undefined
    this.placeholder.dispose()
  }

  ref(mesh: Mesh | null) {
    if (mesh === this.mesh) {
      return
    }
    this.binding.ref(null)
    this.coreBinding.ref(null)
    this.core?.removeFromParent()
    this.mesh = mesh ?? undefined
    if (!mesh) {
      return
    }
    if (mesh !== this.previousMesh) {
      this.previousMesh = mesh
      this.shellReady = false
      this.coreReady = false
      this.shellPlaceholder = mesh.material
      const core = new Mesh(mesh.geometry, this.placeholder)
      core.name = this.coreMaterial.name
      core.raycast = () => {}
      core.frustumCulled = false
      core.castShadow = mesh.castShadow
      core.receiveShadow = mesh.receiveShadow
      core.onBeforeRender = this.coreBinding.onBeforeRender
      this.core = core
    }
    mesh.add(this.core!)
    this.binding.ref(mesh)
    this.coreBinding.ref(this.core!)
    this.apply()
  }

  settled({material, status}: MaterialCompilation) {
    if (status !== 'ready' || !this.mesh || !this.core) {
      return
    }
    if (material === this.shellMaterial) {
      this.shellReady = true
    }
    if (material === this.coreMaterial) {
      this.coreReady = true
    }
    this.apply()
  }

  private apply() {
    if (!this.mesh || !this.core) {
      return
    }
    const ready = this.shellReady && this.coreReady
    this.mesh.material = ready ? this.shellMaterial : this.shellPlaceholder!
    this.core.material = ready ? this.coreMaterial : this.placeholder
  }
}
