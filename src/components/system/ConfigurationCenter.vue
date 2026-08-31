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
        <div class="plugin-config-workbench">
          <aside class="config-groups">
            <el-input v-model="groupSearch" clearable prefix-icon="el-icon-search" placeholder="搜索配置组" size="small" />
            <button v-for="group in filteredGroups" :key="group.module" :class="{ active: selectedGroup === group.module }" @click="selectedGroup = group.module">
              <strong>{{ group.name }}</strong><span>{{ group.module }}</span>
            </button>
            <div v-if="!filteredGroups.length" class="group-empty">没有匹配的配置组</div>
          </aside>
          <section v-if="currentGroup" class="current-config-group">
            <header class="group-heading"><div><h3>{{ currentGroup.name }}</h3><p>{{ currentGroup.module }} · {{ currentGroup.fields.length }} 个配置项</p></div><el-button size="small" @click="resetCurrentGroup">恢复本组默认值</el-button></header>
            <SchemaForm :key="selectedGroup" :value="currentGroupValue" :schema="currentGroupSchema" :field-ui="currentGroupUi" :issues="pluginIssues" @input="updateCurrentGroup" @validity-change="pluginInvalidPaths = $event" />
            <div v-for="field in currentSensitiveFields" :key="field.key" class="sensitive-placeholder"><i class="el-icon-lock"></i><span><strong>{{ (field.ui && field.ui.label) || field.key }}</strong>为敏感字段，请在高级原文中修改。</span></div>
          </section>
          <section v-else class="current-config-empty"><i class="el-icon-setting"></i><p>选择一个配置组开始编辑</p></section>
        </div>
        <div class="action-bar">
          <span>{{ Object.keys(simpleChanges).length ? `${Object.keys(simpleChanges).length} 个配置组有未保存修改` : "未知配置组和字段会原样保留" }}</span>
          <el-button type="primary" :loading="saving === 'simple'" :disabled="pluginInvalidPaths.length > 0" @click="saveSimple">保存并热加载</el-button>
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
        <ul v-if="rawIssues.length" class="validation-issues">
          <li v-for="(issue, index) in rawIssues" :key="`${issue.code}-${index}`">
            <code v-if="issue.line">第 {{ issue.line }} 行<span v-if="issue.column">:{{ issue.column }}</span></code>
            <span>{{ issue.message }}</span>
          </li>
        </ul>
        <div class="action-bar">
          <span>保存前会重新校验语法和 revision</span>
          <el-button :loading="validating" :disabled="!rawReady" @click="validateRaw">校验</el-button>
          <el-button type="primary" :loading="saving === 'raw'" :disabled="!rawReady" @click="saveRaw">保存</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>

  </div>
</template>

<script>
import SchemaForm from "@/components/config/SchemaForm.vue"
import { buildRestartTargets } from "@/utils/restart-targets"
import { apiErrorDetail, apiErrorIssues } from "@/utils/api-error"
import { confirmAndRestart } from "@/utils/restart-flow"
import { setDirtyState, clearDirtyState } from "@/utils/dirty-state"

