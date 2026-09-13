import type {KnotExhibit} from '#src/lib/knots/exhibition.ts'

import flattenString from 'flatten-string'

export const labelAtlasColumns = 10
// 847 texels/m exceeds the previous title (800) and creator (686) densities.
// The complete 167-label atlas fits within 8192 in both dimensions.
export const labelWidth = 720
export const labelHeight = 480
export const labelBackground = '#122029'
export const labelFonts = {
  number: '600 74px main',
  title: '600 44.5px main',
  model: '40px main',
  detail: '30px main',
}

export function knotDetailLine(harness?: string, effortLevel?: string) {
  return flattenString.list(harness === 'none' ? 'non-agentic' : harness, effortLevel && `${effortLevel} effort`)
}

export function modelLineLayout(textWidth: number, hasIcon: boolean) {
  const iconSize = hasIcon ? 50 : 0
  const gap = hasIcon ? 15 : 0
  const width = Math.min(textWidth, 596 - iconSize - gap)
  return {
    left: (labelWidth - width - iconSize - gap) / 2,
    textWidth: width,
    iconSize,
    gap,
  }
}

/** Complete face in atlas pixel coordinates; no overlapping sticker geometry. */
export default function drawLabel(context: CanvasRenderingContext2D, exhibit: KnotExhibit, x: number, y: number, icon?: HTMLImageElement) {
  context.fillStyle = labelBackground
  context.fillRect(x, y, labelWidth, labelHeight)
  context.fillStyle = exhibit.accent
  context.fillRect(x + 38, y + 41, 644, 8)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff3d9'
  context.font = labelFonts.number
  context.fillText(exhibit.label, x + labelWidth / 2, y + 132, 644)
  context.fillStyle = exhibit.accent
  context.font = labelFonts.title
  context.fillText(exhibit.title, x + labelWidth / 2, y + 225, 644)
  context.fillStyle = '#c5d0d9'
  context.font = labelFonts.model
  const {left, textWidth, iconSize, gap} = modelLineLayout(context.measureText(exhibit.modelTitle).width, Boolean(icon))
  if (icon) {
    const scale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const width = icon.naturalWidth * scale
    const height = icon.naturalHeight * scale
    context.drawImage(icon, x + left + (iconSize - width) / 2, y + 364 - height / 2, width, height)
  }
  context.textAlign = 'left'
  context.fillText(exhibit.modelTitle, x + left + iconSize + gap, y + 364, textWidth)
  const detail = knotDetailLine(exhibit.harness, exhibit.author.model.effortLevel)
  if (detail) {
    context.textAlign = 'center'
    context.fillStyle = '#91a0ad'
    context.font = labelFonts.detail
    context.fillText(detail, x + labelWidth / 2, y + 414, 606)
  }
}
