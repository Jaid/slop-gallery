# telemethree

Three/WebGPU instrumentation for `victoria-browser-client`.

The package owns Three-specific collection only. Queueing, encoding, retries, delivery status, Victoria endpoint behavior and browser page lifecycle are provided by `victoria-browser-client`.

```tsx
import VictoriaClient from 'victoria-browser-client'
import useThreeTelemetry, {TelemetryProvider} from 'telemethree/react'

const telemetry = new VictoriaClient({
  serviceName: 'my-game',
  endpoints: {
    logs: {url: 'https://victoria-logs.example.com/insert/jsonline', format: 'victoria-logs'},
    metrics: {url: 'https://victoria-metrics.example.com/api/v1/import', format: 'victoria-json'},
    traces: 'https://victoria-traces.example.com/insert/opentelemetry/v1/traces',
  },
})

function Metrics() {
  useThreeTelemetry({telemetry})
  return null
}

function App() {
  return <TelemetryProvider telemetry={telemetry}><Metrics /></TelemetryProvider>
}
```

`useThreeTelemetry()` samples renderer work after all render passes, reports bounded frame/work distributions, memory/output state and sparse hitch diagnostics. It accepts an explicit Victoria client or reads one from `TelemetryProvider`.

The hook does not own delivery timers or page lifecycle listeners. A browser Victoria client schedules delivery and handles `pagehide`/visibility lifecycle itself.
