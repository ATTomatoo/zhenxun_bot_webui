<template>
  <div class="protocol-page">
    <section class="page-heading">
      <div>
        <p class="eyebrow">MESSAGE PLATFORM</p>
        <h1>协议端设置</h1>
        <p class="heading-description">
          选择消息平台并按照引导完成连接。连接检测只是辅助提示，不会阻止你使用其他功能。
        </p>
      </div>
      <div class="overall-status" :class="{ online: hasAnyConnection }">
        <span class="status-dot"></span>
        {{ hasAnyConnection ? "已有协议端在线" : "暂无协议端在线" }}
      </div>
    </section>

    <section class="platform-section">
      <div class="section-title">
        <span>消息平台类别</span>
        <small>当前提供 2 种接入方式</small>
      </div>
      <div class="platform-grid">
        <button
          type="button"
          class="platform-card"
          :class="{ active: selectedPlatform === 'onebot_v11' }"
          @click="selectPlatform('onebot_v11')"
        >
          <span class="platform-icon onebot">OB</span>
          <span class="platform-content">
            <strong>OneBot V11</strong>
            <small>QQ · 反向 WebSocket</small>
          </span>
          <el-tag
            size="mini"
            :type="status.onebot_v11_connected ? 'success' : 'info'"
          >
            {{ status.onebot_v11_connected ? "已连接" : "未连接" }}
          </el-tag>
        </button>

        <button
          type="button"
          class="platform-card"
          :class="{ active: selectedPlatform === 'qq_official' }"
          @click="selectPlatform('qq_official')"
        >
          <span class="platform-icon qq">QQ</span>
          <span class="platform-content">
            <strong>QQ 官方机器人</strong>
            <small>QQ 开放平台 · HTTPS Webhook</small>
          </span>
          <el-tag
            size="mini"
            :type="status.qq_official_connected ? 'success' : 'info'"
          >
            {{ qqOfficialStatusLabel }}
          </el-tag>
        </button>
      </div>
    </section>

    <section v-if="selectedPlatform === 'onebot_v11'" class="guide-card">
      <div class="guide-header">
        <div>
          <el-tag type="primary" effect="plain">推荐</el-tag>
          <h2>配置 OneBot V11 协议端</h2>
          <p>适用于 NapCat、Lagrange.OneBot、LLOneBot 等 OneBot V11 实现。</p>
        </div>
        <div class="direction-badge">
          <i class="el-icon-connection"></i>
          协议端 → 真寻
        </div>
      </div>

      <div class="steps">
        <div class="step-item">
          <span class="step-number">1</span>
          <div>
            <strong>打开协议端的网络配置</strong>
            <p>新增一个 WebSocket 配置，并选择“反向 WebSocket”。</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-number">2</span>
          <div class="step-main">
            <strong>填写连接地址</strong>
            <p>将下面的完整地址复制到协议端的 URL 地址栏。</p>
            <div class="copy-field">
              <code>{{ onebotWebSocketUrl }}</code>
              <el-button
                size="small"
                type="primary"
                icon="el-icon-document-copy"
                @click="copyUrl"
              >
                复制
              </el-button>
            </div>
          </div>
        </div>
        <div class="step-item">
          <span class="step-number">3</span>
          <div>
            <strong>保存并启用连接</strong>
            <p>
              连接方式使用 WebSocket 客户端；若你在 Bot 中配置了 Access Token，协议端也要填写同一个 Token。
            </p>
          </div>
        </div>
      </div>

      <div class="connection-summary">
        <div>
          <span>连接方式</span>
          <strong>反向 WebSocket</strong>
        </div>
        <div>
          <span>连接方向</span>
          <strong>协议端主动连接 Bot</strong>
        </div>
        <div>
          <span>WebSocket 路径</span>
          <strong>{{ status.onebot_v11_reverse_ws_path }}</strong>
        </div>
      </div>
    </section>

    <section v-else class="guide-card">
      <div class="guide-header">
        <div>
          <el-tag type="info" effect="plain">官方接入</el-tag>
          <h2>配置 QQ 官方机器人</h2>
          <p>QQ 开放平台通过签名 HTTPS Webhook 将事件推送给真寻。</p>
        </div>
        <div class="direction-badge">
          <i class="el-icon-connection"></i>
          QQ 开放平台 → 真寻
        </div>
      </div>

      <div class="steps">
        <div class="step-item">
          <span class="step-number">1</span>
          <div>
            <strong>创建 QQ 官方机器人</strong>
            <p>在 QQ 开放平台创建机器人，并取得 AppID、Token 和 Secret。</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-number">2</span>
          <div>
            <strong>填写 Bot 环境配置</strong>
            <p>
              将 <code>QQ_ADAPTER_LOAD</code> 设为 <code>True</code>，并在
              <code>QQ_BOTS</code> 中填写机器人凭据；连接模式可选择自行反代或内置 HTTPS。
            </p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-number">3</span>
          <div>
            <strong>配置回调并重启</strong>
            <p>
              在开放平台填写公网 HTTPS 地址，路径固定为
              <code>{{ status.qq_webhook_path }}</code>，配置在重启后生效。
            </p>
          </div>
        </div>
      </div>

      <div class="connection-summary">
        <div>
          <span>连接方式</span>
          <strong>签名 HTTPS Webhook</strong>
        </div>
        <div>
          <span>部署模式</span>
          <strong>{{ qqWebhookModeLabel }}</strong>
        </div>
        <div>
          <span>回调路径</span>
          <strong>{{ status.qq_webhook_path }}</strong>
        </div>
      </div>
    </section>

    <section class="waiting-card" :class="waitingState">
      <div class="waiting-visual">
        <span v-if="waitingState === 'connected'" class="state-icon success">
          <i class="el-icon-check"></i>
        </span>
        <span v-else-if="waiting" class="state-icon waiting">
          <i class="el-icon-loading"></i>
        </span>
        <span v-else class="state-icon idle">
          <i class="el-icon-connection"></i>
        </span>
      </div>

      <div class="waiting-content">
        <h3>{{ waitingTitle }}</h3>
        <p>{{ waitingDescription }}</p>
        <div v-if="connectedBots.length" class="connected-bots">
          <el-tag
            v-for="bot in connectedBots"
            :key="`${bot.adapter}-${bot.self_id}`"
            type="success"
            effect="plain"
          >
            {{ bot.self_id }} · {{ bot.adapter }}
          </el-tag>
        </div>
      </div>

      <div class="waiting-actions">
        <el-button v-if="waiting" @click="stopWaiting(true)">停止等待</el-button>
        <el-button
          v-else
          type="primary"
          icon="el-icon-search"
          :loading="statusLoading"
          :disabled="!canWaitForSelectedPlatform"
          @click="startWaiting"
        >
          {{ waitingState === "connected" ? "重新检测" : "等待协议端连接" }}
        </el-button>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: "ProtocolSetting",
  data() {
    return {
      selectedPlatform: "onebot_v11",
      status: {
        onebot_v11_connected: false,
        qq_official_enabled: false,
        qq_official_connected: false,
        qq_webhook_mode: "external",
        connections: [],
        onebot_v11_reverse_ws_path: "/onebot/v11/ws",
        qq_webhook_path: "/qq/webhook",
      },
      statusLoading: false,
      waiting: false,
      waitingState: "idle",
      waitRemaining: 60,
      waitDeadline: 0,
      pollingTimer: null,
    }
  },
  computed: {
    onebotWebSocketUrl() {
      const scheme = window.location.protocol === "https:" ? "wss:" : "ws:"
      return `${scheme}//${window.location.host}${this.status.onebot_v11_reverse_ws_path}`
    },
    hasAnyConnection() {
      return this.status.connections.length > 0
    },
    isSelectedConnected() {
      return this.selectedPlatform === "onebot_v11"
        ? this.status.onebot_v11_connected
        : this.status.qq_official_connected
    },
    connectedBots() {
      return this.status.connections.filter(
        (connection) => connection.platform === this.selectedPlatform
      )
    },
    qqOfficialStatusLabel() {
      if (this.status.qq_official_connected) return "已连接"
      return this.status.qq_official_enabled ? "等待事件" : "未启用"
    },
    qqWebhookModeLabel() {
      return this.status.qq_webhook_mode === "builtin_https"
        ? "内置 HTTPS"
        : "自行 HTTPS 反代"
    },
    canWaitForSelectedPlatform() {
      return (
        this.selectedPlatform !== "qq_official" ||
        this.status.qq_official_enabled
      )
    },
    selectedPlatformName() {
      return this.selectedPlatform === "onebot_v11"
        ? "OneBot V11"
        : "QQ 官方机器人"
    },
    waitingTitle() {
      if (this.waitingState === "connected") {
        return `${this.selectedPlatformName} 已连接`
      }
      if (this.waiting) {
        return `正在等待 ${this.selectedPlatformName} 连接`
      }
      if (this.waitingState === "timeout") {
        return "暂未检测到连接"
      }
      if (!this.canWaitForSelectedPlatform) {
        return "QQ 官方适配器未启用"
      }
      return "等待协议端连接"
    },
    waitingDescription() {
      if (this.waitingState === "connected") {
        return "协议端已经成功接入真寻，可以开始收发消息了。"
      }
      if (this.waiting) {
        return `将在后台持续检测，剩余约 ${this.waitRemaining} 秒；你也可以随时停止等待。`
      }
      if (this.waitingState === "timeout") {
        return "本次等待已结束，你可以检查协议端配置后重新检测；未连接不会限制其他功能。"
      }
      if (!this.canWaitForSelectedPlatform) {
        return "请完成 QQ_ADAPTER_LOAD、QQ_BOTS 和 Webhook 模式配置后重启真寻。"
      }
      return "配置完成后点击按钮，页面会等待最多 60 秒；未连接也不会强制阻止后续操作。"
    },
  },
  mounted() {
    this.loadStatus()
  },
  beforeDestroy() {
    this.clearPollingTimer()
  },
  methods: {
    selectPlatform(platform) {
      if (this.selectedPlatform === platform) return
      this.stopWaiting(false)
      this.selectedPlatform = platform
      this.waitingState = "idle"
      this.loadStatus()
    },
    async loadStatus(showError = false) {
      this.statusLoading = true
      try {
        const resp = await this.getRequest(
          `${this.$root.prefix}/protocol/status`
        )
        if (resp && resp.suc && resp.data) {
          this.status = resp.data
          if (this.isSelectedConnected) {
            this.waitingState = "connected"
          }
          return this.isSelectedConnected
        }
        if (showError && resp) {
          this.$message.error(resp.info || "连接状态获取失败")
        }
      } finally {
        this.statusLoading = false
      }
      return false
    },
    async startWaiting() {
      if (!this.canWaitForSelectedPlatform) return
      this.clearPollingTimer()
      this.waiting = true
      this.waitingState = "waiting"
      this.waitRemaining = 60
      this.waitDeadline = Date.now() + 60000

      const connected = await this.loadStatus(true)
      if (connected) {
        this.finishWaitingSuccessfully()
        return
      }
      this.scheduleNextCheck()
    },
    scheduleNextCheck() {
      if (!this.waiting) return
      this.pollingTimer = window.setTimeout(async () => {
        this.waitRemaining = Math.max(
          0,
          Math.ceil((this.waitDeadline - Date.now()) / 1000)
        )
        if (this.waitRemaining <= 0) {
          this.waiting = false
          this.waitingState = "timeout"
          return
        }

        const connected = await this.loadStatus()
        if (connected) {
          this.finishWaitingSuccessfully()
          return
        }
        this.scheduleNextCheck()
      }, 2000)
    },
    finishWaitingSuccessfully() {
      this.clearPollingTimer()
      this.waiting = false
      this.waitingState = "connected"
      this.$message.success(`${this.selectedPlatformName} 连接成功`)
    },
    stopWaiting(resetState) {
      this.clearPollingTimer()
      this.waiting = false
      if (resetState) {
        this.waitingState = this.isSelectedConnected ? "connected" : "idle"
      }
    },
    clearPollingTimer() {
      if (this.pollingTimer) {
        window.clearTimeout(this.pollingTimer)
        this.pollingTimer = null
      }
    },
    async copyUrl() {
      try {
        await navigator.clipboard.writeText(this.onebotWebSocketUrl)
      } catch (error) {
        const input = document.createElement("textarea")
        input.value = this.onebotWebSocketUrl
        input.style.position = "fixed"
        input.style.opacity = "0"
        document.body.appendChild(input)
        input.select()
        document.execCommand("copy")
        document.body.removeChild(input)
      }
      this.$message.success("连接地址已复制")
    },
  },
}
</script>

