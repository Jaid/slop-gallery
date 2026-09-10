import type {KnotExhibit} from '#src/lib/knots/exhibition.ts'

export const labelWidth = 384
export const labelHeight = 160

export function modelLineLayout(textWidth: number, hasIcon: boolean) {
  const iconSize = hasIcon ? 26 : 0
  const gap = hasIcon ? 8 : 0
  const width = Math.min(textWidth, labelWidth - 24 - iconSize - gap)
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
  context.fillRect(x + 12, y + 8, labelWidth - 24, 4)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff3d9'
  context.font = '600 42px sans-serif'
  context.fillText(exhibit.label, x + labelWidth / 2, y + 40, labelWidth - 24)
  context.fillStyle = exhibit.accent
  context.font = '600 23px sans-serif'
  context.fillText(exhibit.title, x + labelWidth / 2, y + 92, labelWidth - 24)
  context.fillStyle = '#c5d0d9'
  context.font = '22px sans-serif'
  const {left, textWidth, iconSize, gap} = modelLineLayout(context.measureText(exhibit.modelTitle).width, Boolean(icon))
  if (icon) {
    const scale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const width = icon.naturalWidth * scale
    const height = icon.naturalHeight * scale
    context.drawImage(icon, x + left + (iconSize - width) / 2, y + 132 - height / 2, width, height)
  }
  context.textAlign = 'left'
  context.fillText(exhibit.modelTitle, x + left + iconSize + gap, y + 132, textWidth)
}
