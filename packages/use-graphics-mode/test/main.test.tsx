import type {GraphicsModeProviderProps} from '../src/main.ts'

import {expect, test} from 'bun:test'

import {renderToStaticMarkup} from 'react-dom/server'

import useGraphicsMode, {GraphicsModeProvider, useGraphicsModeValue, useSetGraphicsMode} from '../src/main.ts'

const heavyBudget = {samples: 16} as const
const fastBudget = {samples: 0} as const
function selectBudget(isHeavy: boolean) {
  return isHeavy ? heavyBudget : fastBudget
}
function ReadMode() {
  const isHeavy: boolean = useGraphicsMode()
  return <span>{String(isHeavy)}:{useGraphicsMode.getName(isHeavy)}</span>
}
test('getName converts booleans to lowercase names without a provider', () => {
  const heavy: 'fast' | 'heavy' = useGraphicsMode.getName(true)
  const fast: 'fast' | 'heavy' = useGraphicsMode.getName(false)
  expect(heavy).toBe('heavy')
  expect(fast).toBe('fast')
})
test('selectors receive booleans and preserve selected identity and literal value types', () => {
  let selected: ReturnType<typeof selectBudget> | undefined
  const received: Array<boolean> = []
  function ReadBudget() {
    selected = useGraphicsModeValue(isHeavy => {
      received.push(isHeavy)
      return selectBudget(isHeavy)
    })
    const samples: 0 | 16 = selected.samples
    return samples
  }
  for (const isHeavy of [true, false]) {
    renderToStaticMarkup(<GraphicsModeProvider isHeavy={isHeavy} onChange={() => {}}><ReadBudget /></GraphicsModeProvider>)
    expect(selected).toBe(selectBudget(isHeavy))
  }
  expect(received).toEqual([true, false])
})
test('the provider exposes a boolean rather than an enum value', () => {
  const valid: Pick<GraphicsModeProviderProps, 'isHeavy'> = {isHeavy: false}
  // @ts-expect-error TS2322 Callers cannot pass enum names as state.
  const invalid: Pick<GraphicsModeProviderProps, 'isHeavy'> = {isHeavy: 'heavy'}
  expect(valid.isHeavy).toBe(false)
  expect(invalid).toBeDefined()
})
test('provider state is controlled, and its boolean change callback passes through unchanged', () => {
  let isHeavy = true
  let request: ReturnType<typeof useSetGraphicsMode> | undefined
  const onChange = (next: boolean) => {
    isHeavy = next
  }
  function Controls() {
    request = useSetGraphicsMode()
    return <ReadMode />
  }
  const render = () => renderToStaticMarkup(<GraphicsModeProvider isHeavy={isHeavy} onChange={onChange}><Controls /></GraphicsModeProvider>)
  expect(render()).toBe('<span>true:heavy</span>')
  expect(request).toBe(onChange)
  request!(false)
  expect(render()).toBe('<span>false:fast</span>')
  request!(true)
  expect(render()).toBe('<span>true:heavy</span>')
})
const outer = () => {}
const inner = () => {}
test('nested providers isolate booleans and callbacks without leaking into sibling roots', () => {
  const callbacks: Array<ReturnType<typeof useSetGraphicsMode>> = []
  function Read() {
    callbacks.push(useSetGraphicsMode())
    return <ReadMode />
  }
  const html = renderToStaticMarkup(<GraphicsModeProvider isHeavy onChange={outer}>
    <Read />
    <GraphicsModeProvider isHeavy={false} onChange={inner}><Read /></GraphicsModeProvider>
    <Read />
  </GraphicsModeProvider>)
  expect(html).toBe('<span>true:heavy</span><span>false:fast</span><span>true:heavy</span>')
  expect(callbacks).toEqual([outer, inner, outer])
  expect(() => renderToStaticMarkup(<ReadMode />)).toThrow('requires a GraphicsModeProvider')
})
test('every hook fails clearly outside a provider', () => {
  for (const hook of [useGraphicsMode, useSetGraphicsMode, () => useGraphicsModeValue(selectBudget)]) {
    function MissingProvider() {
      hook()
      return null
    }
    expect(() => renderToStaticMarkup(<MissingProvider />)).toThrow('requires a GraphicsModeProvider')
  }
})
