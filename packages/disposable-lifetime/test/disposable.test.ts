import {expect, mock, test} from 'bun:test'

import DisposableLifetime from '../src/DisposableLifetime.ts'

test('effect replay retains the resource and final unmount disposes it once', async () => {
  const resource = {dispose: mock(() => {})}
  const lifetime = new DisposableLifetime(resource)
  const first = lifetime.retain()
  first()
  const second = lifetime.retain()
  await Promise.resolve()
  expect(resource.dispose).not.toHaveBeenCalled()
  second()
  expect(resource.dispose).not.toHaveBeenCalled()
  await Promise.resolve()
  expect(resource.dispose).toHaveBeenCalledTimes(1)
  second()
  await Promise.resolve()
  expect(resource.dispose).toHaveBeenCalledTimes(1)
  expect(() => lifetime.retain()).toThrow('disposed')
})
test('replacement releases the old lifetime without disposing the new resource', async () => {
  const oldResource = {dispose: mock(() => {})}
  const newResource = {dispose: mock(() => {})}
  const old = new DisposableLifetime(oldResource)
  const next = new DisposableLifetime(newResource)
  const releaseOld = old.retain()
  releaseOld()
  const releaseNext = next.retain()
  await Promise.resolve()
  expect(oldResource.dispose).toHaveBeenCalledTimes(1)
  expect(newResource.dispose).not.toHaveBeenCalled()
  releaseNext()
  await Promise.resolve()
  expect(newResource.dispose).toHaveBeenCalledTimes(1)
})
test('multiple leases keep the resource alive until every lease is released', async () => {
  const resource = {dispose: mock(() => {})}
  const lifetime = new DisposableLifetime(resource)
  const first = lifetime.retain()
  const second = lifetime.retain()
  first()
  first()
  await Promise.resolve()
  expect(resource.dispose).not.toHaveBeenCalled()
  second()
  await Promise.resolve()
  expect(resource.dispose).toHaveBeenCalledTimes(1)
})
