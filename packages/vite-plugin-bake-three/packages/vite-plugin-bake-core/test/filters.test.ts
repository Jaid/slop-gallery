import type {NodePath} from '@babel/traverse'

import {expect, test} from 'bun:test'

import {parse} from '@babel/parser'
import traverse from '@babel/traverse'

import {Inclusion, scopePath} from '../src/filters.ts'

const scopes = (code: string) => {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  })
  const result: Array<string> = []
  const collect = (path: NodePath) => {
    result.push(scopePath(path))
  }
  traverse(ast, {
    CallExpression: collect,
    NewExpression: collect,
    FunctionDeclaration: collect,
    ClassDeclaration: collect,
  })
  return result
}
test('scope paths name definitions by themselves and calls by their callee inside the declarations around them', () => {
  expect(scopes(`
    export function domeGeometry() { return new SphereGeometry(1) }
    function latticeGeometry() { return mergeParts([new BoxGeometry(1)]) }
  `)).toEqual(['domeGeometry', 'domeGeometry/SphereGeometry', 'latticeGeometry', 'latticeGeometry/mergeParts', 'latticeGeometry/BoxGeometry'])
  expect(scopes(`
    class Sculpture {
      geometry = new TorusKnotGeometry()
      #cache = new Map()
      constructor() { const tree = new three.MeshBVH(this.geometry) }
      static build() { return create() }
    }
  `)).toEqual(['Sculpture', 'Sculpture/geometry/TorusKnotGeometry', 'Sculpture/#cache/Map', 'Sculpture/constructor/tree/MeshBVH', 'Sculpture/build/create'])
  expect(scopes(`
    provideArchitecture(cutArchitectures(walls))
    export const parts = {surface: build(), [key]: other()}
    const lazy = () => new BoxGeometry()
    export default () => new PlaneGeometry()
  `)).toEqual(['provideArchitecture', 'cutArchitectures', 'parts/surface/build', 'parts/other', 'lazy/BoxGeometry', 'default/PlaneGeometry'])
})
test('without include filters, every file in the project root is included completely', () => {
  const inclusion = new Inclusion(undefined, 'C:/project/')
  expect(inclusion.select('C:/project/src/a.ts')?.('anything')).toBe(true)
  expect(inclusion.select(String.raw`C:\project\src\a.ts`)?.('anything')).toBe(true)
  expect(inclusion.select('C:/projects/a.ts')).toBeUndefined()
})
test('globs, RegExps and predicates include whole files', () => {
  const inclusion = new Inclusion(['src/lib/**/*.ts', './src/components/Architecture/index.tsx', '/opt/shared/**', /knot-materials\/src\/entries\//u, (id: string) => id.endsWith('/special.ts')], '/project')
  for (const id of ['/project/src/lib/gallery/dome.ts', '/project/src/components/Architecture/index.tsx', '/opt/shared/geometry.ts', '/project/packages/knot-materials/src/entries/cat/Material.ts', '/elsewhere/special.ts']) {
    expect(inclusion.select(id)?.('any/scope')).toBe(true)
  }
  for (const id of ['/project/src/lib/dome.tsx', '/project/src/components/Other/index.tsx', '/project/opt/shared/geometry.ts']) {
    expect(inclusion.select(id)).toBeUndefined()
  }
  const single = new Inclusion(/dome\.ts$/gu, '/project')
  // A global RegExp must not carry its lastIndex from one file over to the next.
  expect(single.select('/project/dome.ts')).toBeDefined()
  expect(single.select('/project/dome.ts')).toBeDefined()
})
test('scoped filters select candidates by minimatch patterns, and a whole-file filter for the same file wins', () => {
  const scoped = new Inclusion([{
    glob: 'src/lib/gallery/antechamberDome.ts',
    scope: 'antechamberDomeGeometry',
  }, {
    glob: 'src/lib/**',
    scope: 'Crater*/**',
  }], '/project')
  const dome = scoped.select('/project/src/lib/gallery/antechamberDome.ts')!
  expect(dome('antechamberDomeGeometry')).toBe(true)
  expect(dome('antechamberLatticeGeometry')).toBe(false)
  expect(dome('antechamberDomeGeometry/SphereGeometry')).toBe(false)
  const crater = scoped.select('/project/src/lib/gallery/moonfall/CraterGeometry.ts')!
  expect(crater('CraterGeometry/constructor/DiscTerrainMesh')).toBe(true)
  expect(crater('craterTerrain')).toBe(false)
  expect(scoped.select('/project/src/components/Architecture/index.tsx')).toBeUndefined()
  // As documented: ** spans names but needs one, braces add the scope itself.
  const nested = new Inclusion([{
    glob: 'a.ts',
    scope: 'Sculpture/**',
  }, {
    glob: 'b.ts',
    scope: 'Sculpture{,/**}',
  }], '/project')
  expect(nested.select('/project/a.ts')!('Sculpture')).toBe(false)
  expect(nested.select('/project/a.ts')!('Sculpture/#cache/Map')).toBe(true)
  expect(nested.select('/project/b.ts')!('Sculpture')).toBe(true)
  expect(nested.select('/project/b.ts')!('Sculpture/geometry/TorusKnotGeometry')).toBe(true)
  const combined = new Inclusion([{
    glob: '**/dome.ts',
    scope: 'nothing',
  }, 'src/dome.ts'], '/project')
  expect(combined.select('/project/src/dome.ts')!('anything')).toBe(true)
})
test('rejects malformed filters while the plugin is configured', () => {
  expect(() => new Inclusion('', '/project')).toThrow(TypeError)
  expect(() => new Inclusion({
    glob: 'src/**',
    scope: '',
  }, '/project')).toThrow(TypeError)
  expect(() => new Inclusion([{
    glob: 7,
    scope: 'a',
  } as unknown as {
    glob: string
    scope: string
  }], '/project')).toThrow(TypeError)
})