<style lang="scss" scoped>
.protocol-page {
  height: 100%;
  overflow-y: auto;
  padding: 4px 6px 40px;
  color: var(--text-color);
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;

  h1 {
    margin: 4px 0 8px;
    font-size: 30px;
    line-height: 1.25;
  }
}

.eyebrow {
  margin: 0;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.heading-description {
  margin: 0;
  color: var(--text-color-secondary);
  line-height: 1.7;
}

.overall-status {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border-color-light);
  border-radius: 999px;
  color: var(--text-color-secondary);
  background: var(--bg-color);

  .status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--text-color-placeholder);
  }

  &.online {
    color: var(--success-color);

    .status-dot {
      background: var(--success-color);
      box-shadow: 0 0 0 5px rgba(72, 187, 120, 0.14);
    }
  }
}

.platform-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 17px;
  font-weight: 700;

  small {
    color: var(--text-color-secondary);
    font-size: 13px;
    font-weight: 400;
  }
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.platform-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 92px;
  padding: 16px 18px;
  border: 1px solid var(--border-color-light);
  border-radius: 14px;
  color: var(--text-color);
  background: var(--bg-color-secondary);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: var(--primary-color-light);
    transform: translateY(-1px);
  }

  &.active {
    border-color: var(--primary-color);
    box-shadow: 0 8px 26px rgba(255, 107, 149, 0.13);
  }

  .el-tag {
    margin-left: auto;
  }
}

