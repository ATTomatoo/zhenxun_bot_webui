const dirtySources = new Set()

export const setDirtyState = (source, dirty) => {
  if (dirty) dirtySources.add(source)
  else dirtySources.delete(source)
}

export const clearDirtyState = (source) => {
  dirtySources.delete(source)
}

export const clearAllDirtyStates = () => {
  dirtySources.clear()
}

export const hasDirtyState = () => dirtySources.size > 0

window.addEventListener("beforeunload", (event) => {
  if (!hasDirtyState()) return
  event.preventDefault()
  event.returnValue = ""
})
