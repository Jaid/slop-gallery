import {describe, expect, test} from 'bun:test'

import {transformSync} from '@babel/core'

import bakeBranchComponent from '../src/main.ts'

const compile = (source: string) => transformSync(source, {
  babelrc: false,
  configFile: false,
  parserOpts: {plugins: ['jsx', 'typescript']},
  plugins: [bakeBranchComponent],
})?.code ?? ''
describe('Branch compilation', () => {
  test('compiles scalar conditions and removes the runtime import', () => {
    const code = compile(`
      import Branch from 'branch-component'
      const view = <Branch if={visible} not={disabled}><Thing /></Branch>
    `)
    expect(code).not.toContain('branch-component')
    expect(code).toContain('visible && !disabled ? <Thing /> : null')
  })
  test('compiles collection conditions with the documented Boolean semantics', () => {
    const code = compile(`
      import B from 'branch-component'
      const view = <B some={some} none={none} all={all}>ready</B>
    `)
    expect(code).toContain('some?.some(Boolean) && !none?.some(Boolean) && all?.every(Boolean) ? "ready" : null')
  })
  test('makes selected outputs lazy while preserving function-as-component output semantics', () => {
    const code = compile(`
      import Branch from 'branch-component'
      const view = <Branch if={ready} then={Success} else={fallback()} />
    `)
    expect(code).not.toContain('branch-component')
    expect(code).toContain('ready ? _renderBranchOutput(Success) : _renderBranchOutput(fallback())')
    expect(code).toContain('typeof _output === "function" ? _createElement(_output) : _output ?? null')
  })
  test('renders then before children in a fragment', () => {
    const code = compile(`
      import Branch from 'branch-component'
      const view = <Branch if={ready} then={Header}><Content /></Branch>
    `)
    expect(code).toContain('ready ? <>{_renderBranchOutput(Header)}<Content /></> : null')
  })
  test('compiles nested branches from the inside out', () => {
    const code = compile(`
      import Branch from 'branch-component'
      const view = <Branch if={outer}><Branch if={inner}><Thing /></Branch></Branch>
    `)
    expect(code).not.toContain('<Branch')
    expect(code).toContain('outer ? inner ? <Thing /> : null : null')
  })
  test('does not rewrite a shadowed Branch binding', () => {
    const code = compile(`
      import Branch from 'branch-component'
      const render = Branch => <Branch if={visible} />
      const view = <Branch if={visible}><Thing /></Branch>
    `)
    expect(code).not.toContain('branch-component')
    expect(code).toContain('Branch => <Branch if={visible} />')
    expect(code).toContain('const view = visible ? <Thing /> : null')
  })
  test('rejects spread attributes', () => {
    expect(() => compile(`
      import Branch from 'branch-component'
      const view = <Branch {...props}><Thing /></Branch>
    `)).toThrow('Branch does not support spread attributes when compiled.')
  })
})