export default {
  name: "ConfigurationCenter",
  components: { SchemaForm },
  data() {
    return {
      loading: false, saving: "", validating: false, section: "env", envRevision: "", simpleRevision: "", envFields: {}, originalEnvFields: {}, groups: [], simpleChanges: {}, groupSearch: "", selectedGroup: "", launcherManaged: false,
      rawFile: "env", rawContent: "", rawRevision: "", rawError: "", rawIssues: [], rawLoaded: {}, pluginInvalidPaths: [], pluginIssues: [],
      restartTargets: [],
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
    rawReady() { return Boolean(this.rawLoaded[this.rawFile] && /^[a-f0-9]{64}$/.test(this.rawRevision)) },
    filteredGroups() {
      const keyword = this.groupSearch.trim().toLowerCase()
      if (!keyword) return this.groups
      return this.groups.filter((group) => `${group.name} ${group.module} ${group.fields.map((field) => field.key).join(" ")}`.toLowerCase().includes(keyword))
    },
    currentGroup() { return this.groups.find((group) => group.module === this.selectedGroup) || null },
    editableCurrentFields() { return this.currentGroup ? this.currentGroup.fields.filter((field) => !field.sensitive) : [] },
    currentSensitiveFields() { return this.currentGroup ? this.currentGroup.fields.filter((field) => field.sensitive) : [] },
    currentGroupValue() { return Object.fromEntries(this.editableCurrentFields.map((field) => [field.key, field.value])) },
    currentGroupSchema() {
      const result = { type: "object", properties: {}, $defs: {}, definitions: {} }
      this.editableCurrentFields.forEach((field) => {
        const schema = field.schema || { type: "string" }
        result.properties[field.key] = schema
        Object.assign(result.$defs, schema.$defs || {})
        Object.assign(result.definitions, schema.definitions || {})
      })
      return result
    },
    currentGroupUi() { return Object.fromEntries(this.editableCurrentFields.map((field) => [field.key, { label: field.ui?.label || field.key, ...(field.ui || {}), description: field.help }])) },
  },
  mounted() { this.loadSummary() },
  beforeDestroy() { clearDirtyState("plugin-configuration") },
  methods: {
    normalizeGroups(groups) {
      return (groups || []).filter((group) => group.module !== "AI").map((group) => ({ ...group, fields: group.fields.map((field) => ({ ...field })) }))
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
        if (!this.groups.some((group) => group.module === this.selectedGroup)) this.selectedGroup = this.groups[0]?.module || ""
        this.pluginInvalidPaths = []; this.pluginIssues = []
        this.simpleChanges = {}
        clearDirtyState("plugin-configuration")
        this.launcherManaged = response.data.launcher_managed
      } catch (error) { this.$message.error(error.message || "配置摘要加载失败") }
      finally { this.loading = false }
    },
    markSimpleChanged(module, field) {
      if (!this.simpleChanges[module]) this.$set(this.simpleChanges, module, {})
      this.$set(this.simpleChanges[module], field.key, field.value)
    },
    updateCurrentGroup(value) {
      if (!this.currentGroup) return
      this.editableCurrentFields.forEach((field) => { if (Object.prototype.hasOwnProperty.call(value, field.key)) field.value = value[field.key] })
      this.$set(this.simpleChanges, this.currentGroup.module, { ...value }); this.pluginIssues = []
      setDirtyState("plugin-configuration", true)
    },
    resetCurrentGroup() {
      if (!this.currentGroup) return
      const values = {}
      this.editableCurrentFields.forEach((field) => { field.value = field.default_value == null ? field.default_value : JSON.parse(JSON.stringify(field.default_value)); values[field.key] = field.value })
      this.$set(this.simpleChanges, this.currentGroup.module, values)
      setDirtyState("plugin-configuration", true)
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
      } catch (error) { this.$message.error(apiErrorDetail(error, "保存失败")) }
      finally { this.saving = "" }
    },
    async saveSimple() {
      if (!Object.keys(this.simpleChanges).length) return this.$message.info("没有需要保存的插件配置。")
      this.saving = "simple"
      try {
        const response = await this.putRequest(`${this.$root.prefix}/system/configuration/files/simple`, { expected_revision: this.simpleRevision, fields: this.simpleChanges })
        if (!response.suc) throw new Error(response.info)
        this.simpleRevision = response.data.revision; this.simpleChanges = {}; clearDirtyState("plugin-configuration"); this.$message.success(response.info)
        if (response.data.restart_available) await this.restart(response.data.access_urls || [], { preserveOrigin: true })
        else if (response.data.restart_required) this.$message.warning("配置已保存，请手动重启真寻后生效。")
      } catch (error) { this.pluginIssues = apiErrorIssues(error); this.$message.error(apiErrorDetail(error, "保存失败")) }
      finally { this.saving = "" }
    },
    async loadRaw(file) {
      this.rawError = ""; this.rawIssues = []; this.rawRevision = ""
      try {
        const response = await this.getRequest(`${this.$root.prefix}/system/configuration/files/${file}`, {}, { suppressErrorToast: true })
        if (!response.suc) throw new Error(response.info)
        this.rawContent = response.data.content; this.rawRevision = response.data.revision; this.$set(this.rawLoaded, file, true)
      } catch (error) { this.rawError = apiErrorDetail(error, "配置文件读取失败。"); this.$set(this.rawLoaded, file, false) }
    },
    async validateRaw() {
      if (!this.rawReady) return
      this.validating = true; this.rawError = ""; this.rawIssues = []
      try {
        const response = await this.postRequest(`${this.$root.prefix}/system/configuration/validate`, { file: this.rawFile, content: this.rawContent })
        if (!response.suc) throw new Error(response.info)
        this.$message.success("配置语法检查通过。")
      } catch (error) { this.rawIssues = apiErrorIssues(error); this.rawError = apiErrorDetail(error, "配置校验失败。") }
      finally { this.validating = false }
    },
    async saveRaw() {
      if (!this.rawReady) return
      this.saving = "raw"; this.rawError = ""; this.rawIssues = []
      try {
        const response = await this.putRequest(`${this.$root.prefix}/system/configuration/files/${this.rawFile}`, { expected_revision: this.rawRevision, content: this.rawContent })
        if (!response.suc) throw new Error(response.info)
        this.rawRevision = response.data.revision; this.$message.success(response.info)
        if (response.data.restart_available) await this.restart(response.data.access_urls || [], { preserveOrigin: this.rawFile === "simple" })
        else if (response.data.restart_required) this.$message.warning("配置已保存，请手动重启真寻后生效。")
        else await this.loadSummary()
      } catch (error) { this.rawIssues = apiErrorIssues(error); this.rawError = apiErrorDetail(error, "保存失败。"); if (error.response?.status === 409) this.$set(this.rawLoaded, this.rawFile, false) }
      finally { this.saving = "" }
    },
    async restart(accessUrls, { preserveOrigin = false } = {}) {
      const host = String(this.envFields.HOST || "0.0.0.0"); const port = Number(this.envFields.PORT || 8080)
      const mode = host === "127.0.0.1" ? "local" : host === "0.0.0.0" || host === "::" ? "lan" : "custom"
      this.restartTargets = buildRestartTargets({ mode, customHost: host, port, accessUrls })
      return confirmAndRestart(this, {
        prompt: "配置已保存，需要重启后生效。",
        request: () => this.postRequest(`${this.$root.prefix}/system/configuration/restart`, {}),
        recovery: {
          policy: preserveOrigin ? "preserve" : mode === "lan" ? "network" : mode,
          preferredUrl: preserveOrigin ? window.location.origin : this.restartTargets[0] || "",
          accessUrls: this.restartTargets,
          returnRoute: "/system",
          message: "配置将在新进程中生效。",
        },
      })
    },
  },
  watch: {
    section(value) { if (value === "raw" && !this.rawLoaded[this.rawFile]) this.loadRaw(this.rawFile) },
    selectedGroup() { this.pluginInvalidPaths = [] },
  },
}
</script>

