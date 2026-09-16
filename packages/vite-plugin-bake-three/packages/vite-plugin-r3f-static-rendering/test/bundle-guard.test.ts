import type {WebGPURenderer} from 'three/webgpu'

import {expect, test} from 'bun:test'

import {DataTexture, Fog, MeshBasicNodeMaterial, PointLight, Scene} from 'three/webgpu'

import {bundleSignature} from '../src/runtimeBundleGuard.ts'

function fixture() {
  const scene = new Scene
  const fields = {
    lighting: {enabled: true},
    shadowMap: {
      enabled: true,
      type: 1,
    },
    toneMapping: 0,
    outputColorSpace: 'srgb',
    xr: {isPresenting: false},
    info: {calls: 0},
  }
  const renderer = fields as unknown as WebGPURenderer
  const next = () => {
    fields.info.calls++; return bundleSignature(scene, renderer, fields.info.calls)
  }
  return {
    scene,
    fields,
    renderer,
    next,
  }
}
test('invalidates bundles for light topology, visibility, shadow and render-setting changes', () => {
  const {scene, fields, next} = fixture()
  let last = next()
  const changed = () => {
    const value = next(); expect(value).not.toBe(last); last = value
  }
  const light = new PointLight
  scene.add(light)
  changed()
  light.visible = false
  changed()
  light.visible = true
  changed()
  light.castShadow = true
  changed()
  light.shadow.mapSize.set(1024, 1024)
  changed()
  fields.shadowMap.enabled = false
  changed()
  fields.lighting.enabled = false
  changed()
  fields.toneMapping = 4
  changed()
  scene.fog = new Fog('#fff', 1, 20)
  changed()
  scene.environment = new DataTexture(new Uint8Array(4), 1, 1)
  changed()
  scene.overrideMaterial = new MeshBasicNodeMaterial
  changed()
  scene.overrideMaterial.needsUpdate = true
  changed()
  scene.remove(light)
  changed()
})
test('stable uniform values do not force bundle re-recording and scans are shared per frame', () => {
  const {scene, fields, renderer, next} = fixture()
  const light = new PointLight
  scene.add(light)
  const first = next()
  light.intensity = 12
  light.position.x = 3
  expect(next()).toBe(first)
  const traverse = scene.traverseVisible.bind(scene)
  let scans = 0
  scene.traverseVisible = callback => {
    scans++; traverse(callback)
  }
  fields.info.calls++
  bundleSignature(scene, renderer, fields.info.calls)
  bundleSignature(scene, renderer, fields.info.calls)
  expect(scans).toBe(1)
})
