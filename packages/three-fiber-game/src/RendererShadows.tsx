import type {ShadowsConfig} from '@react-three/fiber'
import type {ReactNode} from 'react'

import {useStore} from '@react-three/fiber'
import {useLayoutEffect} from 'react'
import {BasicShadowMap, PCFShadowMap, VSMShadowMap} from 'three/webgpu'

const shadowMapTypes = {
  basic: BasicShadowMap,
  percentage: PCFShadowMap,
  variance: VSMShadowMap,
} as const

type RendererShadowsProps = {
  children: ReactNode
  shadows?: Exclude<ShadowsConfig, 'soft'>
}

/** Fiber only applies `shadows` to renderers it builds from a props bag, so a factory-built renderer gets the same mapping here. */
export default function RendererShadows({children, shadows}: RendererShadowsProps) {
  const store = useStore()
  useLayoutEffect(() => {
    if (shadows === undefined) {
      return
    }
    const {shadowMap} = store.getState().renderer
    shadowMap.enabled = Boolean(shadows)
    if (typeof shadows === 'string') {
      shadowMap.type = shadowMapTypes[shadows]
    } else if (typeof shadows === 'object') {
      Object.assign(shadowMap, shadows)
    } else {
      shadowMap.type = PCFShadowMap
    }
  }, [shadows, store])
  return children
}
