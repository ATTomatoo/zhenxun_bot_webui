import { getBaseUrl, getCookie } from "@/utils/api"
import { handleAuthenticationExpired } from "@/utils/auth-session"

export const AUTH_EXPIRED_CLOSE_CODE = 4401

export const handleAuthenticatedWebSocketClose = (event) => {
  if (event.code !== AUTH_EXPIRED_CLOSE_CODE) return false
  handleAuthenticationExpired(true)
  return true
}

export const emitWebSocketState = (channel, status) => {
  window.dispatchEvent(
    new CustomEvent("zhenxun-websocket-state", {
      detail: { channel, status },
    })
  )
}

export const createAuthenticatedWebSocket = (path) => {
  const url = new URL(getBaseUrl())
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = path
  url.search = ""
  url.hash = ""

  const websocket = new WebSocket(url.toString())
  websocket.addEventListener(
    "open",
    () => {
      websocket.send(
        JSON.stringify({ type: "auth", token: getCookie("tokenStr") || "" })
      )
    },
    { once: true }
  )
  return websocket
}
