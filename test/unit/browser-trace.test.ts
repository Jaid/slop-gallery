import {expect, test} from 'bun:test'
import {resolve} from 'node:path'

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
    const eventCount = await encodeTraceJsonAsMessagePack(input, output, consoleEvents)
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
      },
      consoleEvents,
    })
  } finally {
    await fs.remove(root)
  }
})
