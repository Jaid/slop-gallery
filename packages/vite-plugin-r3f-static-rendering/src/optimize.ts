import type {ResolvedR3fStaticRenderingOptions} from './options.ts'
import type {SceneNode, StaticPlan} from './plan.ts'

import {Matrix4, Vector3} from 'three/webgpu'

import {staticRenderFacts} from './analysis.ts'
import {canBundle} from './features/renderBundles.ts'
import {canInstance} from './features/staticInstancing.ts'
import {identity} from './scene.ts'

const count = (nodes: ReadonlyArray<SceneNode>): number => nodes.reduce((sum, node) => sum + (node.kind === 'mesh' || node.kind === 'instances' ? 1 : count(node.children)), 0)
const multiply = (a: Array<number>, b: Array<number>) => (new Matrix4).fromArray(a).multiply((new Matrix4).fromArray(b)).toArray()
export function optimizeScene(input: Array<SceneNode>, options: ResolvedR3fStaticRenderingOptions): StaticPlan {
  let instances = 0
  let batches = 0
  let bundles = 0
  function flatten(nodes: Array<SceneNode>, parent = identity()): Array<SceneNode> {
    return nodes.flatMap(node => {
      const matrix = multiply(parent, node.matrix)
      if (node.kind === 'group' && Object.keys(node.props).length === 0) {
        return flatten(node.children, matrix)
      }
      return [{
        ...node,
        matrix,
        children: node.children.map(child => ({...child})),
      }]
    })
  }
  function instance(nodes: Array<SceneNode>): Array<SceneNode> {
    const feature = options.staticInstancing
    if (!feature || !feature.enabled) {
      return nodes
    }
    const output: Array<SceneNode> = []
    const flat = flatten(nodes)
    for (let index = 0; index < flat.length;) {
      const first = flat[index]
      const candidate = (node: SceneNode) => node.kind === 'mesh' && !node.props.name && node.props.visible !== false && orthogonal(node.matrix)
      const key = (node: SceneNode) => JSON.stringify([node.geometry, node.material, node.props])
      let end = index + 1
      if (candidate(first)) {
        while (end < flat.length && candidate(flat[end]) && key(flat[end]) === key(first)) {
          end++
        }
      }
      if (canInstance({
        facts: staticRenderFacts(flat.slice(index, end)),
        instanceGroup: {
          count: end - index,
          geometryKey: JSON.stringify(first.geometry),
          materialKey: JSON.stringify(first.material),
          matricesStatic: flat.slice(index, end).every(node => orthogonal(node.matrix)),
        },
        renderBundle: false,
      }, feature)) {
        output.push({
          ...first,
          kind: 'instances',
          matrix: identity(),
          matrices: flat.slice(index, end).flatMap(node => node.matrix),
        })
        batches++
        instances += end - index
      } else {
        for (const node of flat.slice(index, end)) {
          output.push({
            ...node,
            children: instance(node.children),
          })
        }
      }
      index = end
    }
    return output
  }
  let nodes = instance(input)
  const feature = options.renderBundles
  // Count the rewritten render graph, not the original JSX family.
  if (feature && canBundle({
    facts: staticRenderFacts(nodes),
    renderBundle: true,
    renderObjectCount: count(nodes),
  }, feature)) {
    nodes = [{
      kind: 'bundle',
      matrix: identity(),
      props: {},
      children: nodes,
    }]
    bundles = 1
  }
  return {
    nodes,
    instances,
    batches,
    bundles,
    objectsBefore: count(input),
    objectsAfter: count(nodes),
  }
}

export function constructorsFor(plan: StaticPlan) {
  const names = new Set<string>
  function walk(nodes: Array<SceneNode>) {
    for (const node of nodes) {
      if (node.geometry) {
        names.add(node.geometry.type)
      }
      if (node.material) {
        names.add(node.material.type)
      }
      walk(node.children)
    }
  }
  walk(plan.nodes)
  return [...names].sort()
}

function orthogonal(matrix: Array<number>) {
  const x = new Vector3(...matrix.slice(0, 3) as [number, number, number])
  const y = new Vector3(...matrix.slice(4, 7) as [number, number, number])
  const z = new Vector3(...matrix.slice(8, 11) as [number, number, number])
  return Math.abs(x.dot(y)) <= 1e-7 * x.length() * y.length() && Math.abs(x.dot(z)) <= 1e-7 * x.length() * z.length() && Math.abs(y.dot(z)) <= 1e-7 * y.length() * z.length()
}
