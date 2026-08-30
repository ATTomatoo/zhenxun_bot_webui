// import router from "@/router/routers" //引入router, 作页面跳转
// import store from "@/store" //引入store, 作聊天消息存储
import vue from "@/main"
import { createAuthenticatedWebSocket } from "./create-websocket"

var ws = null
var heartbeatInterval = null
var reconnectEnabled = true

function startHeartbeat() {
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send("ping") // 发送心跳消息
    }
  }, 5000)
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval) // 停止心跳检测定时器
  }
}
export default {
  ws: null,
  //初始化ws
  initWebSocket: function (onMessage) {
    reconnectEnabled = true
    if (!ws) {
      console.log("LOG_WS_URL WebSocket 正在连接...")
      const websocket = createAuthenticatedWebSocket("/zhenxun/socket/logs")
      ws = websocket
      this.ws = websocket
      startHeartbeat()
      websocket.onopen = () => {
        console.log("LOG_WS_URL WebSocket 已连接...")
      }
      websocket.onmessage = onMessage
      websocket.onclose = () => {
        if (ws === websocket) {
          ws = null
          this.ws = null
        }
        vue.$message.warning("LOG_WS_URL WebSocket 已断开...")
        stopHeartbeat()
        if (reconnectEnabled) {
          setTimeout(() => this.initWebSocket(onMessage), 3000)
        }
      }
    } else {
      ws.onmessage = onMessage
    }
  },
  //断开socked方法
  closeWebSocket: function () {
    console.log("关闭ws")
    reconnectEnabled = false
    if (ws && ws.readyState <= WebSocket.OPEN) {
      ws.close()
    }
  },
}
