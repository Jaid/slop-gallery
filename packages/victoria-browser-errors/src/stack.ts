/** where a stack frame points: the function, if named, and the script position */
export type StackFrame = {
  column: number
  file: string
  function?: string
  line: number
}

/** a V8 frame like `    at name (url:1:2)`, `    at async name (url:1:2)` or `    at url:1:2` */
const v8Frame = /^\s*at (?:(?:async )?(?<function>.+?) \()?(?<file>.+?):(?<line>\d+):(?<column>\d+)\)?$/u
/** a SpiderMonkey or JavaScriptCore frame like `name@url:1:2` */
const atFrame = /^(?<function>[^\s@]*)@(?<file>.+?):(?<line>\d+):(?<column>\d+)$/u

/** The script’s URL without its query and fragment, which may carry state, or the location as given if it is no URL, like `<anonymous>`. */
export function cleanFile(file: string) {
  const url = URL.parse(file)
  if (!url) {
    return file
  }
  return url.origin === 'null' ? `${url.protocol}${url.pathname}` : `${url.origin}${url.pathname}`
}

/** Parse one line of `Error#stack` into a frame, or undefined for any line that is none, like the first one, which holds the message. */
export function parseFrame(text: string): StackFrame | undefined {
  const match = v8Frame.exec(text) ?? atFrame.exec(text.trim())
  if (!match?.groups) {
    return
  }
  const {column, file, function: name, line} = match.groups
  return {
    file: cleanFile(file),
    line: Number(line),
    column: Number(column),
    ...name ? {function: name} : {},
  }
}

/** Every frame of `Error#stack`, innermost first, leaving out the message and anything else that is no frame. */
export function parseStack(stack: unknown): Array<StackFrame> {
  if (typeof stack !== 'string') {
    return []
  }
  return stack.split('\n').map(parseFrame).filter(frame => frame !== undefined)
}

/** A frame as one line, like `name (file:1:2)`, or `file:1:2` without a function name. */
export function formatFrame({column, file, function: name, line}: StackFrame) {
  const position = `${file}:${line}:${column}`
  return name ? `${name} (${position})` : position
}
