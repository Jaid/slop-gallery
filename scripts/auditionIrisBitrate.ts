import {createHash} from 'node:crypto'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'

/** Compare only Opus compression, using the exact same lossless loud/no-punctuation recording. */
export default async function auditionIrisBitrate() {
  const sourceDirectory = path.resolve(import.meta.dir, '../private/iris-punctuation/none')
  const source = path.join(sourceDirectory, 'review.wav')
  const wave = await Bun.file(source).bytes()
  const probe = await Bun.$`ffprobe -v error -show_entries stream=codec_name,sample_rate,channels:format=duration -of json ${source}`.json() as {
    format: {duration: string}
    streams: Array<{channels: number
      codec_name: string
      sample_rate: string}>
  }
  const duration = Number(probe.format.duration)
  const stream = probe.streams[0]
  if (probe.streams.length !== 1 || stream.codec_name !== 'pcm_s16le' || stream.sample_rate !== '48000' || stream.channels !== 1 || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('Expected a lossless mono 48 kHz PCM master.')
  }
  // A fresh directory prevents overwriting previous reviews, including concurrent runs.
  const root = path.resolve(import.meta.dir, '../private/iris-bitrate')
  await fs.ensureDir(root)
  const output = await fs.mkdtemp(path.join(root, 'review-'))
  const files = []
  for (let bitrate = 10_000; bitrate <= 100_000; bitrate += 10_000) {
    const opus = path.join(output, `${bitrate / 1000}kbps.opus`)
    // VBR and compression level match the prerender pipeline. Never transcode an existing Opus.
    await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -n -i ${source} -map 0:a:0 -map_metadata -1 -c:a libopus -b:a ${bitrate} -vbr on -compression_level 10 -application audio ${opus}`.quiet()
    const decoded = await Bun.$`ffmpeg -nostdin -v error -xerror -i ${opus} -map 0:a:0 -c:a pcm_s16le -f s16le -`.quiet()
    if (decoded.stdout.byteLength !== wave.byteLength - 44) {
      throw new Error(`Decoded duration changed at ${bitrate} b/s.`)
    }
    const bytes = await Bun.file(opus).bytes()
    files.push({
      opus,
      bitrate,
      bytes: bytes.byteLength,
      averageContainerBitrate: bytes.byteLength * 8 / duration,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }
  await fs.copyFile(path.join(sourceDirectory, 'timings.json'), path.join(output, 'timings.json'))
  await fs.writeJson(path.join(output, 'manifest.json'), {
    source,
    sourceSha256: createHash('sha256').update(wave).digest('hex'),
    duration,
    voice: 'iris',
    modifier: 'loud',
    punctuation: '',
    sampleRate: 48_000,
    compressionLevel: 10,
    vbr: true,
    application: 'audio',
    files,
  }, {spaces: 2})
  return {
    output,
    files,
  }
}

if (import.meta.main) {
  console.log(JSON.stringify(await auditionIrisBitrate(), null, 2))
}
