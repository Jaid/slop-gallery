import type {KnotExhibit} from '#src/lib/knots/exhibition.ts'

import flattenString from 'flatten-string'

export const labelAtlasColumns = 10
export const titleStickerWidth = 320
export const titleStickerHeight = 96
export const creatorStickerWidth = 256
export const creatorStickerHeight = 48
export const labelFontFamily = 'main'
export const labelBackground = '#122029'
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
  const iconSize = hasIcon ? 20 : 0
  const gap = hasIcon ? 6 : 0
  const width = Math.min(textWidth, creatorStickerWidth - 16 - iconSize - gap)
  return {
    left: (creatorStickerWidth - width - iconSize - gap) / 2,
    textWidth: width,
    iconSize,
    gap,
  }
}

export function drawTitleSticker(context: CanvasRenderingContext2D, exhibit: KnotExhibit, x: number, y: number) {
  context.fillStyle = labelBackground
  context.fillRect(x, y, titleStickerWidth, titleStickerHeight)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff3d9'
  context.font = `600 35px ${labelFontFamily}`
  context.fillText(exhibit.label, x + titleStickerWidth / 2, y + 27, titleStickerWidth - 16)
  context.fillStyle = exhibit.accent
  context.font = `600 21px ${labelFontFamily}`
  context.fillText(exhibit.title, x + titleStickerWidth / 2, y + 71, titleStickerWidth - 16)
}

export function drawCreatorSticker(context: CanvasRenderingContext2D, exhibit: KnotExhibit, x: number, y: number, icon?: HTMLImageElement) {
  context.fillStyle = labelBackground
  context.fillRect(x, y, creatorStickerWidth, creatorStickerHeight)
  context.textBaseline = 'middle'
  context.fillStyle = '#c5d0d9'
  context.font = `16px ${labelFontFamily}`
  const {left, textWidth, iconSize, gap} = modelLineLayout(context.measureText(exhibit.modelTitle).width, Boolean(icon))
  if (icon) {
    const scale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const width = icon.naturalWidth * scale
    const height = icon.naturalHeight * scale
    context.drawImage(icon, x + left + (iconSize - width) / 2, y + 15.5 - height / 2, width, height)
  }
  context.textAlign = 'left'
  context.fillText(exhibit.modelTitle, x + left + iconSize + gap, y + 15.5, textWidth)
  const detail = knotDetailLine(exhibit.harness, exhibit.author.model.effortLevel)
  if (detail) {
    context.textAlign = 'center'
    context.fillStyle = '#91a0ad'
    context.font = `12px ${labelFontFamily}`
    context.fillText(detail, x + creatorStickerWidth / 2, y + 36, creatorStickerWidth - 12)
  }
}
