import {createHash} from 'node:crypto'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'

import prerenderVoice from '../../prerenderVoice.ts'

export type VoicePrerenderItem = {
  id: string
  input: string
  maximumDuration: number
  output: string
}
type Receipt = Awaited<ReturnType<typeof prerenderVoice>> & {sha256: string}
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')

/** Cache paid, traced renders and validate the entire selection before replacing any assets. */
export default class VoicePrerenderBatch {
  constructor(private readonly options: {
    cacheRoot: string
    force?: boolean
    key?: string
    retryFailed?: boolean
    telemetryEndpoint?: string
  }) {}

  async generate(items: ReadonlyArray<VoicePrerenderItem>) {
    const {cacheRoot, force, key, retryFailed, telemetryEndpoint} = this.options
    const staged: Array<{item: VoicePrerenderItem
      receipt: Receipt}> = []
    const failures: Array<{error: string
      id: string}> = []
    for (const item of items) {
      try {
        if (!force && await fs.pathExists(item.output)) {
          continue
        }
        const request = {
          input: item.input,
          provider: 'xai',
          voice: 'iris',
          modifier: 'loud',
          quality: 0,
          sampleRate: 48_000,
          timestamps: true,
          normalization: false,
          trim: true,
          bitrate: 20_000,
          compressionLevel: 10,
          pipeline: 1,
        }
        const cache = path.resolve(cacheRoot, hash(JSON.stringify(request)))
        const receiptPath = path.join(cache, 'receipt.json')
        await fs.ensureDir(cache)
        if (!await fs.pathExists(receiptPath)) {
          const reservation = path.join(cache, 'request.json')
          if (retryFailed && await fs.pathExists(reservation)) {
            await fs.move(reservation, path.join(cache, `request-${crypto.randomUUID()}.json`))
          }
          // No automatic paid retry after interruption or a failed response.
          await fs.writeJson(reservation, request, {
            flag: 'wx',
            spaces: 2,
          })
          const result = await prerenderVoice({
            input: item.input,
            output: path.join(cache, 'voice.opus'),
            bitrate: request.bitrate,
            trim: request.trim,
            forceTelemetry: true,
            key,
            telemetryEndpoint,
          })
          await fs.writeJson(receiptPath, {
            ...result,
            sha256: hash(await Bun.file(result.output).bytes()),
          }, {spaces: 2})
        }
        const receipt = await fs.readJson(receiptPath) as Receipt
        if (!receipt.telemetryDelivered || receipt.bitrate !== request.bitrate || receipt.sampleRate !== request.sampleRate || !receipt.trim || !Number.isFinite(receipt.duration) || receipt.duration <= 0 || receipt.duration > item.maximumDuration || hash(await Bun.file(receipt.output).bytes()) !== receipt.sha256) {
          throw new Error(`Invalid or unexpectedly long recording; review ${receiptPath}.`)
        }
        const decoded = await Bun.$`ffmpeg -nostdin -v error -xerror -i ${receipt.output} -map 0:a:0 -c:a pcm_s16le -f s16le -`.quiet()
        if (decoded.stdout.byteLength !== Math.round(receipt.duration * receipt.sampleRate) * 2) {
          throw new Error(`Decoded PCM length differs from the trimmed source: ${receiptPath}`)
        }
        staged.push({
          item,
          receipt,
        })
        console.log(`${item.id} → ${item.output}`)
      } catch (error) {
        const failure = {
          id: item.id,
          error: error instanceof Error ? error.message : String(error),
        }
        failures.push(failure)
        console.error(`${failure.id}: ${failure.error}`)
      }
    }
    await fs.ensureDir(cacheRoot)
    await fs.writeJson(path.join(cacheRoot, 'failures.json'), failures, {spaces: 2})
    if (failures.length) {
      throw new Error(`${failures.length} prerenders failed; no announcements were published. Successful recordings are cached. See ${path.join(cacheRoot, 'failures.json')}.`)
    }
    // Back up every previous asset before publishing; retain receipts and timings for inspection.
    const publication = await fs.mkdtemp(path.join(cacheRoot, 'publication-'))
    for (const [index, {item}] of staged.entries()) {
      if (await fs.pathExists(item.output)) {
        await fs.copyFile(item.output, path.join(publication, `${index}.previous.opus`))
      }
      await fs.ensureDir(path.dirname(item.output))
    }
    await fs.writeJson(path.join(publication, 'manifest.json'), staged, {spaces: 2})
    for (const {item, receipt} of staged) {
      await fs.copyFile(receipt.output, item.output)
    }
    return staged.map(({item}) => item.output)
  }
}
