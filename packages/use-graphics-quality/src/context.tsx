import type {ReactNode} from 'react'

import {createContext, useContext} from 'react'

export type GraphicsQualityProviderProps = {
  children: ReactNode
  isQuality: boolean
  onChange: (isQuality: boolean) => void
}

const QualityContext = createContext<boolean | null>(null)
const ChangeContext = createContext<GraphicsQualityProviderProps['onChange'] | null>(null)

/** Controlled state: the application owns defaults, persistence and transitions. */
export function GraphicsQualityProvider({children, isQuality, onChange}: GraphicsQualityProviderProps) {
  return <QualityContext value={isQuality}><ChangeContext value={onChange}>{children}</ChangeContext></QualityContext>
}

/** Read whether quality is enabled without subscribing to the change callback. */
export function useGraphicsQuality() {
  const isQuality = useContext(QualityContext)
  if (isQuality === null) {
    throw new Error('useGraphicsQuality requires a GraphicsQualityProvider.')
  }
  return isQuality
}

/** Format a boolean for labels or serialization; no React provider is required. */
useGraphicsQuality.getName = (isQuality: boolean) => {
  return isQuality ? 'quality' : 'performance'
}

/** Request a change; the provider’s owner decides when to commit the boolean. */
export function useSetGraphicsQuality() {
  const onChange = useContext(ChangeContext)
  if (onChange === null) {
    throw new Error('useSetGraphicsQuality requires a GraphicsQualityProvider.')
  }
  return onChange
}

/** Derive a value from isQuality without enum keys, cloning or implicit resource ownership. */
export function useGraphicsQualityValue<Value>(select: (isQuality: boolean) => Value): Value {
  return select(useGraphicsQuality())
}
