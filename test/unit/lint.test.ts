import {expect, test} from 'bun:test'

import {warningRegressions} from '../../scripts/lint.ts'

test('lint baseline rejects new files, new rules and increases in existing warnings', () => {
  const baseline = {'old.ts': {style: 2}}
  expect(warningRegressions({'old.ts': {style: 1}}, baseline)).toEqual([])
  expect(warningRegressions({'old.ts': {style: 3}}, baseline)).toHaveLength(1)
  expect(warningRegressions({'old.ts': {other: 1}}, baseline)).toHaveLength(1)
  expect(warningRegressions({'new.ts': {style: 1}}, baseline)).toHaveLength(1)
})
