import type {DataTexture} from 'three/webgpu'

import {useEffect, useState} from 'react'

import loadArtworkTexture from './loadArtworkTexture.ts'

type Asset = {promise: Promise<DataTexture>
  refs: number
  texture?: DataTexture}
const assets = new Map<Blob | string, Asset>
let pending = 0
export const pendingImages = () => pending

export default function useArtworkTexture(source: Blob | string | null | undefined) {
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
        if (assets.get(source) === entry) {
          assets.delete(source)
        }
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
    const promise = loadArtworkTexture(source).finally(() => {
      pending--
    })
    asset = {
      refs: 0,
      promise,
    }
    const entry = asset
    void promise.then(texture => {
      entry.texture = texture
    }).catch(error => {
      if (assets.get(source) === entry) {
        assets.delete(source)
      }
      console.warn('Artwork texture failed to load:', source, error)
    })
    assets.set(source, asset)
  }
  asset.refs++
  return asset
}
