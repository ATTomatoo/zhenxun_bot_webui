<template>
  <div class="runtime-details">
    <div class="runtime-facts">
      <div><span>监听地址</span><strong>{{ listenAddress }}</strong></div>
      <div><span>日志等级</span><strong>{{ overview.process.log_level }}</strong></div>
      <div><span>缓存模式</span><strong>{{ overview.cache.mode || "NONE" }}</strong></div>
      <div><span>WebSocket</span><strong>{{ overview.websocket.active_connections }} / {{ overview.websocket.connection_limit }}</strong></div>
    </div>
    <div class="detail-grid">
      <section>
        <div class="detail-title"><strong>连接历史</strong><el-button type="text" @click="loadHistory">刷新</el-button></div>
        <div v-if="historyError" class="detail-feedback is-error">{{ historyError }}</div>
        <div v-else-if="history.length" class="history-list">
          <div v-for="item in history" :key="`${item.bot_id}-${item.connect_time}`">
            <span class="history-state" :class="{ online: item.type === 1 }"></span>
            <strong>{{ item.bot_id }}</strong>
            <span>{{ item.type === 1 ? "连接" : "断开" }}</span>
            <time>{{ formatTime(item.connect_time) }}</time>
          </div>
        </div>
        <div v-else class="detail-feedback">暂无连接记录</div>
      </section>
      <section>
        <div class="detail-title">
          <strong>实时日志</strong>
          <span :class="['socket-label', `is-${logState}`]">{{ logStateLabel }}</span>
        </div>
        <div ref="logBox" class="log-box">
          <div v-if="!logs.length" class="detail-feedback">等待新的运行日志</div>
          <div v-for="item in logs" :key="item.id" v-html="item.html"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import AnsiUp from "ansi_up"

export default {
  name: "DashboardRuntimeDetails",
  props: { overview: { type: Object, required: true } },
  data: () => ({
    history: [],
    historyError: "",
    logs: [],
    logSequence: 0,
    logState: "connecting",
    ansi: new AnsiUp(),
  }),
  computed: {
    listenAddress() {
      const host = this.overview.process.listen_host
      const display = host === "0.0.0.0" || host === "::" ? "所有本机地址" : host
      return `${display}:${this.overview.process.listen_port}`
    },
    logStateLabel() {
      if (this.logState === "connected") return "已连接"
      if (this.logState === "reconnecting") return "正在重连"
      return "正在连接"
    },
  },
  mounted() {
    this.loadHistory()
    window.addEventListener("zhenxun-websocket-state", this.handleSocketState)
    this.$store.dispatch("initLogSocket", this.appendLog)
  },
  beforeDestroy() {
    window.removeEventListener("zhenxun-websocket-state", this.handleSocketState)
    this.$logWebSocket.closeWebSocket()
  },
  methods: {
    async loadHistory() {
      this.historyError = ""
      try {
        const response = await this.postRequest(
          `${this.$root.prefix}/dashboard/get_connect_log`,
          { index: 1, size: 8 },
          { suppressErrorToast: true }
        )
        if (!response.suc) throw new Error(response.info || "连接历史加载失败")
        this.history = response.data?.data || []
      } catch (error) {
        this.historyError = error?.response?.data?.detail || error.message || "连接历史加载失败"
      }
    },
    appendLog(raw) {
      let html = this.ansi.ansi_to_html(raw)
      html = html.replace("color:rgb(0,0,187)", "color:rgb(55,186,255)")
      this.logs.push({ id: ++this.logSequence, html })
      if (this.logs.length > 150) this.logs.shift()
      this.$nextTick(() => {
        if (this.$refs.logBox) this.$refs.logBox.scrollTop = this.$refs.logBox.scrollHeight
      })
    },
    handleSocketState(event) {
      if (event.detail?.channel === "log") this.logState = event.detail.status
    },
    formatTime(value) {
      return value ? new Date(value).toLocaleString() : "-"
    },
  },
}
</script>

<style scoped>
.runtime-details { padding: 0 24px 24px; border-top: 1px solid var(--border-color); }
.runtime-facts { display: grid; grid-template-columns: repeat(4, 1fr); margin: 20px 0; border: 1px solid var(--border-color); }
.runtime-facts > div { min-width: 0; padding: 14px; border-right: 1px solid var(--border-color); }
.runtime-facts > div:last-child { border-right: 0; }
.runtime-facts span, .runtime-facts strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.runtime-facts span { margin-bottom: 5px; color: var(--text-color-secondary); font-size: 12px; }
.detail-grid { display: grid; grid-template-columns: minmax(280px, 0.8fr) minmax(360px, 1.2fr); gap: 16px; }
.detail-grid section { min-width: 0; border: 1px solid var(--border-color); background: var(--bg-color); }
.detail-title { display: flex; min-height: 48px; align-items: center; justify-content: space-between; padding: 0 14px; border-bottom: 1px solid var(--border-color); }
.history-list > div { display: grid; grid-template-columns: 10px 1fr 45px 145px; gap: 8px; align-items: center; min-height: 42px; padding: 0 14px; border-bottom: 1px solid var(--border-color); font-size: 12px; }
.history-list time, .history-list > div > span { color: var(--text-color-secondary); }
.history-state { width: 7px; height: 7px; border-radius: 50%; background: var(--el-color-danger); }
.history-state.online { background: var(--el-color-success); }
.log-box { height: 310px; overflow: auto; padding: 12px; color: #d7dae0; background: #171a20; font-family: Consolas, monospace; font-size: 12px; line-height: 1.6; }
.detail-feedback { display: grid; min-height: 120px; place-items: center; color: var(--text-color-secondary); }
.detail-feedback.is-error { color: var(--el-color-danger); }
.socket-label { font-size: 12px; color: var(--el-color-warning); }
.socket-label.is-connected { color: var(--el-color-success); }
@media (max-width: 900px) { .runtime-facts { grid-template-columns: 1fr 1fr; } .runtime-facts > div:nth-child(2) { border-right: 0; } .runtime-facts > div:nth-child(-n + 2) { border-bottom: 1px solid var(--border-color); } .detail-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .runtime-details { padding: 0 14px 14px; } .runtime-facts { grid-template-columns: 1fr; } .runtime-facts > div { border-right: 0; border-bottom: 1px solid var(--border-color); } .history-list > div { grid-template-columns: 10px 1fr 45px; } .history-list time { display: none; } }
</style>
