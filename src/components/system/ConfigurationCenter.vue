<template>
  <div class="configuration-center" v-loading="loading">
    <div class="configuration-toolbar">
      <div>
        <h2>运行配置</h2>
        <p>常用环境参数需要重启生效，插件配置保存后立即热加载。</p>
      </div>
      <el-button icon="el-icon-refresh" @click="loadSummary">重新加载</el-button>
    </div>

    <el-tabs v-model="section">
      <el-tab-pane label="环境配置" name="env">
        <el-form label-position="top" class="env-form">
          <el-form-item v-for="field in envFieldDefinitions" :key="field.key" :label="field.label">
            <el-input v-model="envFields[field.key]" :placeholder="field.placeholder" />
            <div class="field-help">{{ field.help }}</div>
          </el-form-item>
        </el-form>
        <div class="action-bar">
          <span>{{ launcherManaged ? "保存后可由 launcher 自动重启" : "保存后需要手动重启" }}</span>
          <el-button type="primary" :loading="saving === 'env'" @click="saveEnv">保存环境配置</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="插件配置" name="simple">
        <el-input v-model="groupSearch" clearable prefix-icon="el-icon-search" placeholder="搜索配置组或配置项" class="group-search" />
        <el-collapse v-model="expandedGroups" accordion>
          <el-collapse-item v-for="group in filteredGroups" :key="group.module" :name="group.module">
            <template #title><strong>{{ group.name }}</strong><span class="group-module">{{ group.module }}</span></template>
            <div class="config-fields">
              <div v-for="field in group.fields" :key="field.key" class="config-field">
                <div class="config-label"><strong>{{ field.key }}</strong><span>{{ field.help }}</span></div>
                <div v-if="field.sensitive" class="sensitive-placeholder"><i class="el-icon-lock"></i>敏感字段请在高级原文中修改</div>
                <AutoComponent v-else-if="editableType(field.type)" v-model="field.value" :type="field.type" :type-inner="field.type_inner" @input="markSimpleChanged(group.module, field)" />
                <el-input v-else v-model="field.serialized" type="textarea" :rows="3" @input="markSerializedChanged(group.module, field)" />
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
        <div class="action-bar">
          <span>未知配置组会原样保留</span>
          <el-button type="primary" :loading="saving === 'simple'" @click="saveSimple">保存并热加载</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="高级原文" name="raw" lazy>
        <el-alert title="原文可能包含 Token、密码和 Secret。请勿截图、分享或粘贴到外部服务。" type="warning" :closable="false" show-icon />
        <div class="raw-switch">
          <el-radio-group v-model="rawFile" size="small" @change="loadRaw">
            <el-radio-button label="env">.env.dev</el-radio-button>
            <el-radio-button label="simple">config.yaml</el-radio-button>
          </el-radio-group>
          <el-button size="small" icon="el-icon-refresh" @click="loadRaw(rawFile)">重新读取</el-button>
        </div>
        <el-input v-model="rawContent" type="textarea" :rows="22" resize="vertical" class="raw-editor" spellcheck="false" />
        <div v-if="rawError" class="inline-error">{{ rawError }}</div>
        <div class="action-bar">
          <span>保存前会重新校验语法和 revision</span>
          <el-button :loading="validating" @click="validateRaw">校验</el-button>
          <el-button type="primary" :loading="saving === 'raw'" @click="saveRaw">保存</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>

    <div v-if="restarting" class="restart-overlay">
      <i class="el-icon-loading"></i><h2>正在重启真寻</h2><p>服务恢复后页面会自动刷新。</p>
      <div v-if="restartTimedOut" class="restart-addresses">
        <p>自动连接超时，可从以下地址手动打开：</p>
        <a v-for="url in restartTargets" :key="url" :href="`${url}/#/`">{{ url }}</a>
      </div>
    </div>
  </div>
</template>

<script>
import AutoComponent from "@/components/plugin/AutoComponent.vue"
import { buildRestartTargets } from "@/utils/restart-targets"

