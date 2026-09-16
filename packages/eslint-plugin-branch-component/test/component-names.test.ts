import {describe, expect, test} from 'bun:test'

import {Linter} from 'eslint'

import plugin from '../src/main.ts'

describe('JSX component names', () => {
  for (const [input, output] of [
    ['<Branch if={ok}><_Content /></Branch>', '<Branch if={ok} then={_Content} />'],
    ['<Branch if={ok}><$Content /></Branch>', '<Branch if={ok} then={$Content} />'],
    ['<Branch if={ok} then={<Foo-bar />} />', '<Branch if={ok}><Foo-bar /></Branch>'],
    ['<Branch if={ok} then={<UI.Foo-bar />} />', '<Branch if={ok}><UI.Foo-bar /></Branch>'],
  ]) {
    test(input, () => {
      const prefix = "import Branch from 'branch-component';\n"
      const linter = new Linter
      const result = linter.verifyAndFix(prefix + input, plugin.configs.recommended, {filename: 'fixture.jsx'})
      expect(result.messages).toEqual([])
      expect(result.output).toBe(prefix + output)
      expect(linter.verifyAndFix(result.output, plugin.configs.recommended, {filename: 'fixture.jsx'}).fixed).toBe(false)
    })
  }
})
