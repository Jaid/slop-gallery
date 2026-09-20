import type {WebGPURenderer} from 'three/webgpu'

import {expect, test} from 'bun:test'

import Info from 'three/src/renderers/common/Info.js'
import {Group, InspectorBase, InstancedMesh, Mesh, Scene} from 'three/webgpu'

import {ThreeStatistics} from '../src/main.ts'
import TestTelemetry from './TestTelemetry.ts'

function testRenderer() {
  return {
    info: new Info,
    backend: {isWebGPUBackend: true},
    inspector: new InspectorBase,
    getPixelRatio: () => 2,
    getDrawingBufferSize: (target: {set: (x: number, y: number) => unknown}) => target.set(1920, 1080),
    samples: 0,
  } as unknown as WebGPURenderer
}
function fixture() {
  let now = 1000
  const telemetry = new TestTelemetry(() => now)
  return {
    telemetry,
    advance: (ms: number) => {
      now += ms
    },
  }
}
test('Three statistics include all passes and distinguish draw calls from cumulative render calls', () => {
  const {telemetry} = fixture()
  const renderer = testRenderer()
  const {info} = renderer
  info.render.calls = 9999
  info.memory.geometries = 3
  info.memory.textures = 4
  info.memory.total = 1200
  info.memory.programs = 6
  const scene = new Scene
  const hidden = new Group
  hidden.visible = false
  hidden.add(new Mesh)
  scene.add(new Mesh, hidden, new InstancedMesh(undefined, undefined, 8))
  const stats = new ThreeStatistics(telemetry, renderer, scene, {intervalMs: 1000})
  const stop = stats.connect()
  expect(info.autoReset).toBe(false)
  expect(() => new ThreeStatistics(telemetry, renderer, scene).connect()).toThrow()
  stats.endFrame(0.1)
  for (let frame = 1; frame <= 100; frame++) {
    stats.beginFrame()
    info.render.drawCalls += 3
    info.render.triangles += 20
    info.render.drawCalls += 5
    info.render.triangles += 30
    stats.endFrame(0.01)
  }
  const metrics = Object.fromEntries(telemetry.metrics.map(metric => [metric.name, metric.value]))
  expect(metrics).toMatchObject({
    'three.fps': 100,
    'three.frame.duration.p95': 10,
    'three.frame.duration.p99': 10,
    'three.render.draw_calls.mean': 8,
    'three.render.triangles.mean': 50,
    'three.scene.meshes': 3,
    'three.scene.visible_meshes': 2,
    'three.scene.instances': 8,
  })
  const before = telemetry.metrics.length
  stats.reset()
  stats.endFrame(3600)
  expect(telemetry.metrics).toHaveLength(before)
  stop()
  stop()
  expect(info.autoReset).toBe(true)
})
test('p95/p99 use nearest-rank WebGPU frame durations', () => {
  const {telemetry} = fixture()
  const renderer = testRenderer()
  const {info} = renderer
  info.autoReset = false
  info.render.drawCalls = 7
  const stats = new ThreeStatistics(telemetry, renderer, new Scene, {
    intervalMs: 5050,
    maxSamples: 100,
  })
  const stop = stats.connect()
  stats.endFrame(0.01)
  for (let duration = 1; duration <= 100; duration++) {
    stats.endFrame(duration / 1000)
  }
  const metrics = Object.fromEntries(telemetry.metrics.map(metric => [metric.name, metric.value]))
  expect(metrics['three.frame.duration.p95']).toBe(95)
  expect(metrics['three.frame.duration.p99']).toBe(99)
  expect(metrics['three.fps']).toBeCloseTo(1000 / 50.5)
  expect(metrics['three.render.draw_calls.mean']).toBe(7)
  stop()
  expect(info.autoReset).toBe(false)
})
test('statistics flush at capacity without silently losing older frames', () => {
  const {telemetry} = fixture()
  const renderer = testRenderer()
  const statistics = new ThreeStatistics(telemetry, renderer, new Scene, {
    intervalMs: 15,
    maxSamples: 3,
  })
  const stop = statistics.connect()
  statistics.endFrame(0.1)
  for (const milliseconds of [1, 2, 3, 4, 5]) {
    statistics.endFrame(milliseconds / 1000)
  }
  const metrics = Object.fromEntries(telemetry.metrics.map(metric => [metric.name, metric.value]))
  expect(metrics).toMatchObject({
    'three.frame.samples': 3,
    'three.frame.duration.mean': 2,
    'three.frame.duration.p99': 3,
  })
  stop()
})
test('Three statistics reject a renderer running the WebGL fallback backend', () => {
  const {telemetry} = fixture()
  const renderer = {
    info: new Info,
    backend: {isWebGLBackend: true},
  } as unknown as WebGPURenderer
  const statistics = new ThreeStatistics(telemetry, renderer, new Scene)
  expect(() => statistics.connect()).toThrow('native WebGPU')
  expect(renderer.info.autoReset).toBe(true)
})