export default {
  name: "ConfigurationCenter",
  components: { AutoComponent },
  data() {
    return {
      loading: false, saving: "", validating: false, section: "env", envRevision: "", simpleRevision: "", envFields: {}, originalEnvFields: {}, groups: [], simpleChanges: {}, groupSearch: "", expandedGroups: "", launcherManaged: false,
      rawFile: "env", rawContent: "", rawRevision: "", rawError: "", rawLoaded: {},
      restarting: false, restartTimedOut: false, restartTargets: [],
      envFieldDefinitions: [
        { key: "HOST", label: "监听地址", placeholder: "0.0.0.0", help: "0.0.0.0 允许局域网访问，127.0.0.1 仅本机访问。" },
        { key: "PORT", label: "监听端口", placeholder: "8080", help: "WebUI 与适配器共享的本地服务端口。" },
        { key: "LOG_LEVEL", label: "日志等级", placeholder: "INFO", help: "常用值为 DEBUG、INFO、WARNING。" },
        { key: "SYSTEM_PROXY", label: "系统代理", placeholder: "http://127.0.0.1:7890", help: "留空表示不使用代理。" },
        { key: "NICKNAME", label: "机器人昵称", placeholder: "[\"真寻\"]", help: "使用 dotenv 支持的列表格式。" },
        { key: "SELF_NICKNAME", label: "回复昵称", placeholder: "真寻", help: "回复消息中使用的自称。" },
        { key: "COMMAND_START", label: "命令前缀", placeholder: "[\"/\"]", help: "支持多个命令前缀。" },
        { key: "SUPERUSERS", label: "超级用户", placeholder: "[\"123456\"]", help: "平台用户 ID 列表。" },
        { key: "SESSION_EXPIRE_TIMEOUT", label: "会话超时", placeholder: "120", help: "交互会话的超时秒数。" },
        { key: "IMAGE_TO_BYTES", label: "图片字节发送", placeholder: "False", help: "仅在适配器需要时开启。" },
        { key: "EXT_PATH", label: "扩展插件路径", placeholder: "[]", help: "额外插件目录列表。" },
      ],
    }
  },
  computed: {
    filteredGroups() {
      const keyword = this.groupSearch.trim().toLowerCase()
      if (!keyword) return this.groups
      return this.groups.filter((group) => `${group.name} ${group.module} ${group.fields.map((field) => field.key).join(" ")}`.toLowerCase().includes(keyword))
    },
  },
  mounted() { this.loadSummary() },
  methods: {
    editableType(type) { return ["str", "int", "float", "bool", "list", "tuple"].includes(type) },
    normalizeGroups(groups) {
      return (groups || []).map((group) => ({ ...group, fields: group.fields.map((field) => ({ ...field, serialized: this.editableType(field.type) ? "" : JSON.stringify(field.value, null, 2) })) }))
    },
    async loadSummary() {
      this.loading = true
      try {
        const response = await this.getRequest(`${this.$root.prefix}/system/configuration/summary`)
        if (!response.suc) throw new Error(response.info)
        this.envRevision = response.data.env.revision
        this.envFields = { ...response.data.env.fields }
        this.originalEnvFields = { ...response.data.env.fields }
        this.simpleRevision = response.data.simple.revision
        this.groups = this.normalizeGroups(response.data.simple.groups)
        this.simpleChanges = {}
        this.launcherManaged = response.data.launcher_managed
      } catch (error) { this.$message.error(error.message || "配置摘要加载失败") }
      finally { this.loading = false }
    },
    markSimpleChanged(module, field) {
      if (!this.simpleChanges[module]) this.$set(this.simpleChanges, module, {})
      this.$set(this.simpleChanges[module], field.key, field.value)
    },
    markSerializedChanged(module, field) {
      try { field.value = JSON.parse(field.serialized); this.markSimpleChanged(module, field) }
      catch (error) { /* Keep editing until save. */ }
    },
    changedEnvFields() {
      const changed = {}
      this.envFieldDefinitions.forEach(({ key }) => { if (this.envFields[key] !== this.originalEnvFields[key]) changed[key] = this.envFields[key] == null ? "" : this.envFields[key] })
      return changed
    },
    async saveEnv() {
      const fields = this.changedEnvFields()
      if (!Object.keys(fields).length) return this.$message.info("没有需要保存的环境配置。")
      this.saving = "env"
      try {
        const response = await this.putRequest(`${this.$root.prefix}/system/configuration/files/env`, { expected_revision: this.envRevision, fields })
        if (!response.suc) throw new Error(response.info)
        this.envRevision = response.data.revision
        this.originalEnvFields = { ...this.envFields }
        this.$message.success(response.info)
        if (response.data.restart_available) await this.restart(response.data.access_urls || [])
        else this.$message.warning("配置已保存，请手动重启真寻后生效。")
      } catch (error) { this.$message.error(error.response?.data?.detail || error.message || "保存失败") }
      finally { this.saving = "" }
    },
    async saveSimple() {
      if (!Object.keys(this.simpleChanges).length) return this.$message.info("没有需要保存的插件配置。")
      this.saving = "simple"
      try {
        const response = await this.putRequest(`${this.$root.prefix}/system/configuration/files/simple`, { expected_revision: this.simpleRevision, fields: this.simpleChanges })
        if (!response.suc) throw new Error(response.info)
        this.simpleRevision = response.data.revision; this.simpleChanges = {}; this.$message.success(response.info)
      } catch (error) { this.$message.error(error.response?.data?.detail || error.message || "保存失败") }
      finally { this.saving = "" }
    },
    async loadRaw(file) {
      this.rawError = ""
      try {
        const response = await this.getRequest(`${this.$root.prefix}/system/configuration/files/${file}`, {}, { suppressErrorToast: true })
        if (!response.suc) throw new Error(response.info)
        this.rawContent = response.data.content; this.rawRevision = response.data.revision; this.$set(this.rawLoaded, file, true)
      } catch (error) { this.rawError = error.response?.data?.detail || error.message || "配置文件读取失败。" }
    },
    async validateRaw() {
      this.validating = true; this.rawError = ""
      try {
        const response = await this.postRequest(`${this.$root.prefix}/system/configuration/validate`, { file: this.rawFile, content: this.rawContent })
        if (!response.suc) throw new Error(response.info)
        this.$message.success("配置语法检查通过。")
      } catch (error) { this.rawError = error.response?.data?.detail || error.message || "配置校验失败。" }
      finally { this.validating = false }
    },
    async saveRaw() {
      if (!this.rawLoaded[this.rawFile]) await this.loadRaw(this.rawFile)
      this.saving = "raw"; this.rawError = ""
      try {
        const response = await this.putRequest(`${this.$root.prefix}/system/configuration/files/${this.rawFile}`, { expected_revision: this.rawRevision, content: this.rawContent })
        if (!response.suc) throw new Error(response.info)
        this.rawRevision = response.data.revision; this.$message.success(response.info)
        if (response.data.restart_available) await this.restart(response.data.access_urls || [])
        else if (response.data.restart_required) this.$message.warning("配置已保存，请手动重启真寻后生效。")
        else await this.loadSummary()
      } catch (error) { this.rawError = error.response?.data?.detail || error.message || "保存失败。" }
      finally { this.saving = "" }
    },
    async restart(accessUrls) {
      const host = String(this.envFields.HOST || "0.0.0.0"); const port = Number(this.envFields.PORT || 8080)
      const mode = host === "127.0.0.1" ? "local" : host === "0.0.0.0" || host === "::" ? "lan" : "custom"
      this.restartTargets = buildRestartTargets({ mode, customHost: host, port, accessUrls })
      const response = await this.postRequest(`${this.$root.prefix}/system/configuration/restart`, {})
      if (!response.suc) throw new Error(response.info)
      this.restarting = true; this.restartTimedOut = false
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        for (const baseUrl of this.restartTargets) {
          try { const check = await fetch(`${baseUrl}${this.$root.prefix}/configure/status`, { cache: "no-store" }); if (check.ok) { window.location.replace(`${baseUrl}/#/system`); return } }
          catch (error) { /* Expected while restarting. */ }
        }
      }
      this.restartTimedOut = true
    },
  },
  watch: {
    section(value) { if (value === "raw" && !this.rawLoaded[this.rawFile]) this.loadRaw(this.rawFile) },
  },
}
</script>

