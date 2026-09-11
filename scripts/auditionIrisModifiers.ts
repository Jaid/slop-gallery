import type {GeneratedSpeech, Modifier} from 'grok-speaker'

import {createHash} from 'node:crypto'
import {resolve} from 'node:path'

import fs from 'fs-extra'
import GrokSpeaker, {serializeText} from 'grok-speaker'

import pcmWave from '../src/lib/audio/pcmWave.ts'
import {auditionTranscript} from './lib/knots/voiceAuditions.ts'

const variants: Array<{id: string
  modifier: Array<Modifier>}> = [
  {
    id: 'loud-slow',
    modifier: ['loud', 'slow'],
  },
  {
    id: 'slow',
    modifier: ['slow'],
  },
  {
    id: 'loud',
    modifier: ['loud'],
  },
]
const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')

/** Independent synthesis calls for consistency review; never changes production narration. */
export default async function auditionIrisModifiers() {
  const output = resolve(import.meta.dir, '../private/iris-modifiers')
  using speaker = new GrokSpeaker({
    key: Bun.env.XAI_API_KEY ?? '',
    provider: 'xai',
  })
  for (const {id, modifier} of variants) {
    const directory = resolve(output, `xai-${id}-quality`)
    await fs.ensureDir(directory)
    const parts: Array<Uint8Array> = []
    const clips = []
    let offset = 0
    for (const [index, text] of auditionTranscript.entries()) {
      const segment = {
        text,
        modifier,
      }
      const request = {
        text: serializeText(segment),
        voice_id: 'iris',
        language: 'en',
        output_format: {
          codec: 'pcm',
          sample_rate: 48_000,
        },
        optimize_streaming_latency: 0,
        text_normalization: false,
        with_timestamps: true,
      }
      const prefix = resolve(directory, `${index + 1}-${sha256(JSON.stringify(request))}`)
      const wavePath = `${prefix}.wav`
      const receiptPath = `${prefix}.json`
      if (!await Bun.file(receiptPath).exists()) {
        // Refuse silent paid retries after an interrupted or failed request.
        await fs.writeFile(`${prefix}.request.json`, JSON.stringify({
          request,
          startedAt: (new Date).toISOString(),
        }, null, 2), {flag: 'wx'})
        const {wav, ...result} = await speaker.generate(segment)
        await Bun.write(wavePath, wav)
        await Bun.write(receiptPath, JSON.stringify({
          ...result,
          sha256: sha256(wav),
        }, null, 2))
      }
      const wav = await Bun.file(wavePath).bytes()
      const receipt = await Bun.file(receiptPath).json() as Omit<GeneratedSpeech, 'wav'> & {sha256: string}
      if (sha256(wav) !== receipt.sha256 || receipt.sampleRate !== 48_000 || !Number.isFinite(receipt.duration) || receipt.duration <= 0 || receipt.duration > 30 || wav.length !== 44 + Math.round(receipt.duration * 96_000)) {
        throw new Error(`Invalid cached audition clip: ${prefix}`)
      }
      if (index) {
        parts.push(new Uint8Array(48_000)) // 500 ms of mono signed 16-bit PCM silence
        offset += 0.5
      }
      clips.push({
        text,
        request,
        ...receipt,
        offset,
        wavePath,
      })
      parts.push(wav.subarray(44))
      offset += receipt.duration
      console.log(`${id}: ${text} (${receipt.duration.toFixed(3)} s)`)
    }
    const pcm = Uint8Array.from(Buffer.concat(parts)).buffer
    const wave = resolve(directory, 'review.wav')
    const opus = resolve(output, `xai-${id}-quality.opus`)
    const temporary = resolve(directory, 'review.opus')
    await Bun.write(wave, pcmWave(pcm, 48_000))
    // Encode once from the lossless master, without gain normalization or speed changes.
    await Bun.$`ffmpeg -nostdin -hide_banner -loglevel error -y -i ${wave} -map 0:a:0 -map_metadata -1 -c:a libopus -b:a 256000 -vbr on -compression_level 10 -application audio ${temporary}`
    const probe = await Bun.$`ffprobe -v error -show_entries stream=codec_name,sample_rate,channels:format=duration -of json ${temporary}`.json() as {format: {duration: string}
      streams: Array<{channels: number
        codec_name: string
        sample_rate: string}>}
    const stream = probe.streams[0]
    if (probe.streams.length !== 1 || stream.codec_name !== 'opus' || stream.sample_rate !== '48000' || stream.channels !== 1 || Math.abs(Number(probe.format.duration) - offset) > 0.02) {
      throw new Error(`Invalid merged Opus: ${id}`)
    }
    await Bun.write(opus, Bun.file(temporary))
    await Bun.write(resolve(directory, 'manifest.json'), JSON.stringify({
      id,
      modifier,
      duration: offset,
      opus,
      wave,
      clips,
    }, null, 2))
    await Bun.write(resolve(directory, 'timestamps.json'), JSON.stringify(clips.flatMap(clip => clip.timestamps.map(time => ({
      ...time,
      clip: clip.text,
      start: time.start + clip.offset,
      end: time.end + clip.offset,
    }))), null, 2))
    console.log(opus)
  }
}

if (import.meta.main) {
  await auditionIrisModifiers()
}
