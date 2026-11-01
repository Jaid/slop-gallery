import {createHash, randomUUID} from 'node:crypto'
import {join} from 'node:path'

import fs from 'fs-extra'

/** how an image becomes JXL */
export type JxlEncoding = {
  /** Butteraugli distance, from 0 (lossless) to 25 */
  distance: number
  /** cjxl’s effort, from 1 to 11, where 11 is an expert option */
  effort: number
  /** the length in pixels the image’s longer side is scaled down to if it is longer */
  maximumLong?: number
}

export type JxlEncoderOptions = {
  /** cjxl’s executable */
  cjxlPath?: string
  /** where the encoded images are kept, by a hash of their source and encoding */
  folder: string
  /** ImageMagick’s executable, which decodes and scales the sources */
  magickPath?: string
}

// Part of every cache key, so that a change to how images are encoded misses every image encoded before it.
const pipelineVersion = 1
const jpegPattern = /\.jpe?g$/iu

/** Encodes images to JXL through ImageMagick and cjxl, once per source and encoding. */
export default class JxlEncoder {
  readonly cjxlPath: string
  readonly folder: string
  readonly magickPath: string
  private readonly pending = new Map<string, Promise<string>>

  constructor(options: JxlEncoderOptions) {
    this.folder = options.folder
    this.cjxlPath = options.cjxlPath ?? 'cjxl'
    this.magickPath = options.magickPath ?? 'magick'
  }

  /** Resolves with the file of the image encoded as JXL, which only gets encoded if the cache does not hold it yet. */
  async encode(file: string, encoding: JxlEncoding) {
    const source = await fs.readFile(file)
    const key = createHash('sha256')
      .update(JSON.stringify({
        pipelineVersion,
        distance: encoding.distance,
        effort: encoding.effort,
        maximumLong: encoding.maximumLong,
        transcodes: this.transcodes(file, encoding),
      }))
      .update(source)
      .digest('hex')
    const output = join(this.folder, `${key}.jxl`)
    let job = this.pending.get(output)
    if (!job) {
      job = this.encodeOnce(file, output, encoding)
      this.pending.set(output, job)
      job.catch(() => this.pending.delete(output))
    }
    return job
  }

  private async encodeOnce(file: string, output: string, encoding: JxlEncoding) {
    if (await fs.pathExists(output)) {
      return output
    }
    await fs.ensureDir(this.folder)
    // Written beside the cache entry first, so that an interrupted encoding never leaves a broken one.
    const partial = `${output}.${randomUUID()}.partial`
    try {
      const result = await this.run(file, partial, encoding).nothrow().quiet()
      if (result.exitCode !== 0 || !Bun.file(partial).size) {
        throw new Error(`Could not encode ${file} as JXL (exit code ${result.exitCode}): ${result.stderr.toString().trim()}`)
      }
      await fs.move(partial, output, {overwrite: true})
    } finally {
      await fs.remove(partial)
    }
    return output
  }

  private run(file: string, output: string, encoding: JxlEncoding) {
    const effort = ['--effort', String(encoding.effort), '--brotli_effort', '11', ...encoding.effort > 10 ? ['--allow_expert_options'] : []]
    if (this.transcodes(file, encoding)) {
      return Bun.$`${this.cjxlPath} ${file} ${effort} --lossless_jpeg 1 ${output}`
    }
    const resize = encoding.maximumLong ? ['-resize', `${encoding.maximumLong}x${encoding.maximumLong}>`] : []
    // Only the first frame, upright, as an uncompressed PNG, which cjxl reads the quickest.
    return Bun.$`${this.magickPath} ${`${file}[0]`} -auto-orient ${resize} -define png:compression-level=0 -define png:compression-filter=0 png:- | ${this.cjxlPath} - ${effort} --distance ${encoding.distance} ${output}`
  }

  /** whether cjxl takes the JPEG as it is and keeps it without loss, which beats decoding it */
  private transcodes(file: string, encoding: JxlEncoding) {
    return encoding.distance === 0 && encoding.maximumLong === undefined && jpegPattern.test(file)
  }
}
