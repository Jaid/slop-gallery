import type {MeshPhysicalNodeMaterial, Texture} from 'three/webgpu'

export type KnotAuthor = {
  model: {
    effortLevel?: string
    slug?: string
    title: string
  }
}

export type KnotData = {
  accent: string
  archived?: boolean
  author: KnotAuthor
  /** Conservative maximum vertex displacement in meters, used for culling and collision bounds. */
  displacement?: number
  harness?: string
  highlighted: boolean
  icon: string
  id: string
  number: number
  title: string
}

export type KnotCandidateData = {
  icon: string
  id: string
  overview: string
  title: string
}

export type KnotEntry = KnotData & {
  model: string
  modelIcon: string
  modelTitle: string
  sourceId: string
}

export type KnotMaterialConstructor = new (environment: Texture) => MeshPhysicalNodeMaterial
export type KnotMaterialModule = {default: KnotMaterialConstructor}
