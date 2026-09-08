import {RepeatWrapping, SRGBColorSpace} from 'three/webgpu'

import {canvasTexture} from '#src/lib/texture.ts'

export function surfaceTexture(kind: 'plaster' | 'stone' | 'wood') {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = kind === 'wood' ? '#735139' : kind === 'stone' ? '#c9c3b1' : '#e5e0d2'
  ctx.fillRect(0, 0, 512, 512)
  let seed = 91
  const rand = () => {
    seed = seed * 1_664_525 + 1_013_904_223 >>> 0
    return seed / 4_294_967_296
  }
  for (let i = 0; i < 28_000; i++) {
    const x = rand() * 512
    const y = rand() * 512
    const shade = rand()
    ctx.fillStyle = kind === 'wood' ? `rgba(35,20,10,${shade * 0.12})` : `rgba(${shade > 0.5 ? '255,255,240' : '60,57,45'},${rand() * 0.15})`
    if (kind === 'wood') {
      ctx.fillRect(x, y, rand() * 2, rand() * 90)
    } else {
      ctx.beginPath()
      ctx.ellipse(x, y, rand() * (kind === 'stone' ? 2.5 : 1), rand() * 1.6, rand() * 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const t = canvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(kind === 'stone' ? 8 : 3, kind === 'stone' ? 8 : 3)
  t.anisotropy = 8
  return t
}
export function radialTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,233,181,.8)')
  g.addColorStop(0.3, 'rgba(255,225,169,.25)')
  g.addColorStop(1, 'rgba(255,230,180,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return canvasTexture(c)
}
