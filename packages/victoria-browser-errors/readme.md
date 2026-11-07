# victoria-browser-errors

Uncaught error and unhandled promise rejection logs emitted through `victoria-browser-client`.

```ts
import ErrorTelemetry from 'victoria-browser-errors'

const session = telemetry.startSpan('app.session')
const disconnect = new ErrorTelemetry({
  telemetry,
  eventNamePrefix: 'app.',
  getContext: () => session,
}).connect()
```

Every uncaught error becomes an `error.uncaught` log and every unhandled rejection an `error.unhandled_rejection` log, at level `error`, each name behind the optional `eventNamePrefix`. Connect early, before the code whose errors should count runs.

Records never carry exception messages, which may hold anything. They carry:

| attribute | value |
| --- | --- |
| `error.type` | the error’s name, like `TypeError`, the `typeof` of a thrown non-error, or `UnknownError` for an error the browser hides, like the “Script error.” of a script of another origin |
| `error.occurrence` | how often this error, by its kind, type and position, has happened so far |
| `code.file.path`, `code.line.number`, `code.column.number` | where it was thrown: the error event’s position or the first stack frame, the URL without its query and fragment |
| `code.function.name` | the function of the first stack frame, if named |
| `code.stacktrace` | up to 20 stack frames, one per line, like `name (file:1:2)`, without the message line |

The same error logs at most `limit` times (10 by default), so one thrown every frame cannot flood the queue. `attributes` adds attributes to every record, as an object or a function asked as each record is made. The returned cleanup only removes the listeners; delivery scheduling and browser lifecycle belong to the client.

`parseStack` and `parseFrame` read V8 frames (`at name (url:1:2)`) and SpiderMonkey/JavaScriptCore frames (`name@url:1:2`).
