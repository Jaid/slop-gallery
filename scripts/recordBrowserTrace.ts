import {once} from 'node:events'
import {createReadStream, createWriteStream} from 'node:fs'
import {mkdir, open, rename, rm, stat} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createInterface} from 'node:readline'
import type {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {parseArgs} from 'node:util'
import {createBrotliCompress, createGunzip, constants as zlibConstants} from 'node:zlib'

import getFree from 'get-free'
import {Packr} from 'msgpackr'

const categories = [
  'blink.user_timing',
  'cc',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.inputs',
  'disabled-by-default-devtools.timeline.stack',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-display.framedisplayed',
  'disabled-by-default-gpu.dawn',
  'disabled-by-default-v8.cpu_profiler',
  'disabled-by-default-webgpu',
  'gpu',
  'graphics.pipeline',
  'input.scrolling',
  'input',
  'latencyInfo',
  'loading',
  'memory_pressure',
  'renderer.scheduler.status',
  'renderer.scheduler',
  'scheduler.long_tasks',
  'toplevel',
  'v8.execute',
  'v8',
  'viz',
]
const help = `Usage: bun scripts/recordBrowserTrace.ts [options]

Records a Chromium/Brave performance trace through the browser CDP endpoint.
Press Enter or Ctrl+C to stop and save the trace.

Options:
  --port <number>       CDP port. Default: 9222
  --buffer <number>     Trace buffer size in bytes. Default: 4000000000
  --reload <boolean>    Reload the target page when tracing begins. Default: false
  --help                Show this help

Output:
  ../temp/trace.msgpack.br relative to this script, with numeric increments
  (trace2.msgpack.br, trace3.msgpack.br, …) chosen via get-free.
`
const traceEventsPrefixPattern = /^\s*\{\s*"traceEvents"\s*:\s*\[/
const messagePack = new Packr({
  useRecords: false,
  variableMapSize: true,
})
export type BrowserConsoleEvent = {
  method: ConsoleEventMethod
  params: unknown
  sessionId?: string
}
type ConsoleEventMethod = 'Log.entryAdded' | 'Runtime.consoleAPICalled' | 'Runtime.exceptionThrown'
type Pending = {
  reject: (error: Error) => void
  resolve: (value: any) => void
}
const consoleEventMethods = new Set<string>(['Log.entryAdded', 'Runtime.consoleAPICalled', 'Runtime.exceptionThrown'])
const isConsoleEventMethod = (method: string | undefined): method is ConsoleEventMethod => method !== undefined && consoleEventMethods.has(method)
const findJsonValueEnd = (json: string) => {
  const first = json[0]
  if (first !== '{' && first !== '[') {
    return -1
  }
  const stack = [first]
  let inString = false
  let escaped = false
  for (let index = 1; index < json.length; index++) {
    const character = json[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }
    if (character === '"') {
      inString = true
    } else if (character === '{' || character === '[') {
      stack.push(character)
    } else if (character === '}' || character === ']') {
      const opener = stack.pop()
      if (character === '}' && opener !== '{' || character === ']' && opener !== '[') {
        return -1
      }
      if (!stack.length) {
        return index + 1
      }
    }
  }
  return -1
}
export default async function recordBrowserTrace({port = 9222,
  buffer = 4_000_000_000,
  reload = false}: {
  buffer?: number
  port?: number
  reload?: boolean
} = {}) {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('port must be an integer between 1 and 65535.')
  }
  if (!Number.isSafeInteger(buffer) || buffer < 1) {
    throw new TypeError('buffer must be a positive integer.')
  }
  if (typeof reload !== 'boolean') {
    throw new TypeError('reload must be a boolean.')
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
    'V8-Version'?: string
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
  const consoleEvents: Array<BrowserConsoleEvent> = []
  let captureConsoleEvents = false
  let tracingCompleteResolve!: (stream: string) => void
  let tracingCompleteReject!: (error: Error) => void
  const tracingComplete = new Promise<string>((resolveComplete, rejectComplete) => {
    tracingCompleteResolve = resolveComplete
    tracingCompleteReject = rejectComplete
  })
  const call = (method: string, params: unknown = {}, sessionId?: string) => {
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
        sessionId,
      }))
    })
  }
  let stopRequested = false
  const requestStop = async (reason: string) => {
    if (stopRequested) {
      return
    }
    stopRequested = true
    captureConsoleEvents = false
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
          [key: string]: unknown
          percentFull?: number
          stream?: string
          value?: number
        }
        result?: unknown
        sessionId?: string
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
      if (captureConsoleEvents && isConsoleEventMethod(data.method)) {
        const consoleEvent: BrowserConsoleEvent = {
          method: data.method,
          params: data.params ?? {},
        }
        if (data.sessionId) {
          consoleEvent.sessionId = data.sessionId
        }
        consoleEvents.push(consoleEvent)
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
        captureConsoleEvents = false
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
  const {targetInfos} = await call('Target.getTargets') as {
    targetInfos: Array<{
      targetId: string
      type: string
      url: string
    }>
  }
  const pageTarget = targetInfos.find(target => target.type === 'page')
  if (!pageTarget) {
    throw new Error('No page target found for console capture.')
  }
  const {sessionId: pageSessionId} = await call('Target.attachToTarget', {
    targetId: pageTarget.targetId,
    flatten: true,
  }) as {sessionId: string}
  await Promise.all([
    call('Runtime.enable', {}, pageSessionId),
    call('Log.enable', {}, pageSessionId),
  ])
  await call('Tracing.start', {
    transferMode: 'ReturnAsStream',
    streamCompression: 'gzip',
    bufferUsageReportingInterval: 5000,
    traceConfig: {
      recordMode: 'recordUntilFull',
      traceBufferSizeInKb: Math.ceil(buffer / 1024),
      enableSystrace: false,
      enableArgumentFilter: false,
      includedCategories: categories,
    },
  })
  captureConsoleEvents = true
  if (reload) {
    await call('Page.reload', {}, pageSessionId)
    console.error(`Reloaded ${pageTarget.url || 'page target'}`)
  }
  console.error(`Recording ${version.Browser ?? 'Brave/Chromium'} on :${port}`)
  console.error(`Buffer: ${buffer.toLocaleString()} bytes`)
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
  const messagePackTemporary = `${output}.msgpack.partial`
  const compressedTemporary = `${output}.partial`
  await rm(messagePackTemporary, {force: true})
  await rm(compressedTemporary, {force: true})
  const gunzip = createGunzip()
  let compressedTraceBytes = 0
  const encoding = encodeTraceJsonAsMessagePack(gunzip, messagePackTemporary, consoleEvents, {
    Browser: version.Browser,
    'V8-Version': version['V8-Version'],
  })
  const drainTraceStream = async () => {
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
        compressedTraceBytes += data.length
        if (!gunzip.write(data)) {
          await once(gunzip, 'drain')
        }
      }
      if (chunk.eof) {
        gunzip.end()
        return
      }
    }
  }
  let eventCount = 0
  try {
    const [, encodedEventCount] = await Promise.all([drainTraceStream(), encoding])
    eventCount = encodedEventCount
  } catch (error) {
    gunzip.destroy(Error.isError(error) ? error : new Error(String(error)))
    throw error
  } finally {
    try {
      await call('IO.close', {handle: stream})
    } catch {}
    try {
      await call('Target.detachFromTarget', {sessionId: pageSessionId})
    } catch {}
    socket.close()
  }
  try {
    await brotliCompressFile(messagePackTemporary, compressedTemporary)
    await rm(output, {force: true})
    await rename(compressedTemporary, output)
    const {size} = await stat(output)
    console.error(`Saved ${output} (${(size / 1024 / 1024).toFixed(1)} MiB, ${eventCount.toLocaleString()} trace events, ${consoleEvents.length.toLocaleString()} console events; CDP gzip ${(compressedTraceBytes / 1024 / 1024).toFixed(1)} MiB)`)
  } finally {
    await rm(messagePackTemporary, {force: true})
    await rm(compressedTemporary, {force: true})
  }
  return output
}

