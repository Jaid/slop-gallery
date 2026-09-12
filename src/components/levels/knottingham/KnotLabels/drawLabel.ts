import type {KnotExhibit} from '#src/lib/knots/exhibition.ts'

export const labelAtlasColumns = 10
export const labelWidth = 768
export const labelHeight = labelWidth * 2 / 3
export const labelFontFamily = 'main'

export function knotDetailLine(harness?: string, effortLevel?: string) {
  const details: Array<string> = []
  if (harness && harness !== 'none') {
    details.push(harness)
  }
  if (effortLevel) {
    details.push(`${effortLevel} effort`)
  }
  return details.join(', ')
}

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

export default function drawLabel(context: CanvasRenderingContext2D, exhibit: KnotExhibit, x: number, y: number, icon?: HTMLImageElement) {
  context.fillStyle = '#122029'
  context.fillRect(x, y, labelWidth, labelHeight)
  context.fillStyle = exhibit.accent
  context.fillRect(x + 24, y + 32, labelWidth - 48, 8)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff3d9'
  context.font = `600 84px ${labelFontFamily}`
  context.fillText(exhibit.label, x + labelWidth / 2, y + 136, labelWidth - 48)
  context.fillStyle = exhibit.accent
  context.font = `600 46px ${labelFontFamily}`
  context.fillText(exhibit.title, x + labelWidth / 2, y + 232, labelWidth - 48)
  context.fillStyle = '#c5d0d9'
  context.font = `44px ${labelFontFamily}`
  const {left, textWidth, iconSize, gap} = modelLineLayout(context.measureText(exhibit.modelTitle).width, Boolean(icon))
  if (icon) {
    const scale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const width = icon.naturalWidth * scale
    const height = icon.naturalHeight * scale
    context.drawImage(icon, x + left + (iconSize - width) / 2, y + 400 - height / 2, width, height)
  }
  context.textAlign = 'left'
  context.fillText(exhibit.modelTitle, x + left + iconSize + gap, y + 400, textWidth)
  const detail = knotDetailLine(exhibit.harness, exhibit.author.model.effortLevel)
  if (detail) {
    context.textAlign = 'center'
    context.fillStyle = '#91a0ad'
    context.font = `32px ${labelFontFamily}`
    context.fillText(detail, x + labelWidth / 2, y + 454, labelWidth - 48)
  }
}
