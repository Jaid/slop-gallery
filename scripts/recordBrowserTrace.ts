import {createReadStream, createWriteStream} from 'node:fs'
import {mkdir, open, rename, rm, stat} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createInterface} from 'node:readline'
import {pipeline} from 'node:stream/promises'
import {parseArgs} from 'node:util'
import {createBrotliCompress, constants as zlibConstants} from 'node:zlib'

import getFree from 'get-free'
import {Packr} from 'msgpackr'

const categories = [
  'devtools.timeline',
  'v8',
  'v8.execute',
  'toplevel',
  'blink.user_timing',
  'loading',
  'latencyInfo',
  'graphics.pipeline',
  'gpu',
  'viz',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.stack',
  'disabled-by-default-devtools.timeline.inputs',
  'disabled-by-default-gpu.dawn',
  'disabled-by-default-v8.cpu_profiler',
]
const help = `Usage: bun scripts/recordBrowserTrace.ts [options]

Records a Chromium/Brave performance trace through the browser CDP endpoint.
Press Enter or Ctrl+C to stop and save the trace.

Options:
  --port <number>       CDP port. Default: 9222
  --buffer-mib <number> Trace buffer size in MiB. Default: 1024
  --help                Show this help

Output:
  ../temp/trace.msgpack.br relative to this script, with numeric increments
  (trace2.msgpack.br, trace3.msgpack.br, …) chosen via get-free.
`
const traceEventsPrefixPattern = /^\s*\{\s*"traceEvents"\s*:\s*\[/
const metadataMarkerPattern = /^(.*)\],\s*"metadata"\s*:\s*$/
const messagePack = new Packr({
  useRecords: false,
  variableMapSize: true,
})
type Pending = {
  reject: (error: Error) => void
  resolve: (value: any) => void
}
async function encodeTraceJsonAsMessagePack(input: string, output: string) {
  const source = createReadStream(input, {encoding: 'utf8'})
  const lines = createInterface({
    input: source,
    crlfDelay: Infinity,
  })
  const file = await open(output, 'w')
  let position = 0
  let bufferedBytes = 0
  let buffers: Array<Uint8Array> = []
  const flush = async () => {
    if (!bufferedBytes) {
      return
    }
    const data = Buffer.concat(buffers, bufferedBytes)
    let offset = 0
    while (offset < data.byteLength) {
      const {bytesWritten} = await file.write(data, offset)
      if (!bytesWritten) {
        throw new Error('Failed to write MessagePack trace.')
      }
      offset += bytesWritten
    }
    buffers = []
    bufferedBytes = 0
  }
  const write = async (data: Uint8Array) => {
    buffers.push(data)
    bufferedBytes += data.byteLength
    position += data.byteLength
    if (bufferedBytes >= 4 * 1024 * 1024) {
      await flush()
    }
  }
  let eventCount = 0
  let sawHeader = false
  let sawMetadata = false
  const metadataLines: Array<string> = []
  try {
    await write(Uint8Array.of(0x82))
    await write(messagePack.pack('traceEvents'))
    const eventCountOffset = position + 1
    await write(Uint8Array.of(0xDD, 0, 0, 0, 0))
    const writeEvent = async (line: string) => {
      let json = line.trim()
      if (!json) {
        return
      }
      if (json.endsWith(',')) {
        json = json.slice(0, -1)
      }
      await write(messagePack.pack(JSON.parse(json)))
      eventCount++
    }
    for await (let line of lines) {
      if (!sawHeader) {
        const header = traceEventsPrefixPattern.exec(line)
        if (header) {
          line = line.slice(header[0].length)
        } else if (!line.trim()) {
          continue
        } else if (!line.trimStart().startsWith('{')) {
          throw new Error(`Unexpected Chromium trace JSON header: ${JSON.stringify(line.slice(0, 200))}`)
        }
        sawHeader = true
      }
      if (!sawMetadata) {
        const metadataMarker = metadataMarkerPattern.exec(line)
        if (metadataMarker) {
          await writeEvent(metadataMarker[1])
          sawMetadata = true
        } else {
          await writeEvent(line)
        }
      } else {
        metadataLines.push(line)
      }
    }
    if (!sawMetadata) {
      throw new Error('Chromium trace JSON ended without metadata.')
    }
    const metadataWithOuterBrace = metadataLines.join('\n').trim()
    if (!metadataWithOuterBrace.endsWith('}')) {
      throw new Error('Unexpected Chromium trace JSON footer.')
    }
    const metadataJson = metadataWithOuterBrace.slice(0, -1).trimEnd()
    await write(messagePack.pack('metadata'))
    await write(messagePack.pack(JSON.parse(metadataJson)))
    await flush()
    const count = Buffer.allocUnsafe(4)
    count.writeUInt32BE(eventCount)
    await file.write(count, 0, count.byteLength, eventCountOffset)
  } finally {
    lines.close()
    await file.close()
  }
  return eventCount
}
async function brotliCompressFile(input: string, output: string) {
  const {size} = await stat(input)
  await pipeline(createReadStream(input), createBrotliCompress({
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 6,
      [zlibConstants.BROTLI_PARAM_SIZE_HINT]: size,
    },
  }), createWriteStream(output))
}

export default async function recordBrowserTrace({port = 9222,
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
  const outputName = await getFree('trace', candidate => Bun.file(resolve(outputRoot, `${candidate}.msgpack.br`)).exists())
  const output = resolve(outputRoot, `${outputName}.msgpack.br`)
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
      tracingCompleteReject(Error.isError(error) ? error : new Error(String(error)))
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
  const traceJsonTemporary = `${output}.json.partial`
  const messagePackTemporary = `${output}.msgpack.partial`
  const compressedTemporary = `${output}.partial`
  await rm(traceJsonTemporary, {force: true})
  await rm(messagePackTemporary, {force: true})
  await rm(compressedTemporary, {force: true})
  const file = await open(traceJsonTemporary, 'w')
  let traceJsonBytes = 0
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
        traceJsonBytes += data.length
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
    socket.close()
  }
  try {
    const eventCount = await encodeTraceJsonAsMessagePack(traceJsonTemporary, messagePackTemporary)
    await brotliCompressFile(messagePackTemporary, compressedTemporary)
    await rm(output, {force: true})
    await rename(compressedTemporary, output)
    const {size} = await stat(output)
    console.error(`Saved ${output} (${(size / 1024 / 1024).toFixed(1)} MiB, ${eventCount.toLocaleString()} events; source JSON ${(traceJsonBytes / 1024 / 1024).toFixed(1)} MiB)`)
  } finally {
    await rm(traceJsonTemporary, {force: true})
    await rm(messagePackTemporary, {force: true})
    await rm(compressedTemporary, {force: true})
  }
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
        default: '9222',
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
