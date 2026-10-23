import type {ReactNode} from 'react'

import {useState} from 'react'
import {GraphicsModeProvider} from 'use-graphics-mode'

import {readCinematicGraphics, readGraphicsMode} from '#src/lib/rendering/graphicsMode.ts'

/** Seed the graphics mode from the permalink, then keep menu changes local to this session. Cinematic graphics only come from the permalink and return whenever the menu switches back to heavy. */
export default function GraphicsMode({children}: {children: ReactNode}) {
  const [isHeavy, setIsHeavy] = useState(() => readGraphicsMode())
  const [isCinematic] = useState(() => readCinematicGraphics())
  return <GraphicsModeProvider isCinematic={isCinematic} isHeavy={isHeavy} onChange={setIsHeavy}>{children}</GraphicsModeProvider>
}
