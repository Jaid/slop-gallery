export const lossyJxlOptions = (distance = 1) => ['--effort', '10', '--brotli_effort', '11', '--distance', String(distance)]

export async function encodeJxl(input: string, output: string) {
  await Bun.$`cjxl ${input} ${lossyJxlOptions()} ${output}`.quiet()
  return output
}
