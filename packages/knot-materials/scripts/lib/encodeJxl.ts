import {dirname, extname} from 'node:path'

import fs from 'fs-extra'

export const jxlOptions = ['--allow_expert_options', '--effort', '11', '--brotli_effort', '11', '--iterations', '100', '--keep_invisible', '0', '--distance', '1', '--num_threads', '1']

/** Keep the high-quality JXL master; intermediate PNGs never become repository assets. */
export async function encodeJxl(input: string, output: string) {
  await fs.ensureDir(dirname(output))
  const intermediate = `${output}.input.png`
  const supported = /\.(apng|gif|jpe?g|pam|pfm|pgx|png|pnm|ppm)$/iu.test(extname(input))
  const source = supported ? input : intermediate
  const encoded = `${output}.encoding.jxl`
  try {
    if (!supported) {
      await Bun.$`magick ${input} -auto-orient ${intermediate}`.quiet()
    }
    await Bun.$`cjxl ${source} ${encoded} ${jxlOptions}`.quiet()
    await fs.rename(encoded, output)
  } finally {
    await fs.remove(encoded)
    await fs.remove(intermediate)
  }
}