<style scoped>
.configuration-center { min-height: 420px; }.configuration-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }.configuration-toolbar h2 { margin: 0; font-size: 20px; }.configuration-toolbar p { margin: 5px 0 0; color: var(--text-color-secondary); }
.env-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }.field-help { margin-top: 5px; color: var(--text-color-secondary); font-size: 12px; line-height: 1.5; }.group-search { max-width: 420px; margin-bottom: 14px; }.group-module { margin-left: 10px; color: var(--text-color-secondary); font-family: Consolas, monospace; font-size: 12px; }
.config-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 20px; padding: 6px 4px 18px; }.config-field { min-width: 0; }.config-label { display: flex; min-height: 38px; flex-direction: column; margin-bottom: 7px; }.config-label span { color: var(--text-color-secondary); font-size: 12px; }.sensitive-placeholder { padding: 11px; border: 1px dashed var(--border-color); border-radius: 5px; color: var(--text-color-secondary); }
.action-bar { position: sticky; bottom: 0; z-index: 2; display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 16px; padding: 12px 0; border-top: 1px solid var(--border-color); background: var(--bg-color-secondary); }.action-bar span { margin-right: auto; color: var(--text-color-secondary); font-size: 12px; }.raw-switch { display: flex; align-items: center; justify-content: space-between; margin: 14px 0 10px; }.raw-editor ::v-deep textarea { font-family: Consolas, "Courier New", monospace; font-size: 13px; line-height: 1.55; }.inline-error { margin-top: 8px; color: var(--el-color-danger); }
.restart-overlay { position: fixed; inset: 0; z-index: 5000; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 24px; background: rgba(250, 251, 253, .97); color: #30333a; text-align: center; }.restart-overlay > i { color: #c74e80; font-size: 42px; }.restart-addresses { display: flex; flex-direction: column; gap: 7px; }.restart-addresses a { color: #b63d70; }
@media (max-width: 760px) { .env-form, .config-fields { grid-template-columns: 1fr; }.configuration-toolbar { align-items: flex-start; }.action-bar { flex-wrap: wrap; }.action-bar span { width: 100%; }.raw-switch { gap: 10px; } }
</style>
