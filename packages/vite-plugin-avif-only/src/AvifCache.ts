import {createHash} from 'node:crypto'
import {join} from 'node:path'

import fs from 'fs-extra'

export type AvifOptions = {
  magick?: string
  quality?: number
  speed?: number
}

/** Content-addressed, concurrency-limited conversions shared by development and builds. */
export class AvifCache {
  readonly magick: string
  readonly quality: number
  readonly speed: number
  private active = 0
  private readonly pending = new Map<string, Promise<string>>
  private version?: Promise<string>
  private readonly waiting: Array<() => void> = []

  constructor(readonly directory: string, options: AvifOptions = {}) {
    this.magick = options.magick ?? 'magick'
    this.quality = options.quality ?? 50
    this.speed = options.speed ?? 0
    if (!Number.isInteger(this.quality) || this.quality < 0 || this.quality > 100) {
      throw new RangeError('AVIF quality must be an integer from 0 to 100.')
    }
    if (!Number.isInteger(this.speed) || this.speed < 0 || this.speed > 9) {
      throw new RangeError('AVIF speed must be an integer from 0 to 9.')
    }
  }

  async convert(source: string) {
    this.version ??= Bun.$`${this.magick} -version`.text()
    const bytes = await fs.readFile(source)
    const key = createHash('sha256').update(bytes).update(JSON.stringify([1, await this.version, this.quality, this.speed])).digest('hex')
    const output = join(this.directory, `${key}.avif`)
    let pending = this.pending.get(key)
    if (!pending) {
      pending = this.encode(bytes, output)
      this.pending.set(key, pending)
    }
    try {
      return await pending
    } finally {
      if (this.pending.get(key) === pending) {
        this.pending.delete(key)
      }
    }
  }

  private async encode(bytes: Uint8Array, output: string) {
    if (await fs.pathExists(output)) {
      return output
    }
    if (this.active >= 2) {
      await new Promise<void>(resolve => this.waiting.push(resolve))
    } else {
      this.active++
    }
    let temporary: string | undefined
    try {
      await fs.ensureDir(this.directory)
      temporary = await fs.mkdtemp(join(this.directory, 'encoding-'))
      const input = join(temporary, 'input.jxl')
      const encoded = join(temporary, 'output.avif')
      await fs.writeFile(input, bytes)
      await Bun.$`${this.magick} ${input} -auto-orient -colorspace sRGB -background black -alpha background -strip -quality ${this.quality} -define heic:chroma=420 -define heic:speed=${this.speed} -depth 8 ${encoded}`.quiet()
      const result = await fs.readFile(encoded)
      if (result.toString('ascii', 4, 8) !== 'ftyp' || !result.subarray(8, 64).includes(Buffer.from('avif'))) {
        throw new Error('ImageMagick did not produce an AVIF image.')
      }
      await fs.rename(encoded, output)
      return output
    } finally {
      try {
        if (temporary) {
          await fs.remove(temporary)
        }
      } finally {
        const next = this.waiting.shift()
        if (next) {
          next()
        } else {
          this.active--
        }
      }
    }
  }
}
