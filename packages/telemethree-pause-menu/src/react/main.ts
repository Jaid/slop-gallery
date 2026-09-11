import type {PauseMenuTelemetryOptions} from '../PauseMenuTelemetry.ts'

import {useEffect} from 'react'
import usePauseMenu from 'use-pause-menu'

import PauseMenuTelemetry from '../PauseMenuTelemetry.ts'

/** Subscribe to the menu and deliver its transitions through the caller’s telemetry exporter. */
export default function usePauseMenuTelemetry({menu, telemetry, attributes}: PauseMenuTelemetryOptions) {
  const snapshot = usePauseMenu(menu)
  useEffect(() => new PauseMenuTelemetry({
    menu,
    telemetry,
    attributes,
  }).connect(), [menu, telemetry, attributes])
  return snapshot
}