export async function encodeTraceJsonAsMessagePack(input: Readable | string, output: string, consoleEvents: ReadonlyArray<BrowserConsoleEvent> = [], metadataAdditions: Readonly<Record<string, unknown>> = {}) {
  const source = typeof input === 'string' ? createReadStream(input, {encoding: 'utf8'}) : input
  const lines = createInterface({
    input: source,
    crlfDelay: Infinity,
  })
  const sink = createWriteStream(output)
  let position = 0
  let bufferedBytes = 0
  let buffers: Array<Uint8Array> = []
  const flush = async () => {
    if (!bufferedBytes) {
      return
    }
    const data = Buffer.concat(buffers, bufferedBytes)
    if (!sink.write(data)) {
      await once(sink, 'drain')
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
  let mapCount = 1
  let sawHeader = false
  let sawFooter = false
  const footerLines: Array<string> = []
  let mapCountOffset = 0
  let eventCountOffset = 0
  let completed = false
  try {
    mapCountOffset = position + 1
    await write(Uint8Array.of(0xDF, 0, 0, 0, 0))
    await write(messagePack.pack('traceEvents'))
    eventCountOffset = position + 1
    await write(Uint8Array.of(0xDD, 0, 0, 0, 0))
    const writeEvent = async (json: string) => {
      await write(messagePack.pack(JSON.parse(json) as unknown))
      eventCount++
    }
    for await (let line of lines) {
      if (!sawHeader) {
        const header = traceEventsPrefixPattern.exec(line)
        if (header) {
          line = line.slice(header[0].length)
        } else if (!line.trim()) {
          continue
        } else {
          throw new Error(`Unexpected Chromium trace JSON header: ${JSON.stringify(line.slice(0, 200))}`)
        }
        sawHeader = true
      }
      if (sawFooter) {
        footerLines.push(line)
        continue
      }
      let json = line.trim()
      if (!json) {
        continue
      }
      if (json.startsWith(',')) {
        json = json.slice(1).trimStart()
      }
      if (json.startsWith(']')) {
        sawFooter = true
        footerLines.push(json)
        continue
      }
      const eventEnd = findJsonValueEnd(json)
      if (eventEnd === -1) {
        throw new Error(`Unexpected multiline Chromium trace event: ${JSON.stringify(json.slice(0, 200))}`)
      }
      await writeEvent(json.slice(0, eventEnd))
      const remainder = json.slice(eventEnd).trim()
      if (!remainder || remainder === ',') {
        continue
      }
      if (remainder.startsWith(']')) {
        sawFooter = true
        footerLines.push(remainder)
        continue
      }
      throw new Error(`Unexpected Chromium trace event suffix: ${JSON.stringify(remainder.slice(0, 200))}`)
    }
    if (!sawFooter) {
      throw new Error('Chromium trace JSON ended before the traceEvents array closed.')
    }
    const footer = footerLines.join('\n').trim()
    if (!footer.startsWith(']')) {
      throw new Error('Unexpected Chromium trace JSON footer.')
    }
    const objectTail = footer.slice(1).trim()
    let extraFields: Record<string, unknown> = {}
    if (objectTail !== '}') {
      if (!objectTail.startsWith(',')) {
        throw new Error('Unexpected Chromium trace JSON footer.')
      }
      extraFields = JSON.parse(`{${objectTail.slice(1)}`) as Record<string, unknown>
    }
    const definedMetadataAdditions = Object.fromEntries(Object.entries(metadataAdditions).filter(([, value]) => value !== undefined))
    if (Object.keys(definedMetadataAdditions).length) {
      const metadata = extraFields.metadata
      const existingMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
      extraFields.metadata = {
        ...existingMetadata,
        ...definedMetadataAdditions,
      }
    }
    for (const [key, value] of Object.entries(extraFields)) {
      await write(messagePack.pack(key))
      await write(messagePack.pack(value))
      mapCount++
    }
    await write(messagePack.pack('consoleEvents'))
    const consoleEventHeader = Buffer.allocUnsafe(5)
    consoleEventHeader[0] = 0xDD
    consoleEventHeader.writeUInt32BE(consoleEvents.length, 1)
    await write(consoleEventHeader)
    for (const consoleEvent of consoleEvents) {
      await write(messagePack.pack(consoleEvent))
    }
    mapCount++
    await flush()
    completed = true
  } finally {
    lines.close()
    if (completed) {
      sink.end()
    } else {
      sink.destroy()
    }
    if (!sink.closed) {
      try {
        await once(sink, 'close')
      } catch {}
    }
  }
  const count = Buffer.allocUnsafe(4)
  await using file = await open(output, 'r+')
  count.writeUInt32BE(mapCount)
  await file.write(count, 0, count.byteLength, mapCountOffset)
  count.writeUInt32BE(eventCount)
  await file.write(count, 0, count.byteLength, eventCountOffset)
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
      buffer: {
        type: 'string',
        default: '4000000000',
      },
      reload: {
        type: 'string',
        default: 'false',
      },
      help: {type: 'boolean'},
    },
  })
  if (values.help) {
    console.log(help)
  } else {
    if (values.reload !== 'true' && values.reload !== 'false') {
      throw new TypeError('--reload must be true or false.')
    }
    await recordBrowserTrace({
      port: Number(values.port),
      buffer: Number(values.buffer),
      reload: values.reload === 'true',
    })
  }
}
