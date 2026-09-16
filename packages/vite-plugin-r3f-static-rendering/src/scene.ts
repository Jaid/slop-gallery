import type {ResourcePlan, SceneNode, StaticValue} from './plan.ts'
import type {NodePath} from '@babel/traverse'

import traverse from '@babel/traverse'
import * as t from '@babel/types'
import {Euler, Matrix4, Quaternion, Vector3} from 'three/webgpu'

import {NotStaticError} from './plan.ts'

export const geometries = new Set(['boxGeometry', 'capsuleGeometry', 'circleGeometry', 'coneGeometry', 'cylinderGeometry', 'dodecahedronGeometry', 'icosahedronGeometry', 'octahedronGeometry', 'planeGeometry', 'ringGeometry', 'sphereGeometry', 'tetrahedronGeometry', 'torusGeometry', 'torusKnotGeometry'])
export const materials = new Set(['meshBasicNodeMaterial', 'meshStandardNodeMaterial', 'meshPhysicalNodeMaterial', 'meshNormalNodeMaterial', 'meshLambertNodeMaterial', 'meshPhongNodeMaterial'])
const transforms = new Set(['position', 'rotation', 'quaternion', 'scale'])
const meshProps = new Set([...transforms, 'key', 'name', 'castShadow', 'receiveShadow', 'visible', 'frustumCulled', 'renderOrder'])
const groupProps = new Set([...transforms, 'key', 'name', 'visible'])
const materialProps = new Set(['key', 'color', 'emissive', 'emissiveIntensity', 'roughness', 'metalness', 'flatShading', 'wireframe', 'side', 'toneMapped', 'fog', 'envMapIntensity', 'transparent', 'opacity', 'depthTest', 'depthWrite', 'alphaTest', 'clearcoat', 'clearcoatRoughness', 'reflectivity', 'ior', 'specularIntensity', 'specularColor', 'shininess'])
const identity = () => (new Matrix4).toArray()

type RawNode = {
  children: Array<unknown>
  props: Record<string, StaticValue>
  tag: string
}

/** JSX becomes inert data. React components and hooks are never executed by evaluation. */
export function lowerScene(expression: t.Expression): t.Expression {
  const ast = t.file(t.program([t.expressionStatement(t.cloneNode(expression, true))]))
  const replace = (path: NodePath, value: t.Expression) => {
    path.replaceWith(path.parentPath?.isJSXElement() || path.parentPath?.isJSXFragment() ? t.jsxExpressionContainer(value) : value)
  }
  traverse(ast, {
    JSXElement: {exit(path) {
      replace(path, lowerJsx(path))
    }},
    JSXFragment: {exit(path) {
      const elements = path.node.children.flatMap(child => {
        if (t.isJSXText(child) && child.value.trim() === '') {
          return []
        }
        if (t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) {
          return []
        }
        if (t.isJSXExpressionContainer(child) && t.isExpression(child.expression)) {
          return [child.expression]
        }
        throw new NotStaticError('Unsupported fragment child.')
      })
      replace(path, t.arrayExpression(elements))
    }},
  })
  return (ast.program.body[0] as t.ExpressionStatement).expression
}

