import { getBaseUrl, getCookie } from "@/utils/api"

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
