import type {Material, Mesh} from 'three/webgpu'

export type MaterialBinding = {
  /** Assign or explicitly compose with the mesh's existing onBeforeRender callback. */
  onBeforeRender: Mesh['onBeforeRender']
  /** Attach one mesh at a time. null pauses this binding; a different mesh must warm again. */
  ref: (mesh: Mesh | null) => void
}
export type MaterialCompilation = {
  contexts: number
  error?: unknown
  material: Material
  mesh: Mesh
  startedAt: number
  status: 'cancelled' | 'failed' | 'ready'
}
export type AsyncMaterialsOptions = {
  /** Synchronous reporting only. Exceptions are logged without interrupting other materials. */
  onSettled?: (result: MaterialCompilation) => void
  /** Lowest finite score first. Recomputed before each material; ties retain insertion order. */
  priority?: (mesh: Mesh, material: Material) => number
}
