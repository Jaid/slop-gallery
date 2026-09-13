import type {ReactCanvasTextureRecipe} from '../src/react/main.ts'
import type {Texture} from 'three/webgpu'

import {afterEach, beforeEach, expect, mock, test} from 'bun:test'
import {resolve} from 'node:path'

import {canvasFixture, flushPromises} from './canvasFixture.ts'

// A local hook runner exercises setup/cleanup ordering without global React module mocks.
const hooks = `
let state = null, deps, pending, active, cleanup;
export function useState() { return [state, value => { state = value }] }
export function useEffect(effect, next) {
  if (!deps || deps[0] !== next[0]) pending = {effect, deps: next};
}
export function commit() {
  if (!pending) return;
  cleanup?.(); active = pending.effect; deps = pending.deps; pending = null; cleanup = active();
}
export function replay() { cleanup?.(); cleanup = active(); }
export function unmount() { cleanup?.(); cleanup = null; }
export function reset() { unmount(); state = null; deps = null; pending = null; active = null; }
export function readState() { return state; }
`
const build = await Bun.build({
  entrypoints: ['fixture-entry'],
  target: 'bun',
  plugins: [
    {
      name: 'isolated-canvas-hooks',
      setup(builder) {
        builder.onResolve({filter: /^fixture-entry$/u}, () => ({
          path: 'entry',
          namespace: 'fixture',
        }))
        builder.onResolve({filter: /^react$/u}, () => ({
          path: 'react',
          namespace: 'fixture',
        }))
        builder.onLoad({
          filter: /.*/u,
          namespace: 'fixture',
        }, ({path}) => ({
          loader: 'js',
          contents: path === 'react' ? hooks : `
      export {default} from ${JSON.stringify(resolve(import.meta.dir, '../src/react/main.ts').replaceAll('\\', '/'))};
      export {commit, replay, unmount, reset, readState} from 'react';
      import {Texture} from 'three/webgpu';
      export const disposed = [];
      const dispose = Texture.prototype.dispose;
      Texture.prototype.dispose = function() { disposed.push(this); dispose.call(this); };
    `,
        }))
      },
    },
  ],
})
if (!build.success) {
  throw new AggregateError(build.logs, 'Hook fixture build failed.')
}
const harness = await import(`data:text/javascript;base64,${Buffer.from(await build.outputs[0].text()).toString('base64')}`) as {
  commit: () => void
  default: <T>(recipe: ReactCanvasTextureRecipe<T>) => Texture | null
  disposed: Array<Texture>
  readState: () => {texture: Texture} | null
  replay: () => void
  reset: () => void
  unmount: () => void
}
let fixture: ReturnType<typeof canvasFixture>
beforeEach(() => {
  harness.reset()
  harness.disposed.length = 0
  fixture = canvasFixture()
})
afterEach(() => {
  harness.unmount()
  fixture.restore()
})
function recipe(prepare: () => Promise<string>) {
  return {
    width: 4,
    height: 2,
    mipmaps: false,
    prepare,
    draw: mock(() => {}),
  }
}
test('React publishes only the final texture and owns its unmount disposal', async () => {
  const gate = Promise.withResolvers<string>()
  const source = recipe(() => gate.promise)
  expect(harness.default(source)).toBeNull()
  harness.commit()
  expect(fixture.createElement).not.toHaveBeenCalled()
  gate.resolve('final')
  await flushPromises()
  const texture = harness.default(source)
  expect(texture).not.toBeNull()
  expect(source.draw).toHaveBeenCalledTimes(1)
  harness.commit()
  expect(fixture.createElement).toHaveBeenCalledTimes(1)
  harness.unmount()
  expect(harness.disposed).toEqual([texture!])
})
test('an obsolete preparation cannot overwrite a newer texture', async () => {
  const oldGate = Promise.withResolvers<string>()
  const newGate = Promise.withResolvers<string>()
  const oldSource = recipe(() => oldGate.promise)
  const newSource = recipe(() => newGate.promise)
  harness.default(oldSource)
  harness.commit()
  expect(harness.default(newSource)).toBeNull()
  harness.commit()
  newGate.resolve('new')
  await flushPromises()
  const texture = harness.default(newSource)
  oldGate.resolve('old')
  await flushPromises()
  expect(harness.default(newSource)).toBe(texture)
  expect(oldSource.draw).not.toHaveBeenCalled()
  expect(newSource.draw).toHaveBeenCalledTimes(1)
  expect(fixture.createElement).toHaveBeenCalledTimes(1)
})
test('replacement hides and disposes the previous texture instead of returning a stale map', async () => {
  const oldSource = recipe(async () => 'old')
  harness.default(oldSource)
  harness.commit()
  await flushPromises()
  const oldTexture = harness.default(oldSource)
  const newSource = recipe(async () => 'new')
  expect(harness.default(newSource)).toBeNull()
  harness.commit()
  expect(harness.disposed).toEqual([oldTexture!])
  await flushPromises()
  const newTexture = harness.default(newSource)
  expect(newTexture).not.toBe(oldTexture)
  harness.unmount()
  expect(harness.disposed).toEqual([oldTexture!, newTexture!])
})
test('StrictMode setup-cleanup-setup performs only one raster', async () => {
  const gate = Promise.withResolvers<string>()
  const source = recipe(() => gate.promise)
  harness.default(source)
  harness.commit()
  harness.replay()
  gate.resolve('final')
  await flushPromises()
  expect(harness.default(source)).not.toBeNull()
  expect(source.draw).toHaveBeenCalledTimes(1)
  expect(fixture.createElement).toHaveBeenCalledTimes(1)
})
test('unmount while waiting prevents both allocation and state publication', async () => {
  const gate = Promise.withResolvers<string>()
  const source = recipe(() => gate.promise)
  harness.default(source)
  harness.commit()
  harness.unmount()
  gate.resolve('too late')
  await flushPromises()
  expect(harness.readState()).toBeNull()
  expect(source.draw).not.toHaveBeenCalled()
  expect(fixture.createElement).not.toHaveBeenCalled()
})
test('cleanup between texture production and promise consumption disposes the late result', async () => {
  const source = {
    ...recipe(async () => 'ready'),
    draw() {
      queueMicrotask(() => harness.unmount())
    },
  }
  harness.default(source)
  harness.commit()
  await flushPromises()
  expect(fixture.createElement).toHaveBeenCalledTimes(1)
  expect(harness.disposed).toHaveLength(1)
  expect(harness.readState()).toBeNull()
})
test('active failures are reported, while cancelled failures stay silent', async () => {
  const onError = mock(() => {})
  const failure = new Error('failed')
  const source = {
    ...recipe(async () => {
      throw failure
    }),
    onError,
  }
  harness.default(source)
  harness.commit()
  await flushPromises()
  expect(onError).toHaveBeenCalledWith(failure)
  expect(fixture.createElement).not.toHaveBeenCalled()
  const gate = Promise.withResolvers<string>()
  const next = {
    ...recipe(() => gate.promise),
    onError,
  }
  harness.default(next)
  harness.commit()
  harness.unmount()
  gate.reject(failure)
  await flushPromises()
  expect(onError).toHaveBeenCalledTimes(1)
})
