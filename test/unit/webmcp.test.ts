import type {WebmcpBridge} from '../../src/lib/webmcp/tools.ts'

import {expect, test} from 'bun:test'

import registerWebmcp from '../../src/lib/webmcp/register.ts'
import createWebmcpTools from '../../src/lib/webmcp/tools.ts'

const bridge: WebmcpBridge = {
  getAim: () => ({
    origin: {
      x: 0,
      y: 1,
      z: 2,
    },
    direction: {
      x: 0,
      y: 0,
      z: -1,
    },
    hit: null,
    hits: [],
  }),
  getTelemetry: () => null,
}
test('WebMCP tools are read-only, validate input and read the current bridge', () => {
  let current = bridge
  const tools = createWebmcpTools(() => current)
  const controller = new AbortController
  expect(tools.map(tool => tool.name)).toEqual(['get_aim', 'get_telemetry'])
  for (const tool of tools) {
    expect(tool.annotations?.readOnlyHint).toBe(true)
    expect(() => tool.execute({unexpected: true}, {signal: controller.signal})).toThrow(TypeError)
  }
  expect(tools[0].execute({}, {signal: controller.signal})).toEqual(bridge.getAim())
  current = {
    ...bridge,
    getAim: () => ({
      ...bridge.getAim(),
      origin: {
        x: 3,
        y: 4,
        z: 5,
      },
    }),
  }
  expect(tools[0].execute({}, {signal: controller.signal})).toEqual(current.getAim())
  expect(tools[1].execute({}, {signal: controller.signal})).toBeNull()
  controller.abort()
  expect(() => tools[0].execute({}, {signal: controller.signal})).toThrow()
})
test('registrations clean up on unmount, failure and cancellation during registration', async () => {
  for (const mode of ['success', 'failure', 'abort'] as const) {
    const controller = new AbortController
    const signals: Array<AbortSignal> = []
    const context = {
      registerTool: async (_tool: WebMCP.ModelContextTool, options: WebMCP.ModelContextRegisterToolOptions) => {
        signals.push(options.signal!)
        if (signals.length === 2 && mode === 'failure') {
          throw new Error('Registration failed')
        }
        if (mode === 'abort') {
          controller.abort()
        }
      },
    } as WebMCP.ModelContext
    const registered = registerWebmcp(() => bridge, controller.signal, context)
    if (mode === 'success') {
      const cleanup = await registered
      expect(signals).toHaveLength(2)
      expect(signals[0].aborted).toBe(false)
      cleanup()
      cleanup()
    } else {
      await expect(registered).rejects.toThrow()
    }
    expect(signals.every(signal => signal.aborted)).toBe(true)
  }
})
test('an already aborted mount never registers tools', async () => {
  const controller = new AbortController
  controller.abort()
  const cleanup = await registerWebmcp(() => bridge, controller.signal, {
    registerTool: () => {
      throw new Error('Must not register')
    },
  } as unknown as WebMCP.ModelContext)
  expect(cleanup).toBeFunction()
})
