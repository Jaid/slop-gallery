import type {KnotExhibit} from '#src/lib/knots/exhibition.ts'

import flattenString from 'flatten-string'

export const labelAtlasColumns = 10
export const titleStickerWidth = 640
export const titleStickerHeight = 192
export const creatorStickerWidth = 512
export const creatorStickerHeight = 96
export const labelFontFamily = 'main'
export const titleStickerSize = [0.8, 0.24] as const
export const titleStickerY = 0.075
export const creatorStickerSize = [0.75, 0.14] as const
export const creatorStickerY = -0.17
export const accentLineSize = [0.76, 0.009] as const
export const accentLineY = 0.23

export function knotDetailLine(harness?: string, effortLevel?: string) {
  return flattenString.list(harness === 'none' ? 'non-agentic' : harness, effortLevel && `${effortLevel} effort`)
}

export function modelLineLayout(textWidth: number, hasIcon: boolean) {
  const iconSize = hasIcon ? 40 : 0
  const gap = hasIcon ? 12 : 0
  const width = Math.min(textWidth, creatorStickerWidth - 32 - iconSize - gap)
  return {
    left: (creatorStickerWidth - width - iconSize - gap) / 2,
    textWidth: width,
    iconSize,
    gap,
  }
}

export function drawTitleSticker(context: CanvasRenderingContext2D, exhibit: KnotExhibit, x: number, y: number) {
  context.fillStyle = '#122029'
  context.fillRect(x, y, titleStickerWidth, titleStickerHeight)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff3d9'
  context.font = `600 70px ${labelFontFamily}`
  context.fillText(exhibit.label, x + titleStickerWidth / 2, y + 54, titleStickerWidth - 32)
  context.fillStyle = exhibit.accent
  context.font = `600 42px ${labelFontFamily}`
  context.fillText(exhibit.title, x + titleStickerWidth / 2, y + 142, titleStickerWidth - 32)
}

export function drawCreatorSticker(context: CanvasRenderingContext2D, exhibit: KnotExhibit, x: number, y: number, icon?: HTMLImageElement) {
  context.fillStyle = '#122029'
  context.fillRect(x, y, creatorStickerWidth, creatorStickerHeight)
  context.textBaseline = 'middle'
  context.fillStyle = '#c5d0d9'
  context.font = `32px ${labelFontFamily}`
  const {left, textWidth, iconSize, gap} = modelLineLayout(context.measureText(exhibit.modelTitle).width, Boolean(icon))
  if (icon) {
    const scale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const width = icon.naturalWidth * scale
    const height = icon.naturalHeight * scale
    context.drawImage(icon, x + left + (iconSize - width) / 2, y + 31 - height / 2, width, height)
  }
  context.textAlign = 'left'
  context.fillText(exhibit.modelTitle, x + left + iconSize + gap, y + 31, textWidth)
  const detail = knotDetailLine(exhibit.harness, exhibit.author.model.effortLevel)
  if (detail) {
    context.textAlign = 'center'
    context.fillStyle = '#91a0ad'
    context.font = `24px ${labelFontFamily}`
    context.fillText(detail, x + creatorStickerWidth / 2, y + 72, creatorStickerWidth - 24)
  }
}
