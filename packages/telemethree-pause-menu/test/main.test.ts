import type {LogOptions} from 'victoria-browser-client'

import {expect, test} from 'bun:test'

import PauseMenu from 'use-pause-menu/core'
import VictoriaClient from 'victoria-browser-client'

import PauseMenuTelemetry from '../src/main.ts'

class TestClient extends VictoriaClient {
  readonly logs: Array<{
    message: string
    options: LogOptions
  }> = []
  constructor() {
    super({
      serviceName: 'telemethree-pause-menu-test',
      endpoint: 'http://localhost:4318',
      interval: false,
    })
  }
  override log(message: string, options: LogOptions = {}) {
    this.logs.push({
      message,
      options,
    })
    return true
  }
}
test('pause-menu logs capture reset resolution and clean up without duplicate subscriptions', () => {
  const telemetry = new TestClient
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
  const logs = telemetry.logs.map(({options}) => options.attributes ?? {})
  expect(logs.map(log => log['event.name'])).toEqual(['pause_menu.attached', 'pause_menu.changed', 'pause_menu.changed', 'pause_menu.detached'])
  expect(logs.map(log => log['pause_menu.stage'])).toEqual(['return', 'reset', 'return', 'return'])
  expect(logs.every(log => log.level === 'test')).toBe(true)
  expect(logs[1]['pause_menu.previous_stage']).toBe('return')
})
