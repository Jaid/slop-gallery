import type {ReactNode} from 'react'

import {useState} from 'react'
import {GraphicsModeProvider} from 'use-graphics-mode'

import {readCinematicGraphics, readInitialGraphicsMode, storeGraphicsMode} from '#src/lib/rendering/graphicsMode.ts'

/** Seed the graphics mode from the permalink, or else from the player’s last switch in the menu, which is remembered for later visits. Cinematic graphics only come from the permalink and return whenever the menu switches back to heavy. */
export default function GraphicsMode({children}: {children: ReactNode}) {
  const [isHeavy, setIsHeavy] = useState(() => readInitialGraphicsMode())
  const [isCinematic] = useState(() => readCinematicGraphics())
  return <GraphicsModeProvider
    isCinematic={isCinematic} isHeavy={isHeavy} onChange={heavy => {
      setIsHeavy(heavy)
      storeGraphicsMode(heavy)
    }}
  >{children}</GraphicsModeProvider>
}
