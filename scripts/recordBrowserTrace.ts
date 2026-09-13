import {mkdir, open, rename, rm} from 'node:fs/promises'
import {resolve} from 'node:path'
import {parseArgs} from 'node:util'

import getFree from 'get-free'

const categories = [
  'devtools.timeline',
  'v8.execute',
  'toplevel',
  'blink.console',
  'blink.user_timing',
  'latencyInfo',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.stack',
  'disabled-by-default-devtools.timeline.invalidationTracking',
  'disabled-by-default-v8.cpu_profiler',
  'disabled-by-default-v8.cpu_profiler.hires',
]
const help = `Usage: bun scripts/recordBrowserTrace.ts [options]

Records a Chromium/Brave performance trace through the browser CDP endpoint.
Press Enter or Ctrl+C to stop and save the trace.

Options:
  --port <number>       CDP port. Default: 9223
  --buffer-mib <number> Trace buffer size in MiB. Default: 1024
  --help                Show this help

Output:
  ../temp/trace.json5 relative to this script, with numeric increments
  (trace2.json5, trace3.json5, …) chosen via get-free.
`

type Pending = {
  reject: (error: Error) => void
  resolve: (value: any) => void
}

export default async function recordBrowserTrace({port = 9223,
  bufferMiB = 1024}: {
  bufferMiB?: number
  port?: number
} = {}) {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('port must be an integer between 1 and 65535.')
  }
  if (!Number.isSafeInteger(bufferMiB) || bufferMiB < 1) {
    throw new TypeError('bufferMiB must be a positive integer.')
  }
  const outputRoot = resolve(import.meta.dir, '../temp')
  await mkdir(outputRoot, {recursive: true})
  const outputName = await getFree('trace', candidate => Bun.file(resolve(outputRoot, `${candidate}.json5`)).exists())
  const output = resolve(outputRoot, `${outputName}.json5`)
  const versionResponse = await fetch(`http://127.0.0.1:${port}/json/version`)
  if (!versionResponse.ok) {
    throw new Error(`CDP /json/version returned HTTP ${versionResponse.status}.`)
  }
  const version = await versionResponse.json() as {
    Browser?: string
    webSocketDebuggerUrl?: string
  }
  if (!version.webSocketDebuggerUrl) {
    throw new Error(`No browser CDP WebSocket found on port ${port}.`)
  }
  const socket = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise<void>((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', () => resolveOpen(), {once: true})
    socket.addEventListener('error', () => rejectOpen(new Error('CDP WebSocket connection failed.')), {once: true})
  })
  let nextId = 0
  const pending = new Map<number, Pending>
  let tracingCompleteResolve!: (stream: string) => void
  let tracingCompleteReject!: (error: Error) => void
  const tracingComplete = new Promise<string>((resolveComplete, rejectComplete) => {
    tracingCompleteResolve = resolveComplete
    tracingCompleteReject = rejectComplete
  })
  const call = (method: string, params: unknown = {}) => {
    const id = ++nextId
    return new Promise<any>((resolveCall, rejectCall) => {
      pending.set(id, {
        resolve: resolveCall,
        reject: rejectCall,
      })
      socket.send(JSON.stringify({
        id,
        method,
        params,
      }))
    })
  }
  let stopRequested = false
  const requestStop = async (reason: string) => {
    if (stopRequested) {
      return
    }
    stopRequested = true
    console.error(`Stopping trace (${reason})…`)
    await call('Tracing.end')
  }
  socket.addEventListener('message', message => {
    try {
      const data = JSON.parse(String(message.data)) as {
        error?: {code: number
          message: string}
        id?: number
        method?: string
        params?: {
          percentFull?: number
          stream?: string
          value?: number
        }
        result?: unknown
      }
      if (data.id !== undefined) {
        const entry = pending.get(data.id)
        if (!entry) {
          return
        }
        pending.delete(data.id)
        if (data.error) {
          entry.reject(new Error(`${data.error.code}: ${data.error.message}`))
        } else {
          entry.resolve(data.result)
        }
        return
      }
      if (data.method === 'Tracing.bufferUsage') {
        const value = data.params?.percentFull ?? data.params?.value
        if (typeof value === 'number') {
          const percent = value * 100
          console.error(`Buffer: ${percent.toFixed(1)}%`)
          if (percent >= 99.5) {
            void requestStop('buffer full').catch(tracingCompleteReject)
          }
        }
      } else if (data.method === 'Tracing.tracingComplete') {
        const stream = data.params?.stream
        if (stream) {
          tracingCompleteResolve(stream)
        } else {
          tracingCompleteReject(new Error('Tracing completed without an IO stream handle.'))
        }
      }
    } catch (error) {
      tracingCompleteReject(error instanceof Error ? error : new Error(String(error)))
    }
  })
  socket.addEventListener('close', () => {
    const error = new Error('CDP WebSocket closed before the trace was saved.')
    for (const {reject} of pending.values()) {
      reject(error)
    }
    pending.clear()
    tracingCompleteReject(error)
  }, {once: true})
  await call('Tracing.start', {
    transferMode: 'ReturnAsStream',
    bufferUsageReportingInterval: 5000,
    traceConfig: {
      recordMode: 'recordUntilFull',
      traceBufferSizeInKb: bufferMiB * 1024,
      enableSystrace: false,
      enableArgumentFilter: false,
      includedCategories: categories,
    },
  })
  console.error(`Recording ${version.Browser ?? 'Brave/Chromium'} on :${port}`)
  console.error(`Buffer: ${bufferMiB} MiB`)
  console.error(`Output: ${output}`)
  console.error('Press Enter or Ctrl+C to stop.')
  process.stdin.resume()
  process.stdin.once('data', () => {
    void requestStop('Enter pressed').catch(tracingCompleteReject)
  })
  process.once('SIGINT', () => {
    void requestStop('Ctrl+C').catch(tracingCompleteReject)
  })
  const stream = await tracingComplete
  process.stdin.pause()
  const temporary = `${output}.partial`
  await rm(temporary, {force: true})
  const file = await open(temporary, 'w')
  let bytes = 0
  try {
    while (true) {
      const chunk = await call('IO.read', {
        handle: stream,
        size: 16 * 1024 * 1024,
      }) as {
        base64Encoded?: boolean
        data: string
        eof?: boolean
      }
      const data = chunk.base64Encoded ? Buffer.from(chunk.data, 'base64') : Buffer.from(chunk.data, 'utf8')
      if (data.length) {
        await file.write(data)
        bytes += data.length
      }
      if (chunk.eof) {
        break
      }
    }
  } finally {
    await file.close()
    try {
      await call('IO.close', {handle: stream})
    } catch {}
  }
  await rm(output, {force: true})
  await rename(temporary, output)
  socket.close()
  console.error(`Saved ${output} (${(bytes / 1024 / 1024).toFixed(1)} MiB)`)
  return output
}

if (import.meta.main) {
  const {values} = parseArgs({
    args: Bun.argv.slice(2),
    strict: true,
    allowPositionals: false,
    options: {
      port: {
        type: 'string',
        default: '9223',
      },
      'buffer-mib': {
        type: 'string',
        default: '1024',
      },
      help: {type: 'boolean'},
    },
  })
  if (values.help) {
    console.log(help)
  } else {
    await recordBrowserTrace({
      port: Number(values.port),
      bufferMiB: Number(values['buffer-mib']),
    })
  }
}
