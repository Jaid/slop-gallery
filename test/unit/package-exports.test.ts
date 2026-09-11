import {expect, test} from 'bun:test'
import {dirname} from 'node:path'

import * as ego from 'ego-player'
import * as motor from 'ego-player/motor'
import fs from 'fs-extra'
import * as telemetry from 'telemethree'
import * as egoTelemetry from 'telemethree-ego'
import * as pauseTelemetry from 'telemethree-pause-menu'
import * as game from 'three-fiber-game'
import * as graphics from 'use-graphics-quality'
import * as pause from 'use-pause-menu'
import * as pauseCore from 'use-pause-menu/core'
import * as capture from 'webgpu-capture-bridge'

test('primary package exports have one canonical default and no named alias', () => {
  for (const [module, name] of [[ego, 'EgoPlayer'], [telemetry, 'Telemetry'], [egoTelemetry, 'EgoTelemetry'], [pauseTelemetry, 'PauseMenuTelemetry'], [game, 'Game'], [graphics, 'useGraphicsQuality'], [pause, 'usePauseMenu'], [pauseCore, 'PauseMenu'], [capture, 'WebgpuCapture']] as const) {
    expect(module.default).toBeFunction()
    expect(Object.hasOwn(module, name)).toBe(false)
  }
  expect(pause.PauseMenu).toBe(pauseCore.default)
  expect(motor.default).toBe(ego.EgoMotor)
  expect(Object.hasOwn(motor, 'EgoMotor')).toBe(false)
  expect(ego.egoControls.interact).toBe('KeyE')
  expect(ego.egoControls.zoom).toBe('KeyZ')
  expect(ego.egoControls.dump).toBe('KeyX')
})
test('React Rapier and direct physics imports resolve the same 0.20 installation', async () => {
  const react = Bun.resolveSync('@react-three/rapier', import.meta.dir)
  const direct = Bun.resolveSync('@dimforge/rapier3d-compat', import.meta.dir)
  const nested = Bun.resolveSync('@dimforge/rapier3d-compat', dirname(react))
  expect(await fs.realpath(nested)).toBe(await fs.realpath(direct))
  const rapier = await import('@dimforge/rapier3d-compat')
  await rapier.init()
  expect(rapier.version()).toBe('0.20.0')
})
