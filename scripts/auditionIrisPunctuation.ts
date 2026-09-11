import type {CharacterTimestamp} from 'grok-speaker'

import {createHash} from 'node:crypto'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'
import getFree from 'get-free'

import pcmWave from '../src/lib/audio/pcmWave.ts'
import {auditionTranscript} from './lib/knots/voiceAuditions.ts'
import prerenderVoice from './prerenderVoice.ts'

const variants = [
  {
    id: 'none',
    suffix: '',
  }, {
    id: 'period',
    suffix: '.',
  }, {
    id: 'exclamation',
    suffix: '!',
  },
] as const
type Clip = Awaited<ReturnType<typeof prerenderVoice>> & {input: string
  wave: string
  waveSha256: string}
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Five independent calls per variant, all using the same loud, trimmed Iris pipeline. */
export default async function auditionIrisPunctuation() {
  const output = path.resolve(import.meta.dir, '../private/iris-punctuation')
  for (const {id, suffix} of variants) {
    const directory = path.join(output, id)
    await fs.ensureDir(directory)
    const clips = []
    const parts: Array<Uint8Array> = []
    let duration = 0
    for (const [index, name] of auditionTranscript.entries()) {
      const input = name.replace(/[!.?]+$/u, '') + suffix
      const receipt = path.join(directory, `${index + 1}.json`)
      if (!await fs.pathExists(receipt)) {
        // Interrupted attempts require review instead of another automatic paid synthesis call.
        await fs.writeJson(path.join(directory, `${index + 1}.request.json`), {
          input,
          startedAt: (new Date).toISOString(),
        }, {
          spaces: 2,
          flag: 'wx',
        })
        const result = await prerenderVoice({
          input,
          output: path.join(directory, `${index + 1}.opus`),
          trim: true,
        })
        const wave = path.join(result.cache, 'prepared.wav')
        const clip: Clip = {
          ...result,
          input,
          wave,
          waveSha256: sha256(await Bun.file(wave).bytes()),
        }
        await fs.writeJson(receipt, clip, {spaces: 2})
      }
      const clip = await fs.readJson(receipt) as Clip
      const wav = await Bun.file(clip.wave).bytes()
      if (clip.input !== input || !clip.trim || clip.sampleRate !== 48_000 || !Number.isFinite(clip.duration) || clip.duration <= 0 || clip.duration > 30 || sha256(wav) !== clip.waveSha256 || wav.length !== 44 + Math.round(clip.duration * 96_000)) {
        throw new Error(`Invalid punctuation audition cache: ${receipt}`)
      }
      if (index) {
        parts.push(new Uint8Array(48_000)) // 500 ms between independently rendered names
        duration += 0.5
      }
      clips.push({
        ...clip,
        offset: duration,
      })
      parts.push(wav.subarray(44))
      duration += clip.duration
      console.log(`${id}: ${input} (${clip.duration.toFixed(3)} s)`)
    }
    const master = path.join(directory, 'review.wav')
    await Bun.write(master, pcmWave(Uint8Array.from(Buffer.concat(parts)).buffer, 48_000))
    const temporary = path.join(directory, 'review.opus')
    // Stitch lossless trimmed masters, not the individual Opus encodes. No gain normalization.
    await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -i ${master} -map 0:a:0 -map_metadata -1 -c:a libopus -b:a 256000 -vbr on -compression_level 10 -application audio ${temporary}`.quiet()
    const probe = await Bun.$`ffprobe -v error -show_entries stream=codec_name,sample_rate,channels:format=duration -of json ${temporary}`.json() as {format: {duration: string}
      streams: Array<{channels: number
        codec_name: string
        sample_rate: string}>}
    const stream = probe.streams[0]
    const measured = Number(probe.format.duration)
    if (probe.streams.length !== 1 || stream.codec_name !== 'opus' || stream.sample_rate !== '48000' || stream.channels !== 1 || !Number.isFinite(measured) || Math.abs(measured - duration) > 0.02) {
      throw new Error('Punctuation review does not match its five sources.')
    }
    const free = await getFree(`xai-loud-${id}-quality`, candidate => fs.pathExists(path.join(output, `${candidate}.opus`)))
    const opus = path.join(output, `${free}.opus`)
    await fs.copyFile(temporary, opus, fs.constants.COPYFILE_EXCL)
    await fs.writeJson(path.join(directory, 'manifest.json'), {
      id,
      suffix,
      duration,
      opus,
      master,
      clips,
    }, {spaces: 2})
    const timings = []
    for (const clip of clips) {
      const times = await fs.readJson(clip.timingsPath) as Array<CharacterTimestamp>
      timings.push(...times.map(time => ({
        ...time,
        input: clip.input,
        start: time.start + clip.offset,
        end: time.end + clip.offset,
      })))
    }
    await fs.writeJson(path.join(directory, 'timings.json'), timings, {spaces: 2})
    console.log(opus)
  }
}

if (import.meta.main) {
  await auditionIrisPunctuation()
}
