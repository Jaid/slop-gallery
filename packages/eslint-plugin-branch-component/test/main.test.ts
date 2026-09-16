import {describe, expect, test} from 'bun:test'

import * as parser from '@typescript-eslint/parser'
import {Linter} from 'eslint'

import packageJson from '../package.json' with {type: 'json'}
import plugin, {rules} from '../src/main.ts'

const branchImport = "import Branch from 'branch-component';\n"
const childrenRules = ['simplify-children', 'expand-children'] as const
function fix(code: string, names: ReadonlyArray<keyof typeof plugin.rules> = Object.keys(plugin.rules) as Array<keyof typeof plugin.rules>, typescript = true) {
  const config = {
    ...plugin.configs.recommended,
    languageOptions: {
      ...plugin.configs.recommended.languageOptions,
      ...typescript ? {parser} : {},
    },
    rules: Object.fromEntries(names.map(name => [`branch-component/${name}`, 'error' as const])),
  }
  const linter = new Linter
  return linter.verifyAndFix(code, config, {filename: typescript ? 'fixture.tsx' : 'fixture.jsx'})
}
function expectStable(code: string, output: string, names?: ReadonlyArray<keyof typeof plugin.rules>, typescript = true) {
  const result = fix(code, names, typescript)
  expect(result.messages).toEqual([])
  expect(result.output).toBe(output)
  expect(result.fixed).toBe(true)
  const second = fix(result.output, names, typescript)
  expect(second.messages).toEqual([])
  expect(second.fixed).toBe(false)
  expect(second.output).toBe(output)
}
describe('plugin architecture', () => {
  test('exposes metadata from the package manifest', () => {
    expect(plugin.meta).toEqual({
      name: packageJson.name,
      version: packageJson.version,
      namespace: 'branch-component',
    })
  })
  test('exports all five documented, fixable rules', () => {
    expect(Object.keys(plugin.rules).toSorted()).toEqual(['expand-children', 'prefer-branch-component', 'prefer-positive', 'simplify-children', 'simplify-classname'])
    for (const [name, rule] of Object.entries(rules)) {
      expect(rule.meta.fixable).toBe('code')
      expect(rule.meta.schema).toEqual([])
      expect(rule.meta.docs?.url).toEndWith(`/docs/rules/${name}.md`)
      expect(typeof rule.create).toBe('function')
    }
  })
  test('recommended is a self-contained flat config', () => {
    const config: Linter.Config = plugin.configs.recommended
    expect(config.plugins?.['branch-component']).toBe(plugin)
    expect(Object.keys(config.rules ?? {})).toHaveLength(5)
    expect(config.name).toBe('branch-component/recommended')
  })
})
describe('combined autofixes', () => {
  for (const typescript of [true, false]) {
    describe(typescript ? 'TypeScript parser' : 'Espree', () => {
      test('the children rules converge without oscillating', () => {
        expectStable(
          `${branchImport}const view = <><Branch if={ok}><Content /></Branch><Branch if={ok} children={<Content />} /><Branch if={ok} children={<div><Content /></div>} /></>`,
          `${branchImport}const view = <><Branch if={ok} then={Content} /><Branch if={ok} then={Content} /><Branch if={ok}><div><Content /></div></Branch></>`,
          childrenRules,
          typescript,
        )
      })
      test('preserves line comments in opening tags across both children fixes', () => {
        for (const [input, output] of [
          ['<Branch if={ok} // keep\n><Content /></Branch>', '<Branch if={ok} // keep\n then={Content} />'],
          ['<Branch if={ok} // keep\n then={<div />} />', '<Branch if={ok} // keep\n><div /></Branch>'],
          ['<Branch if={ok} then={<div />} // keep\n />', '<Branch if={ok} // keep\n><div /></Branch>'],
          ['<Branch if={ok} then={<div />} // keep\n></Branch>', '<Branch if={ok} // keep\n><div /></Branch>'],
        ]) {
          expectStable(branchImport + input, branchImport + output, childrenRules, typescript)
        }
      })
      test('className hoisting and positive conditions converge with child simplification', () => {
        expectStable(
          `${branchImport}const view = <Branch if={!ok} then={<Content className={shared} />} else={<Fallback className={shared} />} />`,
          `${branchImport}const view = <Branch not={ok} else={Fallback} className={shared} then={Content} />`,
          undefined,
          typescript,
        )
      })
      test('a conditional flows through to the canonical then/else form', () => {
        expectStable(
          `${branchImport}const view = <>{ok ? <Content /> : <Fallback />}</>`,
          `${branchImport}const view = <><Branch if={ok} else={Fallback} then={Content} /></>`,
          undefined,
          typescript,
        )
      })
      test('inserts one import for many independent conditionals', () => {
        const count = 20
        const children = Array.from({length: count}, (_, i) => `{ok${i} ? <Content /> : null}`).join('')
        const expected = Array.from({length: count}, (_, i) => `<BranchComponent if={ok${i}} then={Content} />`).join('')
        expectStable(`const view = <>${children}</>`, `import BranchComponent from 'branch-component'\nconst view = <>${expected}</>`, undefined, typescript)
      })
      test('handles overlapping nested fixes over multiple passes', () => {
        expectStable(
          `${branchImport}const view = <Branch if={outer} children={<div>{inner ? <Content /> : null}</div>} />`,
          `${branchImport}const view = <Branch if={outer}><div><Branch if={inner} then={Content} /></div></Branch>`,
          undefined,
          typescript,
        )
      })
      test('keeps keys and refs rather than simplifying them away', () => {
        expectStable(
          `${branchImport}const view = <Branch if={ok} children={<Content key="stable" ref={ref} />} />`,
          `${branchImport}const view = <Branch if={ok}><Content key="stable" ref={ref} /></Branch>`,
          undefined,
          typescript,
        )
      })
    })
  }
  test('does not reuse type-only imports or capture unresolved names', () => {
    expectStable(
      "import type BranchComponent from 'branch-component';\nconst view = () => { use(BranchComponent2); return ok ? <Content /> : null }",
      "import BranchComponent3 from 'branch-component';\nimport type BranchComponent from 'branch-component';\nconst view = () => { use(BranchComponent2); return <BranchComponent3 if={ok} then={Content} /> }",
    )
  })
  test('preserves a byte order mark, CRLF, directives and a shebang', () => {
    expectStable(
      '\u{FEFF}#!/usr/bin/env node\r\n"use client";\r\nconst view = ok ? <Content /> : null',
      '\u{FEFF}#!/usr/bin/env node\r\n"use client";\r\nimport BranchComponent from \'branch-component\'\r\nconst view = <BranchComponent if={ok} then={Content} />',
    )
  })
  test('does not move a children read across a later side effect', () => {
    const code = `${branchImport}const view = <Branch children={<div>{value}</div>} if={changeValue()} />`
    const result = fix(code, childrenRules)
    expect(result.output).toBe(code)
    expect(result.fixed).toBe(false)
    expect(result.messages).toHaveLength(1)
  })
})
