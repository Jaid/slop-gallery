export type DisposeMethodResource = {dispose: () => void}
export type DisposableResource = Disposable | DisposeMethodResource

export default function disposeResource(resource: DisposableResource) {
  if (Symbol.dispose in resource) {
    resource[Symbol.dispose]()
    return
  }
  resource.dispose()
}
