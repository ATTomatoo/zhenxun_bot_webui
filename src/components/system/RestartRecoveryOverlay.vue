<template>
  <div v-if="visible" class="restart-recovery" role="status" aria-live="polite">
    <i v-if="!timedOut" class="el-icon-loading"></i>
    <i v-else class="el-icon-warning-outline warning"></i>
    <h2>{{ timedOut ? "自动连接等待超时" : "正在重启真寻" }}</h2>
    <p>{{ timedOut ? "服务可能仍在启动，可以重新检测或手动打开下列地址。" : state.message }}</p>
    <div v-if="timedOut" class="restart-actions">
      <el-button type="primary" @click="retry">重新检测</el-button>
      <el-button @click="dismiss">关闭等待页</el-button>
    </div>
    <div v-if="timedOut" class="restart-addresses">
      <a v-for="url in state.accessUrls" :key="url" :href="`${url}/#${state.returnRoute}`">{{ url }}</a>
    </div>
  </div>
</template>

<script>
import {
  clearRestartRecovery,
  RESTART_RECOVERY_EVENT,
  restartRecoveryState,
} from "@/utils/restart-recovery"

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration))

export default {
  name: "RestartRecoveryOverlay",
  data() {
    return { visible: false, timedOut: false, state: { accessUrls: [], returnRoute: "/dashboard", message: "" }, runId: 0 }
  },
  mounted() {
    window.addEventListener(RESTART_RECOVERY_EVENT, this.handleStart)
    const saved = restartRecoveryState()
    if (saved) this.begin(saved)
  },
  beforeDestroy() {
    window.removeEventListener(RESTART_RECOVERY_EVENT, this.handleStart)
    this.runId += 1
  },
  methods: {
    handleStart(event) { this.begin(event.detail) },
    begin(state) {
      this.state = state
      this.visible = true
      this.timedOut = false
      this.runId += 1
      this.poll(this.runId)
    },
    async poll(runId) {
      for (let attempt = 0; attempt < 80 && runId === this.runId; attempt += 1) {
        await wait(1500)
        const preferred = this.state.preferredOrigin || this.state.accessUrls[0]
        const fallback = this.state.fallbackUrls || []
        const candidates =
          this.state.policy === "preserve"
            ? [preferred]
            : attempt < 8
            ? [preferred]
            : [preferred, ...fallback]
        for (const baseUrl of candidates.filter(Boolean)) {
          try {
            const response = await fetch(`${baseUrl}/zhenxun/api/configure/status`, { cache: "no-store" })
            if (!response.ok) continue
            const payload = await response.json()
            const bootId = payload && payload.data && payload.data.boot_id
            if (!bootId || bootId === this.state.bootId) continue
            this.runId += 1
            clearRestartRecovery()
            if (this.state.setup) {
              window.sessionStorage.removeItem("zhenxunSetupToken")
              window.sessionStorage.removeItem("zhenxunSetupRestartReceipt")
              window.sessionStorage.removeItem("zhenxunSetupRestartTargets")
            }
            window.location.replace(`${baseUrl}/#${this.state.returnRoute}`)
            return
          } catch (error) {
            // Connection failures are expected while launcher replaces the worker.
          }
        }
      }
      if (runId === this.runId) this.timedOut = true
    },
    retry() {
      this.timedOut = false
      this.runId += 1
      this.poll(this.runId)
    },
    dismiss() {
      this.runId += 1
      this.visible = false
      clearRestartRecovery()
    },
  },
}
</script>

<style scoped>
.restart-recovery { position: fixed; inset: 0; z-index: 6000; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px; padding: 24px; color: #30333a; background: rgba(250, 251, 253, .98); text-align: center; }
.restart-recovery > i { color: #c74e80; font-size: 42px; }.restart-recovery > i.warning { color: #c59027; }.restart-recovery h2, .restart-recovery p { margin: 0; }.restart-recovery p { color: #747984; line-height: 1.6; }.restart-actions { display: flex; gap: 8px; margin-top: 8px; }.restart-addresses { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }.restart-addresses a { color: #b63d70; overflow-wrap: anywhere; }
</style>
