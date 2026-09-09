import type {GraphicsQualityProviderProps} from '../src/main.ts'

import {expect, test} from 'bun:test'

import {renderToStaticMarkup} from 'react-dom/server'

import {GraphicsQualityProvider, useGraphicsQuality, useGraphicsQualityValue, useSetGraphicsQuality} from '../src/main.ts'

const detailed = {samples: 16} as const
const fast = {samples: 0} as const
function selectBudget(isQuality: boolean) {
  return isQuality ? detailed : fast
}
function ReadQuality() {
  const isQuality: boolean = useGraphicsQuality()
  return <span>{String(isQuality)}:{useGraphicsQuality.getName(isQuality)}</span>
}
test('getName converts booleans to lowercase names without a provider', () => {
  const quality: 'performance' | 'quality' = useGraphicsQuality.getName(true)
  const performance: 'performance' | 'quality' = useGraphicsQuality.getName(false)
  expect(quality).toBe('quality')
  expect(performance).toBe('performance')
})
test('selectors receive booleans and preserve selected identity and literal value types', () => {
  let selected: ReturnType<typeof selectBudget> | undefined
  const received: Array<boolean> = []
  function ReadBudget() {
    selected = useGraphicsQualityValue(isQuality => {
      received.push(isQuality)
      return selectBudget(isQuality)
    })
    const samples: 0 | 16 = selected.samples
    return samples
  }
  for (const isQuality of [true, false]) {
    renderToStaticMarkup(<GraphicsQualityProvider isQuality={isQuality} onChange={() => {}}><ReadBudget/></GraphicsQualityProvider>)
    expect(selected).toBe(selectBudget(isQuality))
  }
  expect(received).toEqual([true, false])
})
test('the provider exposes a boolean rather than an enum value', () => {
  const valid: Pick<GraphicsQualityProviderProps, 'isQuality'> = {isQuality: false}
  // @ts-expect-error TS2322 Callers cannot pass enum names as state.
  const invalid: Pick<GraphicsQualityProviderProps, 'isQuality'> = {isQuality: 'quality'}
  expect(valid.isQuality).toBe(false)
  expect(invalid).toBeDefined()
})
test('provider state is controlled, and its boolean change callback passes through unchanged', () => {
  let isQuality = true
  let request: ReturnType<typeof useSetGraphicsQuality> | undefined
  const onChange = (next: boolean) => {
    isQuality = next
  }
  function Controls() {
    request = useSetGraphicsQuality()
    return <ReadQuality/>
  }
  const render = () => renderToStaticMarkup(<GraphicsQualityProvider isQuality={isQuality} onChange={onChange}><Controls/></GraphicsQualityProvider>)
  expect(render()).toBe('<span>true:quality</span>')
  expect(request).toBe(onChange)
  request!(false)
  expect(render()).toBe('<span>false:performance</span>')
  request!(true)
  expect(render()).toBe('<span>true:quality</span>')
})
const outer = () => {}
const inner = () => {}
test('nested providers isolate booleans and callbacks without leaking into sibling roots', () => {
  const callbacks: Array<ReturnType<typeof useSetGraphicsQuality>> = []
  function Read() {
    callbacks.push(useSetGraphicsQuality())
    return <ReadQuality/>
  }
  const html = renderToStaticMarkup(<GraphicsQualityProvider isQuality onChange={outer}>
    <Read/>
    <GraphicsQualityProvider isQuality={false} onChange={inner}><Read/></GraphicsQualityProvider>
    <Read/>
  </GraphicsQualityProvider>)
  expect(html).toBe('<span>true:quality</span><span>false:performance</span><span>true:quality</span>')
  expect(callbacks).toEqual([outer, inner, outer])
  expect(() => renderToStaticMarkup(<ReadQuality/>)).toThrow('requires a GraphicsQualityProvider')
})
test('every hook fails clearly outside a provider', () => {
  for (const hook of [useGraphicsQuality, useSetGraphicsQuality, () => useGraphicsQualityValue(selectBudget)]) {
    function MissingProvider() {
      hook()
      return null
    }
    expect(() => renderToStaticMarkup(<MissingProvider/>)).toThrow('requires a GraphicsQualityProvider')
  }
})
