// Export effort separately so authoring fixtures can trade compression time for iteration speed.
export const jxlEffort = 10
export const jxlBrotliEffort = 11
export const lossyJxlOptions = (distance = 1) => ['--effort', String(jxlEffort), '--brotli_effort', String(jxlBrotliEffort), '--distance', String(distance), '--keep_invisible', '0'] as const

export async function encodeJxl(input: string, output: string) {
  await Bun.$`cjxl ${input} ${lossyJxlOptions()} ${output}`.quiet()
  return output
}
