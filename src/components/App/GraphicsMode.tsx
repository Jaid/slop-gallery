import type {ReactNode} from 'react'

import {useState} from 'react'
import {GraphicsModeProvider} from 'use-graphics-mode'

import {readGraphicsMode} from '#src/lib/rendering/graphicsMode.ts'

/** Seed the graphics mode from the permalink, then keep menu changes local to this session. */
export default function GraphicsMode({children}: {children: ReactNode}) {
  const [isHeavy, setIsHeavy] = useState(() => readGraphicsMode())
  return <GraphicsModeProvider isHeavy={isHeavy} onChange={setIsHeavy}>{children}</GraphicsModeProvider>
}
