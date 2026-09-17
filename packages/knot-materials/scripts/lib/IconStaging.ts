import {randomUUID} from 'node:crypto'
import {copyFile, mkdir, mkdtemp, rename, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'

import {encodeJxl} from './encodeJxl.ts'

/** No project writes occur until all requested images have rendered and encoded. */
export default class IconStaging implements AsyncDisposable {
  static async create() {
    return new IconStaging(await mkdtemp(join(tmpdir(), 'knot-materials-icons-')))
  }

  private readonly outputs: Array<{
    destination: string
    source: string
  }> = []

  private constructor(private readonly directory: string) {}

  async add(image: string, destination: string) {
    const source = join(this.directory, `${this.outputs.length}.jxl`)
    const input = `${source}.png`
    await writeFile(input, Buffer.from(image, 'base64'))
    await encodeJxl(input, source)
    this.addEncoded(source, destination)
  }

  /** The caller retains ownership of this already-encoded file until publish completes. */
  addEncoded(source: string, destination: string) {
    this.outputs.push({
      source,
      destination,
    })
  }

  async publish() {
    for (const {source, destination} of this.outputs) {
      await mkdir(dirname(destination), {recursive: true})
      // Copy onto the destination volume first, then atomically replace each icon.
      const pending = `${destination}.${randomUUID()}.tmp`
      try {
        await copyFile(source, pending)
        await rename(pending, destination)
      } finally {
        await rm(pending, {force: true})
      }
    }
    return this.outputs.map(({destination}) => destination)
  }

  async [Symbol.asyncDispose]() {
    await rm(this.directory, {
      recursive: true,
      force: true,
    })
  }
}
