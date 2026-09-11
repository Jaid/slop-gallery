import type {KnotExhibit} from '#src/lib/knots/exhibition.ts'

export const labelWidth = 768
export const labelHeight = 320
export const labelFontFamily = 'main'

export function modelLineLayout(textWidth: number, hasIcon: boolean) {
  const iconSize = hasIcon ? 52 : 0
  const gap = hasIcon ? 16 : 0
  const width = Math.min(textWidth, labelWidth - 48 - iconSize - gap)
  return {
    left: (labelWidth - width - iconSize - gap) / 2,
    textWidth: width,
    iconSize,
    gap,
  }
}

export function drawLabel(context: CanvasRenderingContext2D, exhibit: KnotExhibit, x: number, y: number, icon?: HTMLImageElement) {
  context.fillStyle = '#122029'
  context.fillRect(x, y, labelWidth, labelHeight)
  context.fillStyle = exhibit.accent
  context.fillRect(x + 24, y + 16, labelWidth - 48, 8)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff3d9'
  context.font = `600 84px ${labelFontFamily}`
  context.fillText(exhibit.label, x + labelWidth / 2, y + 80, labelWidth - 48)
  context.fillStyle = exhibit.accent
  context.font = `600 46px ${labelFontFamily}`
  context.fillText(exhibit.title, x + labelWidth / 2, y + 184, labelWidth - 48)
  context.fillStyle = '#c5d0d9'
  context.font = `44px ${labelFontFamily}`
  const {left, textWidth, iconSize, gap} = modelLineLayout(context.measureText(exhibit.modelTitle).width, Boolean(icon))
  if (icon) {
    const scale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const width = icon.naturalWidth * scale
    const height = icon.naturalHeight * scale
    context.drawImage(icon, x + left + (iconSize - width) / 2, y + 264 - height / 2, width, height)
  }
  context.textAlign = 'left'
  context.fillText(exhibit.modelTitle, x + left + iconSize + gap, y + 264, textWidth)
}
