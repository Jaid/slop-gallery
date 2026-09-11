import type {IrisLatencyTurn} from './lib/knots/measureIrisLatency.ts'

import {resolve} from 'node:path'

import fs from 'fs-extra'

import measureIrisLatency from './lib/knots/measureIrisLatency.ts'
import {auditionTranscript} from './lib/knots/voiceAuditions.ts'

export default async function benchmarkIrisLatency({key = Bun.env.XAI_API_KEY, output = resolve(import.meta.dir, '../private/iris-quality/latency')} = {}) {
  if (!key) {
    throw new Error('XAI_API_KEY is missing.')
  }
  await fs.ensureDir(output)
  const results = []
  for (const [index, text] of auditionTranscript.entries()) {
    for (const timestamps of index % 2 ? [false, true] : [true, false]) {
      const directory = resolve(output, `${index + 1}-timestamps-${timestamps}`)
      await fs.ensureDir(directory)
      const result = resolve(directory, 'result.json')
      if (!await fs.pathExists(result)) {
        await fs.writeJson(resolve(directory, 'request.json'), {
          text,
          timestamps,
          sampleRate: 48_000,
          optimizeStreamingLatency: 0,
          turns: 2,
          startedAt: (new Date).toISOString(),
        }, {
          spaces: 2,
          flag: 'wx',
        })
        await fs.writeJson(result, await measureIrisLatency(text, timestamps, key), {spaces: 2})
      }
      const turns = await fs.readJson(result) as Array<IrisLatencyTurn>
      for (const turn of turns) {
        const {events, ...timing} = turn
        results.push({
          ...timing,
          timestamps,
          firstPlayableIncludingConnectMs: timing.firstPlayableMs + (timing.warm ? 0 : timing.handshakeMs),
          traceId: events.find(item => item.event.type === 'audio.done')?.event.trace_id,
        })
      }
    }
  }
  await fs.writeJson(resolve(output, 'summary.json'), results, {spaces: 2})
  console.table(results)
  return results
}

if (import.meta.main) {
  await benchmarkIrisLatency()
}