.platform-icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 14px;
  color: white;
  font-weight: 800;

  &.onebot {
    background: linear-gradient(135deg, #6c7cff, #8a63e8);
  }

  &.qq {
    background: linear-gradient(135deg, #2f9bff, #1677e8);
  }
}

.platform-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;

  strong {
    font-size: 16px;
  }

  small {
    color: var(--text-color-secondary);
  }
}

.guide-card,
.waiting-card {
  border: 1px solid var(--border-color-light);
  border-radius: 16px;
  background: var(--bg-color-secondary);
}

.guide-card {
  padding: 24px;
}

.guide-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color-light);

  h2 {
    display: inline-block;
    margin: 0 0 8px 10px;
    font-size: 21px;
  }

  p {
    margin: 0;
    color: var(--text-color-secondary);
  }
}

.direction-badge {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--primary-color);
  background: var(--bg-color-hover);
  font-weight: 600;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px 4px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;

  p {
    margin: 5px 0 0;
    color: var(--text-color-secondary);
    line-height: 1.65;
  }

  code {
    color: var(--primary-color);
  }
}

.step-number {
  display: grid;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  color: white;
  background: var(--primary-color);
  font-size: 13px;
  font-weight: 700;
}

.step-main {
  min-width: 0;
  flex: 1;
}

