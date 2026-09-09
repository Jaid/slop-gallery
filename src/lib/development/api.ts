import type {AimSnapshot} from './AimInspector.ts'
import type {Telemetry} from 'telemethree'

export type DevelopmentApi = {
  getAim: () => AimSnapshot
  getTelemetry?: () => {sessionId: string
    signals: ReturnType<Telemetry['status']>} | null
}

type DevelopmentHost = {'slop.gallery'?: DevelopmentApi}

/** Install only on explicit opt-in and release only the namespace this mount owns. */
export function installDevelopmentApi(host: DevelopmentHost, search: string, createApi: () => DevelopmentApi) {
  if (new URLSearchParams(search).get('development') !== 'true') {
    return
  }
  const previous = host['slop.gallery']
  const api = createApi()
  host['slop.gallery'] = api
  return () => {
    if (host['slop.gallery'] !== api) {
      return
    }
    if (previous === undefined) {
      delete host['slop.gallery']
    } else {
      host['slop.gallery'] = previous
    }
  }
}

declare global {
  interface Window {
    'slop.gallery'?: DevelopmentApi
  }
}
