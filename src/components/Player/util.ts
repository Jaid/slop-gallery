export const getJumpVelocity = (jumpHeight: number, gravity: number = 9.81) => {
  if (jumpHeight <= 0) {
    return 0
  }
  return Math.sqrt(2 * gravity * jumpHeight)
}
export const getCapsuleHalfHeight = (height: number, radius: number) => {
  if (height <= 0) {
    return 0
  }
  return Math.max(0, height / 2 - radius)
}
