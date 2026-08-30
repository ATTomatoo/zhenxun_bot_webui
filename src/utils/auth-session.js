import { Message } from "element-ui"
import router from "@/router"
import { clearAllDirtyStates } from "./dirty-state"

let redirecting = false
let lastNotificationAt = 0

const clearAuthCookie = () => {
  document.cookie = "tokenStr=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
}

export const handleAuthenticationExpired = (showMessage = true) => {
  clearAuthCookie()
  window.sessionStorage.removeItem("isAuthenticated")
  clearAllDirtyStates()
  window.dispatchEvent(new CustomEvent("zhenxun-auth-expired"))
  const now = Date.now()
  if (showMessage && now - lastNotificationAt > 5000) {
    lastNotificationAt = now
    Message.error({ message: "登录会话已失效，请重新登录。" })
  }
  if (redirecting || router.currentRoute.path === "/") return
  redirecting = true
  router.replace(
    "/",
    () => {
      redirecting = false
    },
    () => {
      redirecting = false
    }
  )
}

export const isLocalAuthRecoveryRequest = (config = {}) => {
  if (config.authFailureMode === "local") return true
  const url = String(config.url || "")
  return /\/configure\/(claim|draft|probe|apply|restart|status)/.test(url) ||
    url.includes("/auth/console-connect")
}
