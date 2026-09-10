import type {MeshPhysicalNodeMaterial, Texture} from 'three/webgpu'

export type KnotAuthor = {
  model: {
    title: string
    slug?: string
    effortLevel?: string
  }
}

export type KnotData = {
  author: KnotAuthor
  id: string
  number: number
  title: string
  accent: string
  highlighted: boolean
  archived?: boolean
  /** Conservative maximum vertex displacement in meters, used for culling and collision bounds. */
  displacement?: number
  icon: string
}

export type KnotCandidateData = {
  id: string
  title: string
  icon: string
  overview: string
  /** Override the default eight-item display while reviewing a larger batch. */
  displayLimit?: number
}

export type KnotEntry = KnotData & {
  sourceId: string
  model: string
  modelTitle: string
  modelIcon: string
}

export type KnotMaterialConstructor = new (environment: Texture) => MeshPhysicalNodeMaterial
export type KnotMaterialModule = {default: KnotMaterialConstructor}
