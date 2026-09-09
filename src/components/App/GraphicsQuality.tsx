import type {ReactNode} from 'react'

import {useQueryState} from 'nuqs'
import {GraphicsQualityProvider} from 'use-graphics-quality'

import {notify} from '#src/lib/gallery.ts'
import {graphicsQualityParser} from '#src/lib/rendering/graphicsQuality.ts'

/** URL state is shared by the menu and Canvas, independently of AI preferences. */
export default function GraphicsQuality({children}: {children: ReactNode}) {
  const [isQuality, setIsQuality] = useQueryState('graphics', graphicsQualityParser)
  return <GraphicsQualityProvider isQuality={isQuality} onChange={nextIsQuality => {
    // eslint-disable-next-line promise/prefer-await-to-then -- Handle asynchronous URL failures at the synchronous React callback boundary.
    setIsQuality(nextIsQuality).catch(() => notify('The graphics preference could not be written to the URL.'))
  }}>{children}</GraphicsQualityProvider>
}