.copy-field {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 10px 10px 10px 14px;
  border: 1px solid var(--border-color-light);
  border-radius: 10px;
  background: var(--bg-color);

  code {
    min-width: 0;
    flex: 1;
    overflow-wrap: anywhere;
    color: var(--text-color);
    font-size: 14px;
  }
}

.connection-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-color);

  div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }

  span {
    color: var(--text-color-secondary);
    font-size: 12px;
  }

  strong {
    overflow-wrap: anywhere;
    font-size: 14px;
  }
}

.waiting-card {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 20px;
  padding: 20px 22px;

  &.connected {
    border-color: rgba(72, 187, 120, 0.45);
  }

  &.timeout {
    border-color: rgba(237, 137, 54, 0.45);
  }
}

.state-icon {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border-radius: 50%;
  font-size: 22px;

  &.idle {
    color: var(--info-color);
    background: rgba(66, 153, 225, 0.12);
  }

  &.waiting {
    color: var(--primary-color);
    background: var(--bg-color-hover);
  }

  &.success {
    color: var(--success-color);
    background: rgba(72, 187, 120, 0.13);
  }
}

.waiting-content {
  min-width: 0;
  flex: 1;

  h3 {
    margin: 0 0 5px;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: var(--text-color-secondary);
    line-height: 1.55;
  }
}

.connected-bots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.waiting-actions {
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .platform-grid,
  .connection-summary {
    grid-template-columns: 1fr;
  }

  .guide-header,
  .waiting-card {
    align-items: stretch;
    flex-direction: column;
  }

  .direction-badge,
  .waiting-actions .el-button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .page-heading {
    flex-direction: column;
  }

  .overall-status {
    align-self: flex-start;
  }

  .section-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .platform-card {
    flex-wrap: wrap;

    .el-tag {
      margin-left: 62px;
    }
  }

  .guide-card {
    padding: 18px;
  }

  .guide-header h2 {
    display: block;
    margin: 10px 0 8px;
  }

  .copy-field {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
