import type {LogOptions} from 'victoria-browser-client'

import {expect, test} from 'bun:test'

import VictoriaClient from 'victoria-browser-client'

import ErrorTelemetry, {errorType, parseFrame, parseStack} from '../src/main.ts'

class TestClient extends VictoriaClient {
  readonly logs: Array<{
    message: string
    options: LogOptions
  }> = []
  constructor() {
    super({
      serviceName: 'victoria-browser-errors-test',
      endpoint: 'http://localhost:4318',
      interval: false,
    })
  }
  override log(message: string, options: LogOptions = {}) {
    this.logs.push({
      message,
      options,
    })
    return true
  }
}
const secret = 'secret detail of the failure'
const stackOf = (name: string, frames: Array<string>) => [`${name}: ${secret}`, ...frames].join('\n')
/** an event shaped like the browser’s, which Bun lacks */
const errorEvent = (fields: Partial<ErrorEvent>) => Object.assign(new Event('error'), fields)
const rejectionEvent = (reason: unknown) => Object.assign(new Event('unhandledrejection'), {reason})
test('stack frames are parsed without the message line and without query or fragment', () => {
  expect(parseStack(stackOf('TypeError', [
    '    at Scene.update (https://gallery.test/assets/Scene-abc.js?v=3#x:12:345)',
    '    at async load (https://gallery.test/assets/index-def.js:1:2)',
    '    at https://gallery.test/assets/index-def.js:7:8',
    '    at <anonymous>',
  ]))).toEqual([
    {
      file: 'https://gallery.test/assets/Scene-abc.js',
      line: 12,
      column: 345,
      function: 'Scene.update',
    },
    {
      file: 'https://gallery.test/assets/index-def.js',
      line: 1,
      column: 2,
      function: 'load',
    },
    {
      file: 'https://gallery.test/assets/index-def.js',
      line: 7,
      column: 8,
    },
  ])
  expect(parseFrame('render@https://gallery.test/main.js:3:4')).toEqual({
    file: 'https://gallery.test/main.js',
    line: 3,
    column: 4,
    function: 'render',
  })
  expect(parseStack(undefined)).toEqual([])
})
test('thrown values are typed by their error name, or by what they are', () => {
  expect(errorType(new RangeError('x'))).toBe('RangeError')
  expect(errorType(new DOMException('x', 'AbortError'))).toBe('AbortError')
  expect(errorType('just a string')).toBe('string')
  expect(errorType(null)).toBe('null')
  expect(errorType(undefined)).toBe('undefined')
})
test('uncaught errors and unhandled rejections are logged without their messages', () => {
  const telemetry = new TestClient
  const target = new EventTarget
  const context = {
    traceId: '0123456789abcdef0123456789abcdef',
    spanId: '0123456789abcdef',
  }
  const errors = new ErrorTelemetry({
    telemetry,
    target,
    eventNamePrefix: 'app.',
    attributes: () => ({room: 'lobby'}),
    getContext: () => context,
  })
  const stop = errors.connect()
  const thrown = new TypeError(secret)
  thrown.stack = stackOf('TypeError', ['    at tick (https://gallery.test/assets/index.js:4:56)'])
  target.dispatchEvent(errorEvent({
    error: thrown,
    filename: 'https://gallery.test/assets/index.js?token=1',
    lineno: 4,
    colno: 50,
  }))
  const rejected = new RangeError(secret)
  rejected.stack = stackOf('RangeError', ['    at fetchImage (https://gallery.test/assets/ai.js:9:10)', '    at async run (https://gallery.test/assets/ai.js:20:1)'])
  target.dispatchEvent(rejectionEvent(rejected))
  target.dispatchEvent(rejectionEvent(secret))
  // a script of another origin
  target.dispatchEvent(errorEvent({
    error: null,
    filename: '',
    lineno: 0,
    colno: 0,
  }))
  stop()
  target.dispatchEvent(rejectionEvent(rejected))
  expect(JSON.stringify(telemetry.logs)).not.toContain(secret)
  expect(JSON.stringify(telemetry.logs)).not.toContain('token')
  expect(telemetry.logs.map(({message}) => message)).toEqual([
    'Uncaught TypeError at https://gallery.test/assets/index.js:4:50',
    'Unhandled rejection: RangeError at https://gallery.test/assets/ai.js:9:10',
    'Unhandled rejection: string',
    'Uncaught UnknownError',
  ])
  expect(telemetry.logs[0].options).toEqual({
    level: 'error',
    attributes: {
      room: 'lobby',
      'event.name': 'app.error.uncaught',
      'error.type': 'TypeError',
      'error.occurrence': 1,
      'code.file.path': 'https://gallery.test/assets/index.js',
      'code.line.number': 4,
      'code.column.number': 50,
      'code.stacktrace': 'tick (https://gallery.test/assets/index.js:4:56)',
    },
    context,
  })
  expect(telemetry.logs[1].options.attributes).toMatchObject({
    'event.name': 'app.error.unhandled_rejection',
    'code.function.name': 'fetchImage',
    'code.stacktrace': 'fetchImage (https://gallery.test/assets/ai.js:9:10)\nrun (https://gallery.test/assets/ai.js:20:1)',
  })
  expect(telemetry.logs[2].options.attributes).not.toHaveProperty('code.file.path')
})
test('the same error logs only up to its limit, while others still log', () => {
  const telemetry = new TestClient
  const target = new EventTarget
  const errors = new ErrorTelemetry({
    telemetry,
    target,
    limit: 3,
  })
  const stop = errors.connect()
  const repeated = new Error('x')
  repeated.stack = 'Error: x\n    at frame (https://gallery.test/a.js:1:1)'
  for (let index = 0; index < 5; index++) {
    target.dispatchEvent(rejectionEvent(repeated))
  }
  target.dispatchEvent(rejectionEvent(new SyntaxError('y')))
  stop()
  expect(telemetry.logs.map(({options}) => [options.attributes?.['event.name'], options.attributes?.['error.type'], options.attributes?.['error.occurrence']])).toEqual([
    ['error.unhandled_rejection', 'Error', 1],
    ['error.unhandled_rejection', 'Error', 2],
    ['error.unhandled_rejection', 'Error', 3],
    ['error.unhandled_rejection', 'SyntaxError', 1],
  ])
})
test('a failing telemetry client is swallowed instead of raising another error', () => {
  const errors = new ErrorTelemetry({
    telemetry: {
      log: () => {
        throw new Error('delivery broke')
      },
    },
    target: new EventTarget,
  })
  expect(errors.record('uncaught', new Error('x'))).toBe(false)
})