export function sceneFromValue(value: unknown, maxNodes: number): Array<SceneNode> {
  let count = 0
  function flatten(value: unknown): Array<RawNode> {
    if (value === null || value === undefined || typeof value === 'boolean') {
      return []
    }
    if (Array.isArray(value)) {
      return value.flatMap(flatten)
    }
    if (!value || typeof value !== 'object' || !('tag' in value)) {
      throw new NotStaticError('Non-scene value returned by render expression.')
    }
    const node = value as RawNode
    if (++count > maxNodes) {
      throw new NotStaticError('Static scene exceeds maxNodes.')
    }
    return [{
      tag: node.tag,
      props: plain(node.props) as Record<string, StaticValue>,
      children: node.children,
    }]
  }
  function build(node: RawNode): SceneNode {
    if (node.tag !== 'group' && node.tag !== 'mesh') {
      throw new NotStaticError('Resource outside a mesh.')
    }
    const children = node.children.flatMap(flatten)
    const {key: _key, position: _position, rotation: _rotation, quaternion: _quaternion, scale: _scale, ...props} = node.props
    for (const [key, value] of Object.entries(props)) {
      if (['castShadow', 'frustumCulled', 'receiveShadow', 'visible'].includes(key) && typeof value !== 'boolean') {
        throw new NotStaticError('Invalid render flag.')
      }
      if (key === 'name' && typeof value !== 'string' || key === 'renderOrder' && typeof value !== 'number') {
        throw new NotStaticError('Invalid object property.')
      }
    }
    const matrix = transform(node.props)
    if (node.tag === 'group') {
      return {
        kind: 'group',
        props,
        matrix,
        children: children.map(build),
      }
    }
    const geometry = children.filter(child => geometries.has(child.tag))
    const material = children.filter(child => materials.has(child.tag))
    if (children.length !== 2 || geometry.length !== 1 || material.length !== 1) {
      throw new NotStaticError('A static mesh needs exactly one owned geometry and material.')
    }
    return {
      kind: 'mesh',
      props,
      matrix,
      children: [],
      geometry: resource(geometry[0], 'geometry'),
      material: resource(material[0], 'material'),
    }
  }
  return flatten(value).map(build)
}

