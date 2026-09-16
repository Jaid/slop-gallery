import {describe, expect, test} from 'bun:test'

import Branch from 'branch-component'
import {Linter} from 'eslint'
import * as React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import plugin from '../src/main.ts'

const branchImport = "import Branch from 'branch-component';\n"
const declarations = `
const Content = () => <main>Content</main>
const Header = () => <header>Header</header>
const Fallback = () => <aside>Fallback</aside>
`
const transpiler = new Bun.Transpiler({
  loader: 'tsx',
  tsconfig: {compilerOptions: {
    jsx: 'react',
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment',
  }},
})
function render(code: string, ok: boolean): string {
  const source = transpiler.transformSync(code.replace(branchImport, ''))
  // The generated program consists exclusively of static fixtures in this file.
  const evaluate = new Function('React', 'Branch', 'ok', `${source}\nreturn view`) as (react: typeof React, branch: typeof Branch, condition: boolean) => React.ReactNode
  return renderToStaticMarkup(evaluate(React, Branch, ok))
}
describe('autofixes against the installed Branch runtime', () => {
  for (const expression of [
    'ok ? <Content /> : <Fallback />',
    'ok ? <Content /> : null',
    'ok ? null : <Fallback />',
    '!!ok && <Content />',
    '<Branch if={ok}><Content /></Branch>',
    '<Branch if={ok} children={<Content />} />',
    '<Branch if={ok} then={<Content />} else={<Fallback />} />',
    '<Branch if={ok} then={<Header />}><Content /></Branch>',
    '<Branch if={ok} then={<Header />} children={<Content />} />',
    '<Branch if={ok} then={<div><Content /></div>} else={<aside><Fallback /></aside>} />',
    '<Branch if={ok} then={<Content />} else={<Fallback />}><footer>Footer</footer></Branch>',
    '<Branch if={!ok} then={<main className="shared">Content</main>} else={<aside className="shared">Fallback</aside>} />',
    '<Branch if={ok} className="base" then={<main className="shared">Content</main>} else={<aside className="shared">Fallback</aside>} />',
    '<Branch if={ok}><header className="shared" key="header">Header</header><main className="shared" key="main">Content</main></Branch>',
  ]) {
    for (const ok of [true, false]) {
      test(`${expression}, condition=${ok}`, () => {
        const code = `${branchImport}${declarations}const view = ${expression}`
        const linter = new Linter
        const result = linter.verifyAndFix(code, plugin.configs.recommended, {filename: 'fixture.jsx'})
        expect(result.fixed).toBe(true)
        expect(result.messages).toEqual([])
        expect(result.output).not.toMatch(/children=\{(?:Content|Fallback|Header)\}/u)
        expect(render(result.output, ok)).toBe(render(code, ok))
        expect(linter.verifyAndFix(result.output, plugin.configs.recommended, {filename: 'fixture.jsx'}).fixed).toBe(false)
      })
    }
  }
  for (const setup of [
    'const Wrapped = React.memo(Content)',
    'const Wrapped = React.forwardRef(() => <Content />)',
    'const Wrapped = React.Fragment',
  ]) {
    test(`retains JSX for ${setup}`, () => {
      const code = `${branchImport}${declarations}${setup}; const view = <Branch if={ok} then={<Wrapped />} />`
      const linter = new Linter
      const result = linter.verifyAndFix(code, plugin.configs.recommended, {filename: 'fixture.jsx'})
      expect(result.messages).toEqual([])
      expect(result.output).toContain('<Wrapped />')
      expect(render(result.output, true)).toBe(render(code, true))
    })
  }
  test('keeps then and spread-provided children additive', () => {
    const code = `${branchImport}${declarations}
const props = {children: <Content />}
const view = <Branch if={ok} {...props} then={<Header />} />`
    const linter = new Linter
    const result = linter.verifyAndFix(code, plugin.configs.recommended, {filename: 'fixture.jsx'})
    expect(result.messages).toEqual([])
    expect(render(result.output, true)).toBe('<header>Header</header><main>Content</main>')
    expect(render(result.output, false)).toBe('')
  })
})
