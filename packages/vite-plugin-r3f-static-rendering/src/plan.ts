export type StaticValue = ReadonlyArray<StaticValue> | {[key: string]: StaticValue} | boolean | number | string | null
export type ResourcePlan = {
  args: Array<StaticValue>
  props: Record<string, StaticValue>
  type: string
}
export type RenderProps = {
  castShadow?: boolean
  frustumCulled?: boolean
  name?: string
  receiveShadow?: boolean
  renderOrder?: number
  visible?: boolean
}
export type SceneNode = {
  children: Array<SceneNode>
  geometry?: ResourcePlan
  kind: 'bundle' | 'group' | 'instances' | 'mesh'
  material?: ResourcePlan
  matrices?: Array<number>
  matrix: Array<number>
  props: RenderProps
}
export type StaticPlan = {
  batches: number
  bundles: number
  instances: number
  nodes: Array<SceneNode>
  objectsAfter: number
  objectsBefore: number
}
export type StaticDiagnostic = {
  batches?: number
  bundles?: number
  file: string
  line: number
  objectsAfter?: number
  objectsBefore?: number
  reason?: string
  status: 'optimized' | 'skipped'
}

export class NotStaticError extends Error {
  override name = 'NotStaticError'
}
