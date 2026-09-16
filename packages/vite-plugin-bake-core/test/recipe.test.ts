import type {BakeAdapter} from '../src/types.ts'
import type {NodePath} from '@babel/traverse'
import type {CallExpression, NewExpression} from '@babel/types'

import {afterAll, expect, test} from 'bun:test'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'

import Recipe from '../src/Recipe.ts'
import {decodeSnapshot} from '../src/runtime.ts'
import SnapshotWriter from '../src/SnapshotWriter.ts'
import SourceGraph from '../src/SourceGraph.ts'

class Resource<Value = unknown> {
  constructor(public data: Value) {}
}
const adapter: BakeAdapter = {
  name: 'test',
  modules: new Map([['test:resources', {Resource}]]),
  roots: new Set([Resource]),
  types: [{
    name: 'Resource',
    module: 'test:resources',
    prototype: Resource.prototype,
    resource: 'test',
  }],
  accepts: resources => resources.has('test'),
}
const directory = await mkdtemp(join(tmpdir(), 'bake-recipes-'))
afterAll(() => rm(directory, {
  recursive: true,
  force: true,
}))
const graph = new SourceGraph(async (source, importer) => resolve(importer, '..', source))
async function evaluate(code: string, timeout = 1000) {
  const source = await graph.input(join(directory, 'input.ts'), `import {Resource} from 'test:resources';\n${code}`)
  const path = source.path.scope.getBinding('result')!.path.get('init') as NodePath<CallExpression | NewExpression>
  return new Recipe(graph, adapter).evaluate(path, timeout)
}
function roundTrip(result: Awaited<ReturnType<typeof evaluate>>) {
  const writer = new SnapshotWriter(adapter, 1024 * 1024, result.isShared, result.rootPrototype)
  return decodeSnapshot(writer.write(result.value), {Resource})
}
test('evaluates locally mutable algorithms and strips TypeScript', async () => {
  const evaluated = await evaluate(`
    function build(seed: number): Resource {
      const next = () => ++seed
      const values: number[] = []
      for (let i = 0; i < 4; i++) values.push(next())
      return new Resource(values)
    }
    const result = build(7)
  `)
  expect((roundTrip(evaluated)() as Resource).data).toEqual([8, 9, 10, 11])
})
test('follows aliased imports and re-exports without executing the application module', async () => {
  await writeFile(join(directory, 'source.ts'), `
    import {Resource} from 'test:resources'
    throw new Error('Module side effect must NOT execute at build time')
    export const width = 17
    export function create() { return new Resource(width) }
  `)
  await writeFile(join(directory, 'barrel.ts'), "export {create as make} from './source.ts'")
  const result = await evaluate("import {make as alias} from './barrel.ts'; const result = alias()")
  expect((roundTrip(result)() as Resource).data).toBe(17)
  expect([...result.dependencies].some(path => path.endsWith('source.ts'))).toBe(true)
})
test('supports static destructuring and helper functions', async () => {
  const result = await evaluate('const {x, y} = {x: 3, y: 7}; const result = new Resource(x * y)')
  expect((roundTrip(result)() as Resource).data).toBe(21)
})
test.each([
  ['clock', 'const result = new Resource(Date.now())'],
  ['random', 'const result = new Resource(Math.random())'],
  ['indirect random', "const method = 'ran' + 'dom'; const result = new Resource(Math[method]())"],
  ['browser state', 'const result = new Resource(window.innerWidth)'],
  ['runtime parameter', 'function component(size) { const result = new Resource(size) }; const result = component(1)'],
  ['mutable binding', 'let n = 0; n++; const result = new Resource(n)'],
  ['captured buffer mutation', 'const data = new Uint8Array(4); data[0] = 7; const result = new Resource(data)'],
  ['captured state mutation', 'const settings = {x: 1}; const make = () => { settings.x++; return new Resource(3) }; const result = make()'],
  ['captured alias', 'const shared = new Resource(1); const result = (() => shared)()'],
  ['stateful captured closure', 'const next = (() => {let n = 0; return () => n++})(); const result = new Resource(next())'],
  ['unknown import', "import read from 'node:fs'; const result = new Resource(read.readFileSync('secret'))"],
  ['accessor', 'const settings = {get value() { return 2 }}; const result = new Resource(settings.value)'],
  ['asynchronous recipe', 'const make = async () => new Resource(1); const result = make()'],
  ['private class state', 'class Private extends Resource { #value = 1 }; const result = new Private(1)'],
])('declines %s', async (_label, code) => {
  // A dynamic function argument is legal inside a closed invocation; reject an actually open parameter.
  if (_label === 'runtime parameter') {
    const source = await graph.input(join(directory, 'parameter.ts'), "import {Resource} from 'test:resources'; function component(size) { return new Resource(size) }")
    let path!: NodePath<NewExpression>
    source.path.traverse({NewExpression(value) {
      path = value
    }})
    await expect(new Recipe(graph, adapter).evaluate(path, 1000)).rejects.toThrow()
    return
  }
  await expect((async () => roundTrip(await evaluate(code)))()).rejects.toThrow()
})
test('does not confuse a shadowed constructor with an imported resource', async () => {
  await expect(evaluate('const result = (() => { const Resource = (x) => x; return Resource(1) })()')).rejects.toThrow('Not a recognized resource')
})
test('limits runaway recipes', async () => {
  await expect(evaluate('const result = (() => { while (true) {} return new Resource(1) })()', 10)).rejects.toThrow()
})
test('keeps aliases within a snapshot but never between factory calls', async () => {
  const evaluated = await evaluate(`
    const result = (() => {
      const array = new Float32Array([1, 2, 3, 4])
      const object = {array, same: array, view: array.subarray(1, 3)}
      return new Resource(object)
    })()
  `)
  const create = roundTrip(evaluated)
  const first = create() as Resource<{array: Float32Array, same: Float32Array, view: Float32Array}>
  const second = create() as Resource<{array: Float32Array, same: Float32Array, view: Float32Array}>
  expect(first).toBeInstanceOf(Resource)
  expect(first.data.array).toBe(first.data.same)
  expect(first.data.array.buffer).toBe(first.data.view.buffer)
  expect(first.data.array.buffer).not.toBe(second.data.array.buffer)
  first.data.view[0] = 20
  expect(first.data.array[1]).toBe(20)
  expect(second.data.array[1]).toBe(2)
})
test('preserves special numbers, null prototypes, maps and cycles', async () => {
  const evaluated = await evaluate(`
    const result = (() => {
      const data = Object.create(null)
      data.values = [NaN, Infinity, -Infinity, -0, undefined]
      data.self = data
      data.map = new Map([[data, 7]])
      return new Resource(data)
    })()
  `)
  type Data = {self: Data, map: Map<Data, number>, values: Array<number | undefined>}
  const value = (roundTrip(evaluated)() as Resource<Data>).data
  expect(Object.getPrototypeOf(value)).toBe(null)
  expect(value.self).toBe(value)
  expect(value.map.get(value)).toBe(7)
  expect(Number.isNaN(value.values[0])).toBe(true)
  expect(Object.is(value.values[3], -0)).toBe(true)
})
test('reads captured arrays through non-mutating Array algorithms', async () => {
  const result = await evaluate('const values = [1, 2, 3]; const result = new Resource(values.map(value => value * 3))')
  expect((roundTrip(result)() as Resource).data).toEqual([3, 6, 9])
})
test('declines mutation through a const alias', async () => {
  await expect(evaluate('const settings = {x: 1}; const alias = settings; alias.x = 2; const result = new Resource(settings.x)')).rejects.toThrow()
})
test('declines Object.assign into captured configuration', async () => {
  await expect(evaluate('const settings = {x: 1}; Object.assign(settings, {x: 2}); const result = new Resource(settings.x)')).rejects.toThrow()
})
