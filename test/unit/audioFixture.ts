import {mock} from 'bun:test'

const param = () => ({
  value: 1,
  setValueAtTime: mock((_value: number, _time: number) => {}),
  setTargetAtTime: mock((_value: number, _time: number, _constant: number) => {}),
  linearRampToValueAtTime: mock((_value: number, _time: number) => {}),
  exponentialRampToValueAtTime: mock((_value: number, _time: number) => {}),
  cancelAndHoldAtTime: mock((_time: number) => {}),
})
const node = () => ({
  connect: mock((target: unknown) => target),
  disconnect: mock(() => {}),
})
const gain = () => ({
  ...node(),
  gain: param(),
})
const filter = () => ({
  ...node(),
  frequency: param(),
  Q: param(),
  type: 'lowpass',
})
const source = () => Object.assign(new EventTarget, node(), {
  type: 'sine',
  frequency: param(),
  buffer: null,
  loop: false,
  start: mock((_time: number) => {}),
  stop: mock((_time: number) => {}),
})

export default function audioFixture() {
  const gains: Array<ReturnType<typeof gain>> = []
  const sources: Array<ReturnType<typeof source>> = []
  const filters: Array<ReturnType<typeof filter>> = []
  const buffers: Array<Float32Array> = []
  const context = {
    currentTime: 0,
    sampleRate: 48_000,
    state: 'running',
    destination: node(),
    resume: mock(async () => {}),
    createGain() {
      const result = gain()
      gains.push(result)
      return result
    },
    createBiquadFilter() {
      const result = filter()
      filters.push(result)
      return result
    },
    createOscillator() {
      const result = source()
      sources.push(result)
      return result
    },
    createBufferSource() {
      return this.createOscillator()
    },
    createBuffer(_channels: number, length: number, _rate: number) {
      const data = new Float32Array(length)
      buffers.push(data)
      return {getChannelData: () => data}
    },
  }
  return {
    context,
    gains,
    sources,
    filters,
    buffers,
  }
}
