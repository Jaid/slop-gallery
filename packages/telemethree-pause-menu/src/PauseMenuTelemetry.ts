import type Telemetry from 'telemethree'
import type {Attributes} from 'telemethree'
import type PauseMenu from 'use-pause-menu/core'
import type {PauseMenuSnapshot} from 'use-pause-menu/core'

export type PauseMenuTelemetryOptions = {
  attributes?: Attributes
  menu: PauseMenu
  telemetry: Telemetry
}

/** Discrete menu transitions are logs, not per-frame samples or high-cardinality metric labels. */
export default class PauseMenuTelemetry {
  constructor(private readonly options: PauseMenuTelemetryOptions) {}

  connect() {
    const {menu, telemetry, attributes} = this.options
    menu.start()
    const stop = telemetry.start()
    let previous = menu.getSnapshot()
    const record = (snapshot: PauseMenuSnapshot, event: string, from?: PauseMenuSnapshot) => {
      telemetry.log(`Pause menu: ${snapshot.locked ? 'playing' : snapshot.stage}`, 'info', {
        ...attributes,
        'event.name': `pause_menu.${event}`,
        'pause_menu.stage': snapshot.stage,
        'pause_menu.locked': snapshot.locked,
        ...from ? {
          'pause_menu.previous_stage': from.stage,
          'pause_menu.previous_locked': from.locked,
        } : {},
      })
    }
    record(previous, 'attached')
    const unsubscribe = menu.subscribe(() => {
      const snapshot = menu.getSnapshot()
      if (snapshot.stage !== previous.stage || snapshot.locked !== previous.locked) {
        record(snapshot, 'changed', previous)
        previous = snapshot
      }
    })
    let closed = false
    return () => {
      if (closed) {
        return
      }
      closed = true
      unsubscribe()
      record(menu.getSnapshot(), 'detached')
      stop()
    }
  }
}
