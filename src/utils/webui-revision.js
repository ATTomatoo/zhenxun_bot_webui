import { Message } from "element-ui"
import { clearAllDirtyStates } from "./dirty-state"

const EXPECTED_REVISION = process.env.VUE_APP_WEBUI_REVISION || ""
const RELOAD_KEY = "zhenxunWebuiRevisionReload"
let pollTimer = null
let mismatchNotified = false

export const handleWebuiRevision = (revision) => {
  if (!revision || !EXPECTED_REVISION || revision === EXPECTED_REVISION) return
  if (window.sessionStorage.getItem(RELOAD_KEY) === revision) {
    if (!mismatchNotified) {
      mismatchNotified = true
      Message.error("前后端资源版本不一致，请清理浏览器缓存后刷新。")
    }
    return
  }
  window.sessionStorage.setItem(RELOAD_KEY, revision)
  clearAllDirtyStates()
  window.location.reload()
}

const checkManifest = async () => {
  try {
    const response = await fetch(`/version.json?_=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
    if (!response.ok) return
    const manifest = await response.json()
    handleWebuiRevision(manifest.revision || "")
  } catch (error) {
    // A transient network failure is handled by the next polling cycle.
  }
}

export const startWebuiRevisionPolling = () => {
  if (pollTimer) return
  checkManifest()
  pollTimer = window.setInterval(checkManifest, 15000)
}
