import type {R3fStaticRenderingOptions} from '../src/main.ts'
import type {SceneNode} from '../src/plan.ts'
import type {CompiledScene} from '../src/runtime.ts'

import {expect, test} from 'bun:test'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'

import * as Three from 'three/webgpu'
import {SourceGraph} from 'vite-plugin-bake-core'

import {compileStaticRendering} from '../src/compile.ts'
import {StaticSceneResources} from '../src/runtime.ts'

const file = resolve(import.meta.dirname, 'fixture.tsx')
const mesh = (props = '', args = '[1, 2, 3]', materialProps = "color='#734129'") => `<mesh ${props}><boxGeometry args={${args}} /><meshStandardNodeMaterial ${materialProps} /></mesh>`
const map = (element = mesh('key={x} position={[x*2, 0, 0]}')) => `[0, 1, 2, 3].map(x => ${element})`
const scene = (body: string) => `export function Scene() { return <group>${body}</group> }`
const compile = (code: string, options: R3fStaticRenderingOptions = {}) => compileStaticRendering(code, file, options)
const walk = (nodes: Array<SceneNode>): Array<SceneNode> => nodes.flatMap(node => [node, ...walk(node.children)])
const create = (plan: CompiledScene['plan']) => new StaticSceneResources({
  plan,
  constructors: Three as unknown as CompiledScene['constructors'],
})
test('bakes matrices, removes the JSX map and makes one owned InstancedMesh', async () => {
  const result = await compile(scene(`{${map()}}`))
  expect(result.plans).toHaveLength(1)
  const {plan} = result.plans[0]
  expect(plan).toMatchObject({
    batches: 1,
    instances: 4,
    bundles: 0,
    objectsBefore: 4,
    objectsAfter: 1,
  })
  expect(result.code).not.toContain('.map(')
  expect(walk(plan.nodes).find(node => node.kind === 'instances')!.matrices).toEqual([0, 1, 2, 3].flatMap(x => (new Three.Matrix4).makeTranslation(x * 2, 0, 0).toArray()))
  const first = create(plan)
  const second = create(plan)
  const a = first.children[0] as Three.InstancedMesh
  const b = second.children[0] as Three.InstancedMesh
  expect(a.isInstancedMesh).toBe(true)
  expect(a.count).toBe(4)
  expect(a.instanceMatrix.array).toEqual(new Float32Array(walk(plan.nodes)[0].matrices!))
  expect(a.instanceMatrix.array.buffer).not.toBe(b.instanceMatrix.array.buffer)
  expect(a.geometry).not.toBe(b.geometry)
  expect(a.material).not.toBe(b.material)
  expect(a.boundingBox).not.toBeNull()
  let disposed = 0
  a.geometry.addEventListener('dispose', () => {
    disposed++
  })
  ;(a.material as Three.Material).addEventListener('dispose', () => {
    disposed++
  })
  a.addEventListener('dispose', () => {
    disposed++
  })
  first.dispose()
  first.dispose()
  expect(disposed).toBe(3)
  expect(second.children).toHaveLength(1)
  second.dispose()
})
test('bundles heterogeneous static meshes and preserves names, properties and native objects', async () => {
  const result = await compile(scene(`{${map(mesh("key={x} name={'part-'+x} castShadow receiveShadow", '[x + 1, 2, 3]'))}}`))
  const {plan} = result.plans[0]
  expect(plan).toMatchObject({
    batches: 0,
    bundles: 1,
    objectsBefore: 4,
    objectsAfter: 4,
  })
  const resources = create(plan)
  expect(resources.bundles).toHaveLength(1)
  expect(resources.bundles[0].isBundleGroup).toBe(true)
  for (let index = 0; index < 4; index++) {
    const object = resources.getObjectByName(`part-${index}`) as Three.Mesh
    expect(object.isMesh).toBe(true)
    expect((object as Three.InstancedMesh).isInstancedMesh).not.toBe(true)
    expect(object.castShadow).toBe(true)
    expect(object.receiveShadow).toBe(true)
    expect(object.frustumCulled).toBe(false)
  }
  const version = resources.bundles[0].version
  resources.updateBundles('first')
  expect(resources.bundles[0].version).toBe(version + 1)
  resources.updateBundles('first')
  expect(resources.bundles[0].version).toBe(version + 1)
  resources.updateBundles('changed')
  expect(resources.bundles[0].version).toBe(version + 2)
  resources.dispose()
})
test('runs instancing before bundle eligibility and honors both feature controls', async () => {
  const code = scene(`{${map()}}`)
  const both = await compile(code)
  expect(both.plans[0].plan.bundles).toBe(0)
  const onlyBundles = await compile(code, {staticInstancing: false})
  expect(onlyBundles.plans[0].plan).toMatchObject({
    batches: 0,
    bundles: 1,
  })
  const onlyInstances = await compile(code, {renderBundles: false})
  expect(onlyInstances.plans[0].plan).toMatchObject({
    batches: 1,
    bundles: 0,
  })
  for (const options of [{
    staticInstancing: false as const,
    renderBundles: false as const,
  }, {
    staticInstancing: {minimumCount: 5},
    renderBundles: {minimumObjects: 5},
  }]) {
    const skipped = await compile(code, options)
    expect(skipped.code).toBe(code)
    expect(skipped.plans).toHaveLength(0)
  }
})
test('composes nested anonymous transforms and preserves named groups', async () => {
  const code = `export function Scene() {return <group name='outer' position={[3,4,5]}>{[0,1,2,3].map(x=><group position={[x,0,0]} rotation={[0,0.5,0]}>${mesh('position={[0,2,0]}')}</group>)}</group>}`
  const result = await compile(code)
  const resources = create(result.plans[0].plan)
  const outer = resources.getObjectByName('outer')!
  expect(outer.position.toArray()).toEqual([3, 4, 5])
  const instanced = outer.children[0] as Three.InstancedMesh
  expect(instanced.count).toBe(4)
  for (let index = 0; index < 4; index++) {
    const actual = new Three.Matrix4
    instanced.getMatrixAt(index, actual)
    const expected = (new Three.Matrix4).compose(new Three.Vector3(index, 0, 0), (new Three.Quaternion).setFromEuler(new Three.Euler(0, 0.5, 0)), new Three.Vector3(1, 1, 1)).multiply((new Three.Matrix4).makeTranslation(0, 2, 0))
    for (const [i, value] of actual.elements.entries()) {
      expect(value).toBeCloseTo(expected.elements[i], 6)
    }
  }
  resources.dispose()
})
test('supports constant imports, aliases, re-exports and watch-style fresh evaluation', async () => {
  const directory = await mkdtemp(join(import.meta.dirname, 'imports-'))
  try {
    await writeFile(join(directory, 'data.ts'), 'throw new Error(\'do not execute unrelated module effects\'); export const data = [0,1,2,3]')
    await writeFile(join(directory, 'barrel.ts'), 'export {data as points} from \'./data.ts\'')
    const code = `import {points as offsets} from './barrel.ts'; export function Scene() {return <group>{offsets.map(x=>${mesh('key={x} position={[x,0,0]}')})}</group>}`
    const run = () => compileStaticRendering(code, join(directory, 'entry.tsx'), {}, new SourceGraph(async (source, importer) => resolve(importer, '..', source)))
    const first = await run()
    expect(first.plans[0].plan.instances).toBe(4)
    expect([...first.dependencies].some(path => path.endsWith('barrel.ts'))).toBe(true)
    await writeFile(join(directory, 'data.ts'), 'export const data = [0,1,2,3,4]')
    const second = await run()
    expect(second.plans[0].plan.instances).toBe(5)
    expect(second.plans[0].hash).not.toBe(first.plans[0].hash)
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    })
  }
})
test('supports static sibling regions and keeps surrounding dynamic nodes untouched', async () => {
  const code = `export function Scene({color}) {return <group><Custom />${[0, 1, 2, 3].map(x => mesh(`position={[${x},0,0]}`)).join('')}<mesh><sphereGeometry /><meshBasicNodeMaterial color={color} /></mesh></group>}`
  const result = await compile(code)
  expect(result.code).toContain('<Custom />')
  expect(result.code).toContain('color={color}')
  // Even when one sibling remains dynamic, no output may silently bake that dynamic value.
  expect(result.plans).toHaveLength(1)
  expect(result.plans[0].plan.instances).toBe(4)
})
test.each([
  ['dynamic collection', `export function Scene({items}) {return <group>{items.map(x=>${mesh('key={x}')})}</group>}`],
  ['dynamic material', `export function Scene({color}) {return <group>{${map(mesh('key={x}', '[1,2,3]', 'color={color}'))}}</group>}`],
  ['dynamic visibility', `export function Scene({visible}) {return <group>{${map(mesh('visible={visible} key={x}'))}}</group>}`],
  ['events', scene(`{${map(mesh('onClick={() => {}} key={x}'))}}`)],
  ['imperative ref', scene(`{${map(mesh('ref={value => {}} key={x}'))}}`)],
  ['ancestor ref', `export function Scene() {return <group ref={value => {}}>{${map()}}</group>}`],
  ['physics ancestor', `export function Scene() {return <RigidBody>{${map()}}</RigidBody>}`],
  ['opaque component', scene(`{${map('<Unknown key={x} />')}}`)],
  ['transparency', scene(`{${map(mesh('key={x}', '[1,2,3]', 'transparent opacity={0.5}'))}}`)],
  ['negative scale', scene(`{${map(mesh('key={x} scale={[-1,1,1]}'))}}`)],
  ['spread props', scene(`{${map(mesh('key={x} {...{castShadow:true}}'))}}`)],
  ['random transform', scene(`{${map(mesh('key={x} position={[Math.random(),0,0]}'))}}`)],
  ['user data identity', scene(`{${map(mesh('key={x} userData={{item:x}}'))}}`)],
  ['frame loop', `import {useFrame as animate} from '@react-three/fiber/webgpu'; export function Scene(){animate(()=>{});return <group>{${map()}}</group>}`],
  ['mutable import binding', `const positions = [0,1,2,3]; positions.push(4); export function Scene(){return <group>{positions.map(x=>${mesh('key={x}')})}</group>}`],
])('declines %s without modifying source', async (_name, code) => {
  const result = await compile(code)
  expect(result.plans).toHaveLength(0)
  expect(result.code).toBe(code)
  expect(result.diagnostics.length).toBeGreaterThan(0)
})
test('preserves directives and generates source maps', async () => {
  const result = await compile(`'use client';\n${scene(`{${map()}}`)}`)
  expect(result.code.startsWith("'use client';")).toBe(true)
  expect(result.map.sources).toHaveLength(1)
  expect(result.map.sourcesContent![0]).toContain('use client')
})
test('limits static scene expansion', async () => {
  const code = scene(`{${map()}}`)
  const result = await compile(code, {maxNodes: 3})
  expect(result.plans).toHaveLength(0)
  expect(result.code).toBe(code)
})
test('does not replace a mapped array consumed by length or another array operation', async () => {
  for (const suffix of ['.length', '.filter(Boolean)', '[0]']) {
    const code = `export const value = (${map()})${suffix}`
    const result = await compile(code)
    expect(result.plans).toHaveLength(0)
    expect(result.code).toBe(code)
  }
})
test('rejects truthy non-boolean material transparency instead of reordering it', async () => {
  const code = scene(`{${map(mesh('key={x}', '[1,2,3]', 'transparent={{enabled:true}}'))}}`)
  expect((await compile(code)).plans).toHaveLength(0)
})
