import renderCanvasTexture from 'canvas-textures/three'
import {simplex2d} from 'math/noise'
import {mulberry32} from 'math/random'
import {RepeatWrapping, SRGBColorSpace} from 'three/webgpu'

const createMulberry32 = (seed: number) => {
  const state = mulberry32.create(seed)
  return () => mulberry32.sample(state)
}

export function surfaceTexture(kind: 'plaster' | 'stone' | 'wood') {
  const t = renderCanvasTexture({
    width: 512,
    height: 512,
    draw(ctx) {
      ctx.fillStyle = kind === 'wood' ? '#735139' : (kind === 'stone' ? '#c9c3b1' : '#e5e0d2')
      ctx.fillRect(0, 0, 512, 512)
      const rand = createMulberry32(91)
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
    },
  })
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(kind === 'stone' ? 8 : 3, kind === 'stone' ? 8 : 3)
  t.anisotropy = 8
  return t
}

/** Burgundy silk and small stamped rosettes, adapted from the ox_smart-gallery-webgpu reference. */
export function damaskTexture(width: number, height: number) {
  const size = 512
  const texture = renderCanvasTexture({
    width: size,
    height: size,
    draw(context) {
      const random = createMulberry32(7)
      const noise = simplex2d.create(7)
      const pixels = context.createImageData(size, size)
      const base = [87, 18, 26]
      const shade = [42, 6, 11]
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const u = x / size
          const v = y / size
      // Periodic mottling avoids rectangular seams between wallpaper repeats.
          const top = simplex2d.sample(noise, u * 8, v * 8) * (1 - u) + simplex2d.sample(noise, (u - 1) * 8, v * 8) * u
          const bottom = simplex2d.sample(noise, u * 8, (v - 1) * 8) * (1 - u) + simplex2d.sample(noise, (u - 1) * 8, (v - 1) * 8) * u
          const mix = ((top * (1 - v) + bottom * v) * 0.5 + 0.5) * 0.14
          const fiber = (random() - 0.5) * 5
          const offset = (y * size + x) * 4
          for (let channel = 0; channel < 3; channel++) {
            pixels.data[offset + channel] = base[channel] * (1 - mix) + shade[channel] * mix + fiber
          }
          pixels.data[offset + 3] = 255
        }
      }
      context.putImageData(pixels, 0, 0)
      context.fillStyle = '#7c2a33'
      context.globalAlpha = 0.45
      const cell = size / 4
      const radius = cell * 0.3
      for (let row = -1; row < 10; row++) {
        for (let column = -1; column < 6; column++) {
          context.save()
          context.translate(column * cell + (row % 2 === 0 ? 0 : cell / 2), row * cell / 2 + cell / 4)
          for (let petal = 0; petal < 8; petal++) {
            context.rotate(Math.PI / 4)
            context.beginPath()
            context.ellipse(radius * 0.55, 0, radius * 0.45, radius * 0.18, 0, 0, Math.PI * 2)
            context.fill()
          }
          context.beginPath()
          context.arc(0, 0, radius * 0.16, 0, Math.PI * 2)
          context.fill()
          context.restore()
        }
      }
    },
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  // The reference uses 0.55 tiles per meter: rosettes are about 27 cm across.
  texture.repeat.set(width * 0.55, height * 0.55)
  return texture
}

/** Cream and charcoal marble, adapted from the reference run’s vestibule tiles. */
export function checkerMarbleTexture(width: number, depth: number) {
  const size = 512
  const texture = renderCanvasTexture({
    width: size,
    height: size,
    draw(context) {
      const random = createMulberry32(61)
      const noise = simplex2d.create(61)
      const cells = 4
      const cell = size / cells
      for (let row = 0; row < cells; row++) {
        for (let column = 0; column < cells; column++) {
          const dark = (row + column) % 2 === 0
          context.fillStyle = dark ? '#23201d' : '#d8cfbf'
          context.fillRect(column * cell, row * cell, cell, cell)
          context.save()
          context.beginPath()
          context.rect(column * cell, row * cell, cell, cell)
          context.clip()
          for (let vein = 0; vein < 5; vein++) {
            context.strokeStyle = dark ? 'rgba(210,205,195,0.13)' : 'rgba(90,80,70,0.16)'
            context.lineWidth = 1 + random() * 2.2
            context.beginPath()
            let x = column * cell + random() * cell
            let y = row * cell
            context.moveTo(x, y)
            while (y < (row + 1) * cell) {
              x += simplex2d.sample(noise, x * 0.02, y * 0.02) * 14
              y += 10
              context.lineTo(x, y)
            }
            context.stroke()
          }
          context.restore()
        }
      }
      context.strokeStyle = '#151210'
      context.lineWidth = 3
      for (let i = 0; i <= cells; i++) {
        context.beginPath()
        context.moveTo(i * cell, 0)
        context.lineTo(i * cell, size)
        context.moveTo(0, i * cell)
        context.lineTo(size, i * cell)
        context.stroke()
      }
    },
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  // The reference samples 0.36 repeats per meter: each tile is about 69 cm wide.
  texture.repeat.set(width * 0.36, depth * 0.36)
  return texture
}
