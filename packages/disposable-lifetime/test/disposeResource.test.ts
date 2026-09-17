import {expect, mock, test} from 'bun:test'

import disposeResource from '../src/disposeResource.ts'

test('uses the native Disposable protocol when available', () => {
  const dispose = mock(() => {})
  const legacyDispose = mock(() => {})
  disposeResource({
    [Symbol.dispose]: dispose,
    dispose: legacyDispose,
  })
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(legacyDispose).not.toHaveBeenCalled()
})
test('adapts dispose-method resources', () => {
  const dispose = mock(() => {})
  disposeResource({dispose})
  expect(dispose).toHaveBeenCalledTimes(1)
})
