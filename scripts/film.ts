import type {CameraPose} from '#src/lib/diagnostics.ts'
import type {Shot} from './lib/cameraRecipe.ts'

import {join, relative} from 'node:path'
import {parseArgs} from 'node:util'

import fs from 'fs-extra'

import {parseRecipe, recipeDuration, sampleRecipe, tweens} from './lib/cameraRecipe.ts'
import {degrees, galleryHelp, galleryOptions, openHeadlessGallery, parseNumbers, radians, repositoryRoot, resolveGallerySetup, timestamp, waitForFrames} from './lib/headlessGallery.ts'
import {installVirtualClock} from './lib/virtualClock.ts'

const codecs = {
  av1: {
    args: ['-c:v', 'libsvtav1', '-preset', '4', '-pix_fmt', 'yuv420p10le'],
    crf: 24,
  },
  hevc: {
    args: ['-c:v', 'libx265', '-preset', 'slow', '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p10le'],
    crf: 18,
  },
  h264: {
    args: ['-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p'],
    crf: 16,
  },
}
const help = `Usage: bun scripts/film.ts --recipe <file> [options]

Renders a camera flight through a level and writes it to out/videos/<name>.mp4.
Starts a private Vite dev server (or serves --target) and a private headless browser; never touches the visible browser.
The engine clock is virtual: every frame advances the scene by exactly 1/fps seconds, however long it takes to render. Artworks that come into view are decoded before their frame is captured, so nothing pops in.

Options:
  --recipe <file>         JSON camera recipe, or - to read it from stdin. Required
${galleryHelp}
  --fps <number>          frames per second. Default: 60
  --codec <codec>         ${Object.keys(codecs).join(', ')}. Default: av1
  --crf <number>          encoder quality, lower is better. Default: ${Object.entries(codecs).map(([codec, {crf}]) => `${crf} (${codec})`).join(', ')}
  --settle <frames>       wall-clock frames to render at the first keyframe before recording, lets temporal antialiasing converge. Default: 60
  --name <name>           output file name without extension. Default: <level>-<timestamp>
  -h, --help              show this help

A recipe is a JSON array of keyframes, ordered by time:

  [
    {"time": 0, "position": [0, 1.7, 4], "yaw": 0, "pitch": 0, "fov": 60},
    {"time": 3, "position": [2, 1.7, 0], "yaw": 90, "tween": "easeInOutSine"},
    {"time": 5, "pitch": -20, "roll": 10, "fov": 40, "tween": "easeOutCubic"}
  ]

  time      seconds since the start of the video. Required
  position  [x, y, z] camera (eye) position in meters
  yaw       degrees, 0 looks toward −z, positive turns left. Not wrapped, so 0 → 720 spins twice
  pitch     degrees, positive looks up
  roll      degrees, positive tilts the camera counterclockwise
  fov       vertical field of view in degrees
  tween     how this keyframe’s properties travel toward it from their previous keyframe. Default: linear
            ${Object.keys(tweens).join(', ')}

Each property animates on its own track, so a keyframe only affects the properties it sets. Before its first keyframe and after its last, a property holds still; properties no keyframe sets stay at the player spawn’s camera.
The video lasts until the last keyframe.

Set BROWSER to a Chromium executable with WebGPU support. ffmpeg must be on PATH.`
const videoRoot = join(repositoryRoot, 'out', 'videos')
const {values} = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    ...galleryOptions,
    codec: {
      type: 'string',
      default: 'av1',
    },
    crf: {type: 'string'},
    fps: {
      type: 'string',
      default: '60',
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
    name: {type: 'string'},
    recipe: {type: 'string'},
    settle: {
      type: 'string',
      default: '60',
    },
  },
})
if (values.help) {
  console.log(help)
  process.exit(0)
}
if (values.recipe === undefined) {
  throw new Error('--recipe is required. See --help for its format.')
}
const recipeText = values.recipe === '-' ? await Bun.stdin.text() : await fs.readFile(values.recipe, 'utf8')
const recipe = parseRecipe(JSON.parse(recipeText))
const duration = recipeDuration(recipe)
if (duration === 0) {
  throw new Error('The recipe needs a keyframe with a time after 0.')
}
if (!Object.hasOwn(codecs, values.codec)) {
  throw new Error(`--codec must be one of: ${Object.keys(codecs).join(', ')}.`)
}
const codec = codecs[values.codec as keyof typeof codecs]
const crf = values.crf === undefined ? codec.crf : parseNumbers(values.crf, 'crf', [1])[0]
const fps = parseNumbers(values.fps, 'fps', [1])[0]
if (fps <= 0) {
  throw new Error('--fps must be positive.')
}
const settle = parseNumbers(values.settle, 'settle', [1])[0]
const setup = await resolveGallerySetup(values)
const {width, height} = setup.viewport
if (width % 2 || height % 2) {
  throw new Error('--viewport needs even dimensions for 4:2:0 video.')
}
const frameCount = Math.round(duration * fps) + 1
const name = values.name ?? `${setup.levelName}-${timestamp()}`
const output = join(videoRoot, `${name}.mp4`)
const toPose = (shot: Shot): Partial<CameraPose> => ({
  position: shot.position,
  rotation: [radians(shot.pitch), radians(shot.yaw), radians(shot.roll)],
  fov: shot.fov,
})
await using gallery = await openHeadlessGallery(setup, {
  cacheDir: 'node_modules/.vite-film',
  initScript: installVirtualClock,
})
const {page} = gallery
const spawn = await page.evaluate(() => globalThis.slopGallery!.pose!())
const fallback: Shot = {
  position: spawn.position,
  yaw: degrees(spawn.rotation[1]),
  pitch: degrees(spawn.rotation[0]),
  roll: degrees(spawn.rotation[2]),
  fov: spawn.fov ?? 60,
}
const first = toPose(sampleRecipe(recipe, 0, fallback))
await page.evaluate((pose: Partial<CameraPose>) => globalThis.slopGallery!.pose!(pose), first)
await waitForFrames(page, settle)
await page.waitForFunction(() => globalThis.slopGallery!.snapshot!().pendingImages === 0, {timeout: 120_000})
await waitForFrames(page, settle)
await fs.mkdir(videoRoot, {recursive: true})
const ffmpeg = Bun.spawn(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-video_size', `${width}x${height}`, '-framerate', String(fps), '-i', '-', '-vf', 'scale=out_color_matrix=bt709:out_range=tv', ...codec.args, '-crf', String(crf), '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', output], {
  stdin: 'pipe',
  stdout: 'inherit',
  stderr: 'inherit',
  // SVT-AV1 prints its configuration banner regardless of ffmpeg’s log level.
  env: {
    ...process.env,
    SVT_LOG: '1',
  },
})
const frameBytes = width * height * 4
let received = 0
// Frames travel as raw RGBA request bodies; base64 through the DevTools protocol would cost more than rendering.
const frameServer = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  maxRequestBodySize: frameBytes,
  async fetch(request) {
    const headers = {'Access-Control-Allow-Origin': '*'}
    const pixels = await request.bytes()
    if (pixels.byteLength !== frameBytes) {
      return new Response(`Expected ${frameBytes} bytes, got ${pixels.byteLength}.`, {
        status: 400,
        headers,
      })
    }
    if (received === 0 && !pixels.some((value, index) => index % 4 !== 3 && value > 8)) {
      return new Response('The first frame is completely black.', {
        status: 422,
        headers,
      })
    }
    await ffmpeg.stdin.write(pixels)
    await ffmpeg.stdin.flush()
    received++
    return new Response(null, {
      status: 204,
      headers,
    })
  },
})
try {
  const frameUrl = `http://127.0.0.1:${frameServer.port}/`
  await page.evaluate(() => {
    globalThis.virtualClock!.start()
    // Fiber measures its first frozen delta from the last wall-clock frame; this aligns it without recording.
    globalThis.virtualClock!.step(0)
  })
  const startedAt = performance.now()
  for (let index = 0; index < frameCount; index++) {
    const pose = toPose(sampleRecipe(recipe, index / fps, fallback))
    await page.evaluate(async (frame: {
      delta: number
      pose: Partial<CameraPose>
      url: string
    }) => {
      const api = globalThis.slopGallery!
      api.pose!(frame.pose)
      globalThis.virtualClock!.step(frame.delta)
      // The clock stands still while artworks that just came into view decode in the background.
      const deadline = Date.now() + 120_000
      while (api.snapshot!().pendingImages > 0) {
        if (Date.now() > deadline) {
          throw new Error('Artworks did not finish decoding within 2 minutes.')
        }
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      const {pixels} = await api.capturePixels!()
      const response = await fetch(frame.url, {
        method: 'POST',
        body: pixels,
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
    }, {
      delta: 1 / fps,
      pose,
      url: frameUrl,
    })
    const rendered = index + 1
    if (rendered % Math.round(fps) !== 0 && rendered !== frameCount) {
      continue
    }
    const rate = rendered / ((performance.now() - startedAt) / 1000)
    console.log(`Rendered ${(rendered / fps).toFixed(1)}/${duration.toFixed(1)} s (frame ${rendered}/${frameCount}, ${rate.toFixed(1)} frames per second)`)
  }
} catch (error) {
  ffmpeg.kill()
  throw error
} finally {
  await frameServer.stop(true)
}
await ffmpeg.stdin.end()
const exitCode = await ffmpeg.exited
if (exitCode !== 0) {
  throw new Error(`ffmpeg exited with code ${exitCode}.`)
}
console.log(`Wrote ${relative(repositoryRoot, output).replaceAll('\\', '/')} (${width}×${height}, ${frameCount} frames at ${fps} fps, ${(frameCount / fps).toFixed(2)} s)`)
