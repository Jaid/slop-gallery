export const modelSignTextureSize = [2048, 491] as const

/** A single opaque printed face, with no detached text planes or duplicate number range. */
export default function drawFace(context: CanvasRenderingContext2D, title: string, icon?: HTMLImageElement) {
  const [width, height] = modelSignTextureSize
  context.fillStyle = '#10252b'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#ac9270'
  context.lineWidth = 6
  context.strokeRect(22, 22, width - 44, height - 44)
  const iconSize = 300
  const iconLeft = 90
  const textLeft = icon ? iconLeft + iconSize + 80 : 90
  const textWidth = width - textLeft - 90
  context.font = '600 190px main'
  const measured = context.measureText(title).width || 1
  const fontSize = Math.floor(190 * Math.min(1, textWidth / measured))
  context.font = `600 ${fontSize}px main`
  context.fillStyle = '#fff3d9'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(title, textLeft + textWidth / 2, height / 2, textWidth)
  if (icon) {
    const scale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const iconWidth = icon.naturalWidth * scale
    const iconHeight = icon.naturalHeight * scale
    context.drawImage(icon, iconLeft + (iconSize - iconWidth) / 2, (height - iconHeight) / 2, iconWidth, iconHeight)
  }
}
