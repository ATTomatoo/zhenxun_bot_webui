<template>
  <main class="protocol-page" v-loading="loading">
    <header class="page-heading">
      <div><p class="eyebrow">MESSAGE PLATFORM</p><h1>协议端设置</h1><p>在这里完成凭据验证、配置保存和连接检查。</p></div>
      <div class="overall-status" :class="{ online: hasAnyConnection }"><span></span>{{ hasAnyConnection ? "已有协议端在线" : "暂无协议端在线" }}</div>
    </header>

    <nav class="platform-grid" aria-label="协议类型">
      <button v-for="platform in platforms" :key="platform.key" type="button" class="platform-card" :class="{ active: selectedPlatform === platform.key }" @click="selectedPlatform = platform.key">
        <span class="platform-icon" :class="platform.key">{{ platform.short }}</span>
        <span><strong>{{ platform.name }}</strong><small>{{ platform.description }}</small></span>
        <el-tag size="mini" :type="platform.connected ? 'success' : 'info'">{{ platform.status }}</el-tag>
      </button>
    </nav>

    <section v-if="selectedPlatform === 'onebot_v11'" class="configuration-section">
      <div class="section-heading">
        <div><h2>OneBot V11</h2><p>协议端使用反向 WebSocket 主动连接真寻。</p></div>
        <el-tag type="primary" effect="plain">反向 WebSocket</el-tag>
      </div>
      <el-form class="form-grid" label-position="top">
        <el-form-item label="连接地址" class="span-2">
          <div class="copy-field"><code>{{ onebotWebSocketUrl }}</code><el-button size="small" icon="el-icon-document-copy" @click="copyText(onebotWebSocketUrl)">复制</el-button></div>
        </el-form-item>
        <el-form-item label="Access Token" class="span-2">
          <el-input v-model="onebotToken" show-password autocomplete="new-password" :placeholder="configuration.onebot.has_access_token ? '已配置，留空表示沿用当前值' : '建议为公网可访问的协议端设置 Token'" />
          <div class="field-actions"><span>协议端必须填写相同 Token，保存后重启生效。</span><el-button v-if="configuration.onebot.has_access_token" type="text" class="danger-text" @click="clearOnebotToken = !clearOnebotToken">{{ clearOnebotToken ? "取消清除" : "清除现有 Token" }}</el-button></div>
          <el-alert v-if="clearOnebotToken" type="warning" :closable="false" title="保存后将移除 OneBot Access Token。" />
        </el-form-item>
      </el-form>
    </section>

    <section v-else class="configuration-section">
      <div class="section-heading">
        <div><h2>QQ 官方机器人</h2><p>先验证机器人身份，再保存并重启官方 Webhook Adapter。</p></div>
        <div class="switch-line"><span>{{ qqForm.enabled ? "已启用" : "未启用" }}</span><el-switch v-model="qqForm.enabled" /></div>
      </div>

      <el-form v-if="qqForm.enabled" :model="qqForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="Webhook 模式">
            <el-radio-group v-model="qqForm.webhook_mode" size="small">
              <el-radio-button label="external">自行 HTTPS 反代</el-radio-button>
              <el-radio-button label="builtin_https">内置 HTTPS</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="公网 HTTPS 基础地址">
            <el-input v-model.trim="qqForm.public_base_url" placeholder="https://bot.example.com" />
            <p class="field-help">不要填写 <code>/qq/webhook</code>，系统会自动拼接。</p>
          </el-form-item>
        </div>

        <div class="bot-list-heading"><div><h3>机器人凭据</h3><p>支持多个 AppID；Token 与 Secret 不会在读取配置时回传。</p></div><el-button size="small" icon="el-icon-plus" @click="addBot">添加 Bot</el-button></div>
        <div class="bot-grid">
          <article v-for="(bot, index) in qqForm.bots" :key="bot.localKey" class="bot-entry">
            <header><strong>Bot {{ index + 1 }}</strong><el-button type="text" class="danger-text" icon="el-icon-delete" @click="removeBot(index)">移除</el-button></header>
            <el-form-item label="AppID"><el-input v-model.trim="bot.id" placeholder="机器人 AppID" /></el-form-item>
            <el-form-item label="Token"><el-input v-model="bot.token" show-password autocomplete="new-password" :placeholder="bot.has_token ? '已保存，留空沿用' : 'Token'" /></el-form-item>
            <el-form-item label="Secret"><el-input v-model="bot.secret" show-password autocomplete="new-password" :placeholder="bot.has_secret ? '已保存，留空沿用' : 'Secret'" /></el-form-item>
            <div class="probe-row">
              <span v-if="bot.probeResult" class="probe-success"><i class="el-icon-circle-check"></i> {{ bot.probeResult }}</span>
              <span v-else-if="bot.has_secret && !bot.secret" class="muted">已保存的凭据会在提交时重新验证</span>
              <span v-else class="muted">验证不会保存凭据</span>
              <el-button size="small" :loading="bot.probing" :disabled="!canProbeBot(bot)" @click="probeBot(bot)">验证凭据</el-button>
            </div>
          </article>
        </div>

        <div v-if="qqForm.webhook_mode === 'builtin_https'" class="builtin-settings">
          <div class="section-heading compact"><div><h3>内置 HTTPS</h3><p>需要通过 <code>zx run</code> 启动，并提供可信 PEM 证书。</p></div><el-tag size="mini" :type="configuration.launcher_managed ? 'success' : 'warning'">{{ configuration.launcher_managed ? "Launcher 已托管" : "需要 Launcher" }}</el-tag></div>
          <div class="form-grid">
            <el-form-item label="监听地址"><el-input v-model.trim="qqForm.listen_host" placeholder="0.0.0.0" /></el-form-item>
            <el-form-item label="HTTPS 端口"><el-input-number v-model="qqForm.listen_port" :min="1" :max="65535" controls-position="right" /></el-form-item>
            <el-form-item label="证书链文件"><el-input v-model.trim="qqForm.tls_certfile" :placeholder="qqForm.has_tls_certfile ? '已配置，留空沿用' : 'C:\\certs\\fullchain.pem'" /></el-form-item>
            <el-form-item label="私钥文件"><el-input v-model.trim="qqForm.tls_keyfile" show-password :placeholder="qqForm.has_tls_keyfile ? '已配置，留空沿用' : 'C:\\certs\\privkey.pem'" /></el-form-item>
          </div>
        </div>
      </el-form>

      <div class="callback-panel" :class="{ ready: callbackReady }">
        <div class="callback-state"><i :class="callbackReady ? 'el-icon-circle-check' : 'el-icon-warning-outline'"></i></div>
        <div><strong>{{ callbackReady ? "Webhook 已准备好" : "Webhook 尚未生效" }}</strong><p>{{ callbackDescription }}</p><code v-if="callbackUrl">{{ callbackUrl }}</code></div>
        <el-button v-if="callbackUrl" size="small" icon="el-icon-document-copy" @click="copyText(callbackUrl)">复制回调地址</el-button>
      </div>
    </section>

    <div class="action-bar">
      <span>协议环境配置保存后需要重启；禁用 QQ 时会保留原有凭据。</span>
      <el-button icon="el-icon-refresh" :loading="statusLoading" @click="loadStatus">刷新状态</el-button>
      <el-button type="primary" :loading="saving" @click="saveConfiguration">保存并重启</el-button>
    </div>

    <div v-if="restarting" class="restart-overlay"><i class="el-icon-loading"></i><h2>正在重启真寻</h2><p>页面会在服务恢复后自动返回协议端设置。</p></div>
  </main>
