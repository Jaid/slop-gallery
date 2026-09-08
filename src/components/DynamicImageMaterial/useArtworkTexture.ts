import type {DataTexture} from 'three/webgpu'

import {useEffect, useState} from 'react'
import {LinearMipmapLinearFilter, SRGBColorSpace} from 'three/webgpu'

import {canvasTexture} from '#src/lib/texture.ts'

type Asset = {promise: Promise<DataTexture>
  refs: number
  texture?: DataTexture}
const assets = new Map<Blob | string, Asset>
let pending = 0
export const pendingImages = () => pending

export function useArtworkTexture(source: Blob | string | null | undefined) {
  const [result, setResult] = useState<{failed: boolean
    texture: DataTexture | null}>({
    texture: null,
    failed: false,
  })
  useEffect(() => {
    if (!source) {
      setResult({
        texture: null,
        failed: false,
      })
      return
    }
    const entry = acquire(source)
    let active = true
    setResult({
      texture: entry.texture ?? null,
      failed: false,
    })
    void entry.promise.then(texture => {
      if (active) {
        setResult({
          texture,
          failed: false,
        })
      }
    }).catch(() => {
      if (active) {
        setResult({
          texture: null,
          failed: true,
        })
      }
    })
    return () => {
      active = false
      entry.refs--
      queueMicrotask(() => {
        if (entry.refs !== 0) {
          return
        }
        assets.delete(source)
        void entry.promise.then(texture => texture.dispose()).catch(() => {})
      })
    }
  }, [source])
  return result
}

function acquire(source: Blob | string) {
  let asset = assets.get(source)
  if (!asset) {
    pending++
    const promise = (async () => {
      const response = typeof source === 'string' ? await fetch(source, {signal: AbortSignal.timeout(20_000)}) : null
      if (response && !response.ok) {
        throw new Error('Artwork image could not be loaded.')
      }
      const bitmap = await createImageBitmap(response ? await response.blob() : source as Blob)
      try {
        const scale = Math.min(1, 3072 / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')!
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const texture = canvasTexture(canvas)
        texture.colorSpace = SRGBColorSpace
        texture.minFilter = LinearMipmapLinearFilter
        texture.anisotropy = 16
        return texture
      } finally {
        bitmap.close()
      }
    })().finally(() => {
      pending--
    })
    asset = {
      refs: 0,
      promise,
    }
    const entry = asset
    void promise.then(texture => {
      entry.texture = texture
    }).catch(() => {})
    assets.set(source, asset)
  }
  asset.refs++
  return asset
}