<style scoped>
.configuration-center { min-height: 420px; }.configuration-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }.configuration-toolbar h2 { margin: 0; font-size: 20px; }.configuration-toolbar p { margin: 5px 0 0; color: var(--text-color-secondary); }
.env-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }.field-help { margin-top: 5px; color: var(--text-color-secondary); font-size: 12px; line-height: 1.5; }.plugin-config-workbench { display: grid; min-height: 540px; grid-template-columns: 230px minmax(0, 1fr); border: 1px solid var(--border-color); border-radius: 8px; }.config-groups { display: flex; min-width: 0; flex-direction: column; gap: 4px; padding: 14px; border-right: 1px solid var(--border-color); }.config-groups .el-input { margin-bottom: 8px; }.config-groups button { display: flex; min-height: 54px; flex-direction: column; justify-content: center; padding: 7px 9px; border: 1px solid transparent; border-radius: 6px; color: var(--text-color); background: transparent; text-align: left; cursor: pointer; }.config-groups button:hover { background: var(--bg-color-hover); }.config-groups button.active { border-color: var(--primary-color); background: var(--bg-color-hover); }.config-groups button strong, .config-groups button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.config-groups button span { margin-top: 3px; color: var(--text-color-secondary); font-size: 11px; }.current-config-group { min-width: 0; padding: 18px 20px; }.group-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color-light); }.group-heading h3 { margin: 0; font-size: 18px; }.group-heading p { margin: 4px 0 0; color: var(--text-color-secondary); font-size: 12px; }.group-empty, .current-config-empty { color: var(--text-color-secondary); text-align: center; }.group-empty { padding: 24px 4px; }.current-config-empty { display: grid; place-content: center; }.current-config-empty i { font-size: 36px; }.sensitive-placeholder { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 11px; border: 1px dashed var(--border-color); border-radius: 5px; color: var(--text-color-secondary); }
.action-bar { position: sticky; bottom: 0; z-index: 2; display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 16px; padding: 12px 0; border-top: 1px solid var(--border-color); background: var(--bg-color-secondary); }.action-bar span { margin-right: auto; color: var(--text-color-secondary); font-size: 12px; }.raw-switch { display: flex; align-items: center; justify-content: space-between; margin: 14px 0 10px; }.raw-editor ::v-deep textarea { font-family: Consolas, "Courier New", monospace; font-size: 13px; line-height: 1.55; }.inline-error { margin-top: 8px; color: var(--el-color-danger); }
.validation-issues { margin: 10px 0 0; padding: 10px 14px 10px 34px; border: 1px solid rgba(224,82,96,.35); border-radius: 6px; color: var(--danger-color); background: rgba(224,82,96,.06); }.validation-issues li { margin: 4px 0; line-height: 1.55; }.validation-issues code { margin-right: 8px; }
@media (max-width: 760px) { .env-form { grid-template-columns: 1fr; }.configuration-toolbar { align-items: flex-start; }.plugin-config-workbench { grid-template-columns: 1fr; }.config-groups { display: grid; max-height: 240px; grid-template-columns: repeat(2, minmax(0, 1fr)); overflow-y: auto; border-right: 0; border-bottom: 1px solid var(--border-color); }.config-groups .el-input { grid-column: 1 / -1; }.current-config-group { padding: 14px; }.group-heading { align-items: flex-start; flex-direction: column; }.action-bar { flex-wrap: wrap; }.action-bar span { width: 100%; }.raw-switch { gap: 10px; } }
</style>