</template>

<script>
let botKey = 0
const emptyBot = () => ({ localKey: `bot-${++botKey}`, id: "", token: "", secret: "", has_token: false, has_secret: false, probing: false, probeResult: "" })

export default {
  name: "ProtocolSetting",
  data() {
    return {
      selectedPlatform: "onebot_v11", loading: false, saving: false, statusLoading: false, restarting: false,
      status: { onebot_v11_connected: false, qq_official_enabled: false, qq_official_connected: false, qq_webhook_mode: "external", qq_webhook_callback_url: null, connections: [], onebot_v11_reverse_ws_path: "/onebot/v11/ws", qq_webhook_path: "/qq/webhook" },
      configuration: { revision: "", launcher_managed: false, onebot: { has_access_token: false }, qq: { bots: [] } },
      onebotToken: "", clearOnebotToken: false,
      qqForm: { enabled: false, bots: [], webhook_mode: "external", public_base_url: "", listen_host: "0.0.0.0", listen_port: 443, tls_certfile: "", tls_keyfile: "", has_tls_certfile: false, has_tls_keyfile: false },
    }
  },
  computed: {
    onebotWebSocketUrl() { const scheme = window.location.protocol === "https:" ? "wss:" : "ws:"; return `${scheme}//${window.location.host}${this.status.onebot_v11_reverse_ws_path}` },
    hasAnyConnection() { return this.status.connections.length > 0 },
    platforms() {
      return [
        { key: "onebot_v11", short: "OB", name: "OneBot V11", description: "QQ · 反向 WebSocket", connected: this.status.onebot_v11_connected, status: this.status.onebot_v11_connected ? "已连接" : "未连接" },
        { key: "qq_official", short: "QQ", name: "QQ 官方机器人", description: "QQ 开放平台 · HTTPS Webhook", connected: this.status.qq_official_connected, status: this.status.qq_official_connected ? "已连接" : this.qqForm.enabled ? "等待重启" : "未启用" },
      ]
    },
    callbackUrl() { return this.status.qq_webhook_callback_url || (this.qqForm.public_base_url ? `${this.qqForm.public_base_url.replace(/\/$/, "")}/qq/webhook` : "") },
    callbackReady() { return Boolean(this.status.qq_official_connected && this.callbackUrl) },
    callbackDescription() {
      if (!this.qqForm.enabled) return "启用适配器并填写 Bot 配置后，系统会生成回调地址。"
      if (!this.callbackUrl) return "请先填写公网 HTTPS 基础地址。"
      if (!this.status.qq_official_connected) return "配置已填写；保存并重启、Bot 预热成功后即可复制到 QQ 开放平台。"
      return "Bot 已完成 API me 预热，可将下面地址填写到 QQ 开放平台。"
    },
  },
  async mounted() {
    await Promise.all([this.loadConfiguration(), this.loadStatus()])
    if (sessionStorage.getItem("protocol_restart_pending")) {
      sessionStorage.removeItem("protocol_restart_pending"); this.selectedPlatform = "qq_official"; this.waitForConnection()
    }
  },
  methods: {
    async loadConfiguration() {
      this.loading = true
      try {
        const response = await this.getRequest(`${this.$root.prefix}/protocol/configuration`, {}, { suppressErrorToast: true })
        if (!response || !response.suc) throw new Error(response && response.info)
        this.configuration = response.data; const qq = response.data.qq
        this.qqForm = { enabled: qq.enabled, bots: (qq.bots || []).map((bot) => ({ ...emptyBot(), ...bot })), webhook_mode: qq.webhook_mode || "external", public_base_url: qq.public_base_url || "", listen_host: qq.listen_host || "0.0.0.0", listen_port: qq.listen_port || 443, tls_certfile: "", tls_keyfile: "", has_tls_certfile: qq.has_tls_certfile, has_tls_keyfile: qq.has_tls_keyfile }
        if (!this.qqForm.bots.length) this.qqForm.bots.push(emptyBot())
      } catch (error) { this.$message.error(error.response?.data?.detail || error.message || "协议配置读取失败。") }
      finally { this.loading = false }
    },
    async loadStatus() {
      this.statusLoading = true
      try { const response = await this.getRequest(`${this.$root.prefix}/protocol/status`, {}, { suppressErrorToast: true }); if (response && response.suc) this.status = response.data }
      finally { this.statusLoading = false }
    },
    addBot() { this.qqForm.bots.push(emptyBot()) },
    removeBot(index) { this.qqForm.bots.splice(index, 1); if (!this.qqForm.bots.length) this.qqForm.bots.push(emptyBot()) },
    canProbeBot(bot) { return Boolean(bot.id && (bot.token || bot.has_token) && (bot.secret || bot.has_secret)) },
    async probeBot(bot) {
      bot.probing = true; bot.probeResult = ""
      try {
        const response = await this.postRequest(`${this.$root.prefix}/protocol/qq/probe`, { id: bot.id, token: bot.token || null, secret: bot.secret || null })
        if (!response || !response.suc) throw new Error(response && response.info)
        bot.probeResult = response.data.username || response.data.bot_id || "凭据有效"
      } catch (error) { this.$message.error(error.response?.data?.detail || error.message || "凭据验证失败。") }
      finally { bot.probing = false }
    },
    async saveConfiguration() {
      this.saving = true
      try {
        const response = await this.putRequest(`${this.$root.prefix}/protocol/configuration`, {
          expected_revision: this.configuration.revision, onebot_access_token: this.onebotToken || null, clear_onebot_access_token: this.clearOnebotToken,
          qq_enabled: this.qqForm.enabled, qq_bots: this.qqForm.bots.map((bot) => ({ id: bot.id, token: bot.token || null, secret: bot.secret || null })),
          qq_webhook_mode: this.qqForm.webhook_mode, qq_webhook_public_base_url: this.qqForm.public_base_url, qq_webhook_listen_host: this.qqForm.listen_host,
          qq_webhook_listen_port: this.qqForm.listen_port, qq_webhook_tls_certfile: this.qqForm.tls_certfile, qq_webhook_tls_keyfile: this.qqForm.tls_keyfile,
        })
        if (!response || !response.suc) throw new Error(response && response.info)
        this.configuration.revision = response.data.revision; this.$message.success(response.info)
        if (response.data.restart_available) await this.restart()
        else this.$message.warning("配置已保存，请手动重启真寻后生效。")
      } catch (error) { this.$message.error(error.response?.data?.detail || error.message || "协议配置保存失败。") }
      finally { this.saving = false }
    },
    async restart() {
      sessionStorage.setItem("protocol_restart_pending", "1")
      const response = await this.postRequest(`${this.$root.prefix}/system/configuration/restart`, {})
      if (!response || !response.suc) { sessionStorage.removeItem("protocol_restart_pending"); throw new Error(response && response.info) }
      this.restarting = true
      for (let attempt = 0; attempt < 80; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        try { const check = await fetch(`${window.location.origin}${this.$root.prefix}/configure/status`, { cache: "no-store" }); if (check.ok) { window.location.replace(`${window.location.origin}/#/protocol`); return } } catch (error) { /* Expected while restarting. */ }
      }
      this.restarting = false; this.$message.warning("重启等待超时，请稍后手动刷新页面。")
    },
    async waitForConnection() { for (let attempt = 0; attempt < 40; attempt += 1) { await this.loadStatus(); if (this.status.qq_official_connected) return; await new Promise((resolve) => setTimeout(resolve, 1500)) } },
    async copyText(value) { try { await navigator.clipboard.writeText(value) } catch (error) { const input = document.createElement("textarea"); input.value = value; input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove() } this.$message.success("已复制") },
  },
}
</script>

