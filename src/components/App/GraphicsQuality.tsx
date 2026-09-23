import type {ReactNode} from 'react'

import {useState} from 'react'
import {GraphicsQualityProvider} from 'use-graphics-quality'

import {readGraphicsQuality} from '#src/lib/rendering/graphicsQuality.ts'

/** Seed the graphics mode from the permalink, then keep menu changes local to this session. */
export default function GraphicsQuality({children}: {children: ReactNode}) {
  const [isQuality, setIsQuality] = useState(() => readGraphicsQuality())
  return <GraphicsQualityProvider isQuality={isQuality} onChange={setIsQuality}>{children}</GraphicsQualityProvider>
}
