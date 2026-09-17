import type {Node} from 'three/webgpu'

import {mx_noise_float, time, vec2, vec3} from 'three/tsl'

import {filament} from '../../candidates/gpt_sol/lib/filament.ts'

export function stormBolt(q: Node<'vec3'>, seed: number) {
  const family = Math.abs(Math.floor(seed * 3)) % 3
  const axis = [
    vec3(0.27, 0.93, 0.24).normalize(),
    vec3(-0.67, 0.46, 0.58).normalize(),
    vec3(0.72, 0.2, -0.66).normalize(),
  ][family]
  const sideSeed = [
    vec3(0.91, -0.31, 0.16),
    vec3(0.3, 0.87, -0.39),
    vec3(0.15, 0.93, 0.34),
  ][family]
  const side = sideSeed
    .sub(axis.mul(sideSeed.dot(axis)))
    .normalize()
  const across = axis.cross(side).normalize()
  const along = q.dot(axis)
  const epoch = time.mul(0.78).floor()
  const jitter = mx_noise_float(vec3(along.mul(3.2), epoch.mul(0.13), seed + 2.1))
  const laneX = q
    .dot(side)
    .mul(2.7)
    .add(along
      .mul(8 + seed * 0.17)
      .sin()
      .mul(0.16))
    .add(jitter.mul(0.34))
    .add(seed * 0.271)
  const laneY = q
    .dot(across)
    .mul(2.7)
    .add(along
      .mul(6.3 + seed * 0.11)
      .cos()
      .mul(0.14))
    .sub(jitter.mul(0.26))
    .add(seed * 0.419)
  const cellX = laneX.add(0.5).fract().sub(0.5)
  const cellY = laneY.add(0.5).fract().sub(0.5)
  const distance = vec2(cellX, cellY).length()
  const footprint = distance.fwidth().max(0.001)
  const core = distance
    .smoothstep(0.018, footprint.mul(1.25).add(0.03))
    .oneMinus()
  const topology = mx_noise_float(q.mul(4.6)
    .add(vec3(seed * 2.7, seed * -4.1, seed * 5.3))
    .add(epoch.mul(0.071)))
  const gate = topology.smoothstep(-0.18, 0.24)
  const flash = time
    .mul(4.7 + seed * 0.11)
    .add(topology.mul(17))
    .sin()
    .mul(0.5)
    .add(0.5)
    .pow(9)
    .mul(0.85)
    .add(0.15)
  const forkField = cellX
    .add(cellY.mul(0.62))
    .add(along
      .mul(13 + seed)
      .sin()
      .mul(0.07))
  const fork = filament(forkField, 0.018)
  const reach = distance.smoothstep(0.09, 0.34).oneMinus()
  const survival = footprint.smoothstep(0.08, 0.3).oneMinus()
  return core
    .mul(gate)
    .mul(flash)
    .add(fork
      .mul(reach)
      .mul(gate)
      .mul(flash)
      .mul(0.35))
    .mul(survival)
    .clamp()
}
