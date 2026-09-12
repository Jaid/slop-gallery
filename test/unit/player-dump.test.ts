import type {EgoDump, EgoState} from 'ego-player'

import {expect, spyOn, test} from 'bun:test'
import {resolve} from 'node:path'

import {BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene} from 'three/webgpu'

import EgoDiagnostics from '../../packages/ego-player/src/EgoDiagnostics.ts'

test('player dumps preserve precision, join separate hit logs and respect disabled telemetry', async () => {
  const source = resolve(import.meta.dir, '../../src/lib/telemetry/recordPlayerDump.ts')
  const scene = new Scene
  const camera = new PerspectiveCamera
  const geometry = new BoxGeometry
  const material = new MeshBasicMaterial
  const mesh = new Mesh(geometry, material)
  mesh.position.z = -3.123_456_789
  scene.add(mesh)
  const dump = new EgoDiagnostics(scene, camera).capture({} as EgoState, {dump: true})
  const dir = spyOn(console, 'dir').mockImplementation(() => {})
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  try {
    for (const [enabled, sound, audioFails] of [[true, true, false], [false, true, false], [true, false, false], [false, false, false], [true, true, true], [false, true, true]]) {
      const build = await Bun.build({
        entrypoints: [source],
        target: 'bun',
        plugins: [
          {
            name: 'isolated-dump-adapters',
            setup(builder) {
              builder.onLoad({filter: /recordPlayerDump\.ts$/u}, async () => ({
                loader: 'ts',
                contents: `${await Bun.file(source).text()}\nexport {telemetry}; export {played} from "../audio/soundEffects.ts"; export {default as SoundEngine} from "../audio/SoundEngine.ts"`,
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
              builder.onLoad({filter: /lib[/\\]level\.ts$/u}, () => ({
                loader: 'ts',
                contents: "export const galleryLevel = 'knottingham'",
              }))
            },
          },
        ],
      })
      expect(build.success).toBe(true)
      const module = await import(`data:text/javascript;base64,${Buffer.from(await build.outputs[0].text()).toString('base64')}`) as {
        default: (dump: EgoDump) => void
        played: Array<string>
        SoundEngine: {requests: number}
        telemetry: {records: Array<[string, string, Record<string, unknown>]>} | null
      }
      module.default(dump)
      await Bun.sleep(0)
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
      if (enabled) {
        const records = module.telemetry!.records
        expect(records).toHaveLength(2)
        const summary = JSON.parse(records[0][0]) as EgoDump & {hitCount: number}
        expect(summary.aim.hit!.point).toEqual(dump.aim.hit!.point)
        expect(summary.aim.hits).toBeUndefined()
        expect(summary.hitCount).toBe(1)
        expect(records[0][2]).toMatchObject({
          'event.name': 'ego.dump',
          'dump.id': dump.id,
        })
        expect(records[1][2]).toMatchObject({
          'event.name': 'ego.dump.hit',
          'dump.id': dump.id,
          'hit.index': 0,
        })
        expect(JSON.parse(records[1][0])).toEqual(dump.aim.hit)
      }
    }
  } finally {
    dir.mockRestore()
    warn.mockRestore()
    geometry.dispose()
    material.dispose()
  }
})
