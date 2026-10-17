import type {EgoDump, EgoState} from 'ego-player'

import {expect, spyOn, test} from 'bun:test'
import {resolve} from 'node:path'

import {BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene} from 'three/webgpu'

import EgoDiagnostics from '../../packages/ego-player/src/EgoDiagnostics.ts'

test('player dumps are development-only, preserve precision, join separate hit logs and respect disabled telemetry', async () => {
  const source = resolve(import.meta.dir, '../../src/lib/telemetry/recordPlayerDump.ts')
  const scene = new Scene
  const camera = new PerspectiveCamera
  const geometry = new BoxGeometry
  const material = new MeshBasicMaterial
  const mesh = new Mesh(geometry, material)
  mesh.position.z = -3.123456789
  scene.add(mesh)
  const diagnostics = new EgoDiagnostics(scene, camera)
  const dump = diagnostics.capture({} as EgoState, {dump: true})
  const dir = spyOn(console, 'dir').mockImplementation(() => {})
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  try {
    for (const [enabled, sound, audioFails, development] of [[true, true, false, true], [false, true, false, true], [true, false, false, true], [false, false, false, true], [true, true, true, true], [false, true, true, true], [true, true, false, false]]) {
      const build = await Bun.build({
        entrypoints: [source],
        target: 'bun',
        plugins: [
          {
            name: 'isolated-dump-adapters',
            setup(builder) {
              builder.onLoad({filter: /recordPlayerDump\.ts$/u}, async () => ({
                loader: 'ts',
                contents: `${await Bun.file(source).text()}\nexport {telemetry}; export {played} from "../audio/soundEffects.ts"; export {default as SoundEngine} from "../audio/SoundEngine.ts"; export {screenshots} from "./saveDumpScreenshot.ts"`,
              }))
              builder.onLoad({filter: /telemetry[/\\]index\.ts$/u}, () => ({
                loader: 'ts',
                contents: `export const telemetry = ${enabled ? "{sessionId: 'dump-test', records: [], log(...args) {this.records.push(args)}}" : 'null'}`,
              }))
              builder.onLoad({filter: /lib[/\\]gallery\.ts$/u}, () => ({
                loader: 'ts',
                contents: `export const useGallery = {getState: () => ({room: 'lobby', active: null, held: null, inspecting: null, locked: true, sound: ${sound}})}`,
              }))
              builder.onLoad({filter: /audio[/\\]SoundEngine\.ts$/u}, () => ({
                loader: 'ts',
                contents: `export default class SoundEngine {static requests = 0; static get() {this.requests++; return {resume: async () => {${audioFails ? "throw new Error('Unavailable')" : ''}}}}}`,
              }))
              builder.onLoad({filter: /audio[/\\]soundEffects\.ts$/u}, () => ({
                loader: 'ts',
                contents: 'export const played = []; export const playSoundEffect = (_sound, id) => played.push(id)',
              }))
              builder.onLoad({filter: /lib[/\\]developmentMode\.ts$/u}, () => ({
                loader: 'ts',
                contents: `export const isDevelopmentMode = ${development}`,
              }))
              builder.onLoad({filter: /telemetry[/\\]saveDumpScreenshot\.ts$/u}, () => ({
                loader: 'ts',
                contents: 'export const screenshots = []; export default async name => {screenshots.push(name)}',
              }))
              builder.onLoad({filter: /lib[/\\]level\.ts$/u}, () => ({
                loader: 'ts',
                contents: "export const galleryLevel = 'knottingham'",
              }))
            },
          },
        ],
      })
      expect(build.success).toBe(true)
      const module = await import(`data:text/javascript;base64,${Buffer.from(await build.outputs[0].text()).toBase64()}`) as {
        default: (dump: EgoDump) => void
        played: Array<string>
        playerDumpHandler: ((dump: EgoDump) => void) | undefined
        screenshots: Array<string>
        SoundEngine: {requests: number}
        telemetry: {
          records: Array<[string, {
            attributes: Record<string, unknown>
            level: string
          }]>
        } | null
      }
      if (!development) {
        // Without ?development the player gets no handler, so X stays unbound and ego-player skips its diagnostics.
        expect(module.playerDumpHandler).toBeUndefined()
        continue
      }
      expect(module.playerDumpHandler).toBe(module.default)
      module.playerDumpHandler!(dump)
      await Bun.sleep(0)
      expect(module.screenshots).toEqual([`knottingham-${dump.id}`])
      expect(module.played).toEqual(sound && !audioFails ? ['SFX-04'] : [])
      expect(module.SoundEngine.requests).toBe(sound ? 1 : 0)
      expect(dir).toHaveBeenLastCalledWith({
        ...dump,
        context: {
          level: 'knottingham',
          room: 'lobby',
          active: null,
          held: null,
          inspecting: null,
          locked: true,
          sessionId: enabled ? 'dump-test' : null,
        },
      }, {depth: null})
      if (!enabled) {
        continue
      }
      const records = module.telemetry!.records
      expect(records).toHaveLength(2)
      const summary = JSON.parse(records[0][0]) as EgoDump & {hitCount: number}
      expect(summary.aim.hit!.point).toEqual(dump.aim.hit!.point)
      expect(summary.aim.hits).toBeUndefined()
      expect(summary.hitCount).toBe(1)
      expect(records[0][1].attributes).toMatchObject({
        'event.name': 'ego.dump',
        'dump.id': dump.id,
      })
      expect(records[1][1].attributes).toMatchObject({
        'event.name': 'ego.dump.hit',
        'dump.id': dump.id,
        'hit.index': 0,
      })
      expect(JSON.parse(records[1][0])).toEqual(dump.aim.hit)
    }
  } finally {
    dir.mockRestore()
    warn.mockRestore()
    geometry.dispose()
    material.dispose()
  }
})
