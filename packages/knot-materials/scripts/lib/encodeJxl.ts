export const lossyJxlOptions = (distance = 1) => ['--effort', '10', '--brotli_effort', '11', '--distance', String(distance), '--keep_invisible', '0'] as const

export async function encodeJxl(input: string, output: string) {
  await Bun.$`cjxl ${input} ${lossyJxlOptions()} ${output}`.quiet()
  return output
}