function lowerJsx(path: NodePath<t.JSXElement>) {
  const {openingElement} = path.node
  if (!t.isJSXIdentifier(openingElement.name)) {
    throw new NotStaticError('Unknown JSX component.')
  }
  const tag = openingElement.name.name
  const allowed = tag === 'mesh' ? meshProps : tag === 'group' ? groupProps : geometries.has(tag) ? new Set(['args', 'key']) : materials.has(tag) ? materialProps : undefined
  if (!allowed) {
    throw new NotStaticError(`Opaque or non-renderable JSX: ${tag}.`)
  }
  const attributes: Array<t.ObjectProperty> = []
  const seen = new Set<string>
  for (const attribute of openingElement.attributes) {
    if (!t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) {
      throw new NotStaticError('Spread or namespaced JSX properties.')
    }
    const name = attribute.name.name
    if (!allowed.has(name)) {
      throw new NotStaticError(`Identity-sensitive or unsupported property: ${name}.`)
    }
    if (seen.has(name)) {
      throw new NotStaticError('Duplicate JSX property.')
    }
    seen.add(name)
    let value: t.Expression
    if (attribute.value === null) {
      value = t.booleanLiteral(true)
    } else if (t.isStringLiteral(attribute.value)) {
      value = attribute.value
    } else if (t.isJSXExpressionContainer(attribute.value) && t.isExpression(attribute.value.expression)) {
      value = attribute.value.expression
    } else {
      throw new NotStaticError('Unsupported JSX property value.')
    }
    attributes.push(t.objectProperty(t.stringLiteral(name), value))
  }
  const children = path.node.children.flatMap(child => {
    if (t.isJSXText(child) && child.value.trim() === '') {
      return []
    }
    if (t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) {
      return []
    }
    if (t.isJSXExpressionContainer(child) && t.isExpression(child.expression)) {
      return [child.expression]
    }
    throw new NotStaticError('Text or spread children in a render graph.')
  })
  return t.objectExpression([
    t.objectProperty(t.identifier('tag'), t.stringLiteral(tag)),
    t.objectProperty(t.identifier('props'), t.objectExpression(attributes)),
    t.objectProperty(t.identifier('children'), t.arrayExpression(children)),
  ])
}
function plain(value: unknown, depth = 0): StaticValue {
  if (depth > 40) {
    throw new NotStaticError('Static property is too deeply nested.')
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(item => plain(item, depth + 1))
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(Object.getPrototypeOf(value)) === null) {
    return Object.fromEntries(Object.keys(value).sort().map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!('value' in descriptor)) {
        throw new NotStaticError('Accessor in static output.')
      }
      return [key, plain(descriptor.value, depth + 1)]
    }))
  }
  throw new NotStaticError('Render properties must be finite, plain static data.')
}
function tuple(value: StaticValue | undefined, fallback: Array<number>, length: number) {
  const result = value === undefined ? fallback : value
  if (!Array.isArray(result) || result.length !== length || !result.every(item => typeof item === 'number' && Number.isFinite(item))) {
    throw new NotStaticError('Invalid static transform.')
  }
  return result as Array<number>
}
function transform(props: Record<string, StaticValue>) {
  const position = tuple(props.position, [0, 0, 0], 3)
  const scale = tuple(typeof props.scale === 'number' ? [props.scale, props.scale, props.scale] : props.scale, [1, 1, 1], 3)
  const quaternion = new Quaternion
  if (props.quaternion !== undefined && props.rotation !== undefined) {
    throw new NotStaticError('Combined rotation and quaternion assignments.')
  }
  if (props.quaternion !== undefined) {
    quaternion.fromArray(tuple(props.quaternion, [0, 0, 0, 1], 4))
  } else {
    const rotation = props.rotation ?? [0, 0, 0]
    if (!Array.isArray(rotation) || rotation.length < 3 || rotation.length > 4 || rotation.slice(0, 3).some(item => typeof item !== 'number') || rotation.length === 4 && !['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX'].includes(String(rotation[3]))) {
      throw new NotStaticError('Invalid static Euler rotation.')
    }
    quaternion.setFromEuler(new Euler(rotation[0] as number, rotation[1] as number, rotation[2] as number, rotation[3] as Euler['order'] | undefined))
  }
  // Negative/singular transforms are not safely representable by InstancedMesh.
  // Decline the whole optimization rather than silently changing winding or normals.
  if (scale.some(value => value <= 0) || Math.abs(quaternion.lengthSq() - 1) > 1e-6) {
    throw new NotStaticError('Mirrored, singular or non-unit transform.')
  }
  return (new Matrix4).compose(new Vector3(...position as [number, number, number]), quaternion, new Vector3(...scale as [number, number, number])).toArray()
}
function resource(node: RawNode, kind: 'geometry' | 'material'): ResourcePlan {
  if (node.children.length) {
    throw new NotStaticError('Nested mutable resource properties.')
  }
  const {key: _key, args: rawArgs, ...props} = node.props
  const args = rawArgs ?? []
  if (!Array.isArray(args)) {
    throw new NotStaticError('Resource arguments must be an array.')
  }
  if (kind === 'geometry' && !args.every(value => typeof value === 'number' || typeof value === 'boolean')) {
    throw new NotStaticError('Unsupported geometry arguments.')
  }
  if (kind === 'material') {
    for (const [key, value] of Object.entries(props)) {
      if (['color', 'emissive', 'specularColor'].includes(key)) {
        if (typeof value !== 'string' && typeof value !== 'number' && !(Array.isArray(value) && value.length === 3 && value.every(channel => typeof channel === 'number'))) {
          throw new NotStaticError('Invalid material color.')
        }
      } else if (['depthTest', 'depthWrite', 'flatShading', 'fog', 'toneMapped', 'transparent', 'wireframe'].includes(key)) {
        if (typeof value !== 'boolean') {
          throw new NotStaticError('Invalid material boolean.')
        }
      } else if (typeof value !== 'number') {
        throw new NotStaticError('Invalid material scalar.')
      }
    }
  }
  if (kind === 'material' && (props.transparent === true || typeof props.opacity === 'number' && props.opacity < 1 || props.depthWrite === false || props.depthTest === false || props.wireframe === true || props.alphaTest !== undefined && props.alphaTest !== 0)) {
    throw new NotStaticError('Transparency, order-dependent blending or wireframes stay at runtime.')
  }
  return {
    type: node.tag[0].toUpperCase() + node.tag.slice(1),
    args: [...args],
    props,
  }
}

export {identity}
