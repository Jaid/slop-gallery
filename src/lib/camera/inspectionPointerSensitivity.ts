const precisionScale = 0.1
const acceleratedScale = 2

export default function inspectionPointerSensitivity(base: number, precision: boolean, accelerated: boolean) {
  if (precision) {
    return base * precisionScale
  }
  if (accelerated) {
    return base * acceleratedScale
  }
  return base
}
