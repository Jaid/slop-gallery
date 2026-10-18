import {expect, mock, test} from 'bun:test'

import disposeResource from '../src/disposeResource.ts'

test('uses the native Disposable protocol when available', () => {
  const dispose = mock(() => {})
  const methodDispose = mock(() => {})
  disposeResource({
    [Symbol.dispose]: dispose,
    dispose: methodDispose,
  })
  expect(dispose).toHaveBeenCalledTimes(1)
  expect(methodDispose).not.toHaveBeenCalled()
})
test('adapts dispose-method resources', () => {
  const dispose = mock(() => {})
  disposeResource({dispose})
  expect(dispose).toHaveBeenCalledTimes(1)
})