<style lang="scss" scoped>
.protocol-page { height: 100%; overflow-y: auto; padding: 4px 6px 84px; color: var(--text-color); }.page-heading, .section-heading, .bot-list-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }.page-heading { margin-bottom: 22px; }.page-heading h1 { margin: 4px 0 7px; font-size: 30px; }.page-heading p, .section-heading p, .bot-list-heading p { margin: 0; color: var(--text-color-secondary); line-height: 1.6; }.eyebrow { color: var(--primary-color) !important; font-size: 12px; font-weight: 700; letter-spacing: .14em; }
.overall-status { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid var(--border-color-light); border-radius: 20px; color: var(--text-color-secondary); }.overall-status span { width: 8px; height: 8px; border-radius: 50%; background: var(--text-color-placeholder); }.overall-status.online { color: var(--success-color); }.overall-status.online span { background: var(--success-color); }
.platform-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }.platform-card { display: flex; align-items: center; gap: 12px; min-height: 76px; padding: 13px 15px; border: 1px solid var(--border-color-light); border-radius: 7px; color: var(--text-color); background: var(--bg-color-secondary); cursor: pointer; text-align: left; }.platform-card.active { border-color: var(--primary-color); box-shadow: 0 3px 12px rgba(255,107,149,.1); }.platform-card > span:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }.platform-card small { color: var(--text-color-secondary); }.platform-icon { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 7px; color: #fff; font-weight: 700; background: #7564dd; }.platform-icon.qq_official { background: #2385e8; }
.configuration-section { padding: 22px; border: 1px solid var(--border-color-light); border-radius: 7px; background: var(--bg-color-secondary); }.section-heading { padding-bottom: 18px; border-bottom: 1px solid var(--border-color-light); }.section-heading h2, .bot-list-heading h3, .section-heading h3 { margin: 0 0 5px; }.switch-line { display: flex; align-items: center; gap: 10px; }.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; padding-top: 18px; }.span-2 { grid-column: span 2; }.copy-field { display: flex; gap: 8px; padding: 8px 8px 8px 12px; border: 1px solid var(--border-color-light); border-radius: 5px; background: var(--bg-color); }.copy-field code { min-width: 0; flex: 1; overflow-wrap: anywhere; }.field-actions, .probe-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; color: var(--text-color-secondary); font-size: 12px; }.danger-text { color: var(--danger-color, #e05260) !important; }.field-help { margin: 5px 0 0; color: var(--text-color-secondary); font-size: 12px; }
.bot-list-heading { align-items: center; margin-top: 16px; padding: 18px 0 12px; }.bot-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }.bot-entry { padding: 16px; border: 1px solid var(--border-color-light); border-radius: 7px; background: var(--bg-color); }.bot-entry header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }.probe-success { color: var(--success-color); }.muted { color: var(--text-color-secondary); }.builtin-settings { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border-color-light); }.section-heading.compact { padding-bottom: 12px; }
.callback-panel { display: flex; align-items: center; gap: 14px; margin-top: 20px; padding: 16px; border: 1px solid rgba(214,158,46,.4); border-radius: 7px; background: rgba(214,158,46,.06); }.callback-panel.ready { border-color: rgba(56,161,105,.4); background: rgba(56,161,105,.06); }.callback-state { font-size: 27px; color: #c59027; }.callback-panel.ready .callback-state { color: var(--success-color); }.callback-panel > div:nth-child(2) { min-width: 0; flex: 1; }.callback-panel p { margin: 4px 0; color: var(--text-color-secondary); }.callback-panel code { overflow-wrap: anywhere; color: var(--text-color); }
.action-bar { position: sticky; bottom: 0; z-index: 4; display: flex; align-items: center; justify-content: flex-end; gap: 9px; margin-top: 16px; padding: 12px 4px; border-top: 1px solid var(--border-color-light); background: var(--bg-color); }.action-bar > span { margin-right: auto; color: var(--text-color-secondary); font-size: 12px; }.restart-overlay { position: fixed; inset: 0; z-index: 5000; display: flex; align-items: center; justify-content: center; flex-direction: column; background: rgba(250,251,253,.97); color: #30333a; }.restart-overlay > i { color: #c74e80; font-size: 42px; }
@media (max-width: 900px) { .platform-grid, .form-grid, .bot-grid { grid-template-columns: 1fr; }.span-2 { grid-column: span 1; }.callback-panel { align-items: flex-start; flex-direction: column; } }
@media (max-width: 640px) { .page-heading, .section-heading, .bot-list-heading { align-items: stretch; flex-direction: column; }.platform-grid { grid-template-columns: 1fr; }.configuration-section { padding: 16px; }.action-bar { flex-wrap: wrap; }.action-bar > span { width: 100%; }.action-bar .el-button { flex: 1; }.field-actions, .probe-row { align-items: flex-start; flex-direction: column; } }
</style>
