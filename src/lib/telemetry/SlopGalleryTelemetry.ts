import type {GalleryState, GalleryStore, SlopGalleryTelemetryOptions} from './types.ts'
import type {Attributes, Span, TraceContext} from 'telemethree'
import type {EgoTelemetryOptions} from 'telemethree-ego'

import composeId from 'compose-id'
import {Telemetry} from 'telemethree'
import {EgoTelemetry} from 'telemethree-ego'

import {rooms} from '../gallery/walls.ts'
import {VictoriaExporter} from './VictoriaExporter.ts'

export class SlopGalleryTelemetry extends Telemetry {
  readonly sessionId: string
  private gameplay: Span | undefined
  private readonly sampleIntervalMs: number
  private session: Span | undefined
  private startup: Span | undefined

  constructor(options: SlopGalleryTelemetryOptions = {}) {
    const sessionId = options.sessionId ?? composeId()
    const endpoint = (options.endpoint ?? '/api/telemetry').replace(/\/$/u, '')
    super({
      flushIntervalMs: 1000,
      ...options,
      exporter: options.exporter ?? new VictoriaExporter({
        endpoint,
        endpoints: {
          metrics: `${endpoint}/metrics`,
          logs: `${endpoint}/logs`,
          traces: `${endpoint}/traces`,
        },
      }),
      resource: {
        'service.name': 'slop-gallery',
        'service.namespace': 'games',
        'service.version': options.version ?? '0.1.0',
        'deployment.environment.name': options.environment ?? 'development',
        'service.instance.id': sessionId,
        ...options.resource,
      },
    })
    this.sessionId = sessionId
    this.sampleIntervalMs = options.sampleIntervalMs ?? 5000
    if (!Number.isSafeInteger(this.sampleIntervalMs) || this.sampleIntervalMs <= 0) {
      throw new RangeError('sampleIntervalMs must be a positive integer.')
    }
  }

  /** Subscribes once per attachment; every timer/listener/span is paired with cleanup. */
  connect(store: GalleryStore, events?: EventTarget) {
    if (this.session) {
      throw new Error('Mount only one gallery telemetry attachment.')
    }
    const stop = this.start()
    let saving: Span | null = null
    const initial = store.getState()
    this.session = super.startSpan('gallery.session', {room: initial.room})
    if (!initial.ready) {
      this.startup = super.startSpan('gallery.startup', {}, this.session)
    }
    if (initial.locked) {
      this.gameplay = super.startSpan('gallery.gameplay', {room: initial.room}, this.session)
    }
    if (initial.saveStatus === 'saving') {
      saving = this.startSpan('gallery.save')
    }
    this.sample(initial)
    this.event('session.attached', {room: initial.room})
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.locked && !previous.locked) {
        this.gameplay = super.startSpan('gallery.gameplay', {room: state.room}, this.session)
      }
      if (state.room !== previous.room) {
        this.event('room.changed', {
          from: previous.room,
          to: state.room,
        })
      }
      for (const key of ['locked', 'ready', 'panel'] as const) {
        if (state[key] !== previous[key]) {
          this.event(`${key}.changed`, {value: state[key] ?? 'none'})
        }
      }
      if (!state.locked && previous.locked) {
        this.gameplay?.end()
        this.gameplay = undefined
      }
      if (state.ready && !previous.ready) {
        this.startup?.addEvent('gallery.ready')
        this.startup?.end()
        this.startup = undefined
      }
      if (state.revision !== previous.revision) {
        this.event('collection.changed', {portraits: state.portraits.length})
      }
      if (state.resetEpoch !== previous.resetEpoch) {
        this.event('reset')
      }
      if (state.saveStatus !== previous.saveStatus) {
        if (state.saveStatus === 'saving') {
          saving ??= this.startSpan('gallery.save')
        } else if (saving) {
          saving.end(state.saveStatus === 'error' ? 'error' : 'ok', {outcome: state.saveStatus})
          saving = null
        }
        if (state.saveStatus === 'error') {
          this.log('Gallery persistence failed.', 'error', {'event.name': 'gallery.save.failed'})
        }
      }
      if (state.narration?.status !== previous.narration?.status || state.narration?.source !== previous.narration?.source) {
        this.event('narration.changed', {
          status: state.narration?.status ?? 'idle',
          source: state.narration?.source ?? 'none',
        })
      }
    })
    const listeners = ['imported', 'merge', 'narrate', 'stop-narration', 'teleport'].map(name => {
      const listener = () => this.event(`${name}.requested`)
      events?.addEventListener(name, listener)
      return () => events?.removeEventListener(name, listener)
    })
    const timer = setInterval(() => this.sample(store.getState()), this.sampleIntervalMs)
    let closed = false
    return () => {
      if (closed) {
        return
      }
      closed = true
      clearInterval(timer)
      unsubscribe()
      for (const remove of listeners) {
        remove()
      }
      saving?.end('unset', {outcome: 'detached'})
      this.event('session.detached')
      this.gameplay?.end('unset', {outcome: 'detached'})
      this.startup?.end('unset', {outcome: 'detached'})
      this.session?.end()
      this.gameplay = undefined
      this.startup = undefined
      this.session = undefined
      stop()
    }
  }

  createEgo(options: Omit<EgoTelemetryOptions, 'telemetry'>) {
    return new EgoTelemetry({
      ...options,
      telemetry: this,
    })
  }

  event(name: string, attributes: Attributes = {}) {
    this.count('gallery.events', 1, {attributes: {event: name}})
    const parent = this.gameplay ?? this.startup ?? this.session
    const span = parent ?? this.startSpan(`gallery.${name}`, attributes)
    parent?.addEvent(`gallery.${name}`, attributes)
    this.log(`Gallery event: ${name}`, 'info', {
      'event.name': `gallery.${name}`,
      ...attributes,
    }, span)
    if (!parent) {
      span.end()
    }
  }

  getContext() {
    return this.gameplay ?? this.startup ?? this.session
  }

  sample(state: GalleryState) {
    this.metric('gallery.portraits', state.portraits.length)
    for (const flag of ['hung', 'pending', 'merging', 'imported'] as const) {
      this.metric(`gallery.portraits.${flag}`, state.portraits.filter(portrait => portrait[flag]).length)
    }
    for (const flag of ['ready', 'locked', 'ai', 'storageRecoveryRequired'] as const) {
      this.metric(`gallery.${flag === 'storageRecoveryRequired' ? 'storage.recovery_required' : flag}`, Number(state[flag]))
    }
    this.metric('gallery.holding', Number(state.held !== null))
    this.metric('gallery.inspecting', Number(state.inspecting !== null))
    this.metric('gallery.narration.active', Number(state.narration !== null))
    this.metric('gallery.save.error', Number(state.saveStatus === 'error'))
    // Emit every bounded room state, so the previous room does not remain at 1.
    for (const {id: room} of rooms) {
      this.metric('gallery.room.active', Number(room === state.room), {attributes: {room}})
    }
  }

  override startSpan(name: string, attributes: Attributes = {}, parent: TraceContext | undefined = this.getContext(), startTime?: number) {
    return super.startSpan(name, attributes, parent, startTime)
  }
}
