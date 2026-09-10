import {expect, test} from 'bun:test'

import {NuqsTestingAdapter} from 'nuqs/adapters/testing'
import {renderToStaticMarkup} from 'react-dom/server'

import useGalleryAI from '#src/lib/useGalleryAI.ts'

function ReadSettings() {
  const {params} = useGalleryAI()
  return <pre>{JSON.stringify(params)}</pre>
}
test('model and narration preferences remain configurable through URL parameters', () => {
  const searchParams = new URLSearchParams({
    text_model: 'custom-text',
    image_model: 'custom-image',
    audio_model: 'custom-audio',
    text_model_effort: 'high',
    narrator_voice: 'custom-voice',
    narrator_character: 'custom-character',
    eager_audio: 'true',
  }).toString()
  const html = renderToStaticMarkup(<NuqsTestingAdapter searchParams={searchParams}><ReadSettings/></NuqsTestingAdapter>)
  for (const value of ['custom-text', 'custom-image', 'custom-audio', 'high', 'custom-voice', 'custom-character']) {
    expect(html).toContain(value)
  }
  expect(html).toContain('eager_audio&quot;:true')
})
