import {describe, expect, test} from 'bun:test'

import * as captureSession from '../src/main.ts'
import * as script from '../src/script/main.ts'

describe('capture-session', () => {
  test('exports the renderers for the page and the helpers for scripts', () => {
    expect(captureSession.WireframeFloodPass).toBeFunction()
    expect(captureSession.WireframeRenderPipeline).toBeFunction()
    expect(captureSession.applyWireframeFlood).toBeFunction()
    expect(script.sampleWireframe).toBeFunction()
    expect(script.setWireframe).toBeFunction()
  })
})
