import {expect, test} from 'bun:test'
import {resolve} from 'node:path'
import {createGunzip, gzipSync} from 'node:zlib'

import fs from 'fs-extra'
import {unpack} from 'msgpackr'

import {encodeTraceJsonAsMessagePack} from '../../scripts/recordBrowserTrace.ts'

test('encodes Chromium compact metadata footers without mistaking event metadata for the footer', async () => {
  const root = await fs.mkdtemp(resolve(import.meta.dir, '../../private/agent/browser-trace-test-'))
  const input = resolve(root, 'trace.json')
  const output = resolve(root, 'trace.msgpack')
  try {
    await fs.writeFile(input, '{"traceEvents":[{"name":"first","args":{"items":[],"metadata":{"nested":true}}},\n{"name":"second","args":{}}],"metadata":{"clock-domain":"MONOTONIC","perfetto_trace_stats":{"total_buffers":1}}}')
    const consoleEvents = [{
      method: 'Runtime.consoleAPICalled' as const,
      params: {
        type: 'error',
        args: [{
          type: 'string',
          value: 'boom',
        }],
        timestamp: 1234,
      },
      sessionId: 'page-session',
    }]
    const eventCount = await encodeTraceJsonAsMessagePack(input, output, consoleEvents, {
      Browser: 'Chrome/153.0.8010.37',
      CommandLine: String.raw`"C:\portable\brave\brave.exe" --remote-debugging-port=9222`,
      'V8-Version': '15.3.76.10',
    })
    expect(eventCount).toBe(2)
    expect(unpack(await fs.readFile(output))).toEqual({
      traceEvents: [
        {
          name: 'first',
          args: {
            items: [],
            metadata: {nested: true},
          },
        },
        {
          name: 'second',
          args: {},
        },
      ],
      metadata: {
        'clock-domain': 'MONOTONIC',
        perfetto_trace_stats: {total_buffers: 1},
        Browser: 'Chrome/153.0.8010.37',
        CommandLine: String.raw`"C:\portable\brave\brave.exe" --remote-debugging-port=9222`,
        'V8-Version': '15.3.76.10',
      },
      consoleEvents,
    })
  } finally {
    await fs.remove(root)
  }
})
test('accepts Chromium footers without metadata and preserves extra top-level fields', async () => {
  const root = await fs.mkdtemp(resolve(import.meta.dir, '../../private/agent/browser-trace-footer-test-'))
  const input = resolve(root, 'trace.json')
  const output = resolve(root, 'trace.msgpack')
  try {
    await fs.writeFile(input, '{"traceEvents":[{"name":"final","args":{"nested":[1,{"closingBracket":"]"}]}}],"systemTraceEvents":{"source":"etw"}}')
    expect(await encodeTraceJsonAsMessagePack(input, output)).toBe(1)
    expect(unpack(await fs.readFile(output))).toEqual({
      traceEvents: [{
        name: 'final',
        args: {
          nested: [1, {closingBracket: ']'}],
        },
      }],
      systemTraceEvents: {source: 'etw'},
      consoleEvents: [],
    })
  } finally {
    await fs.remove(root)
  }
})
test('encodes a gzip Chromium trace stream across chunk boundaries', async () => {
  const root = await fs.mkdtemp(resolve(import.meta.dir, '../../private/agent/browser-trace-gzip-test-'))
  const output = resolve(root, 'trace.msgpack')
  const json = '{"traceEvents":[{"name":"streamed","args":{}}],"metadata":{"clock-domain":"MONOTONIC"}}'
  try {
    const compressed = gzipSync(json)
    const gunzip = createGunzip()
    const encoding = encodeTraceJsonAsMessagePack(gunzip, output)
    const split = Math.floor(compressed.length / 2)
    gunzip.write(compressed.subarray(0, split))
    gunzip.end(compressed.subarray(split))
    expect(await encoding).toBe(1)
    expect(unpack(await fs.readFile(output))).toEqual({
      traceEvents: [{
        name: 'streamed',
        args: {},
      }],
      metadata: {'clock-domain': 'MONOTONIC'},
      consoleEvents: [],
    })
  } finally {
    await fs.remove(root)
  }
})
