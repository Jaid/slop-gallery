import type {ExportBatch} from 'telemethree'

import {expect, test} from 'bun:test'

import Telemetry from 'telemethree'
import PauseMenu from 'use-pause-menu/core'

import PauseMenuTelemetry from '../src/main.ts'

test('pause-menu logs capture reset resolution and clean up without duplicate subscriptions', async () => {
  const batches: Array<ExportBatch> = []
  const telemetry = new Telemetry({
    exporter: {
      export: async batch => {
        batches.push(batch)
      },
    },
  })
  const menu = new PauseMenu({initialStage: 'return'})
  const collector = new PauseMenuTelemetry({
    menu,
    telemetry,
    attributes: {level: 'test'},
  })
  const stop = collector.connect()
  menu.setGameData(false)
  menu.setGameData(false)
  menu.setGameData(true)
  stop()
  stop()
  menu.setGameData(false)
  await telemetry.flush()
  const logs = batches.filter(batch => batch.signal === 'logs').flatMap(batch => batch.records)
  expect(logs.map(log => log.attributes['event.name'])).toEqual(['pause_menu.attached', 'pause_menu.changed', 'pause_menu.changed', 'pause_menu.detached'])
  expect(logs.map(log => log.attributes['pause_menu.stage'])).toEqual(['return', 'reset', 'return', 'return'])
  expect(logs.every(log => log.attributes.level === 'test')).toBe(true)
  expect(logs[1].attributes['pause_menu.previous_stage']).toBe('return')
  await telemetry.dispose()
})
