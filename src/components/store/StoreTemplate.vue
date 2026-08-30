<template>
  <section class="store-shell">
    <header class="store-header">
      <div>
        <h1>插件商店</h1>
        <p>浏览、安装和维护真寻插件</p>
      </div>
      <el-button icon="el-icon-refresh" :loading="loading" @click="loadPlugins">刷新</el-button>
    </header>

    <div class="store-toolbar">
      <el-input v-model.trim="search" clearable prefix-icon="el-icon-search" placeholder="搜索名称、模块或作者" />
      <el-select v-model="statusFilter" aria-label="安装状态">
        <el-option label="全部状态" value="all" />
        <el-option label="未安装" value="uninstalled" />
        <el-option label="已安装" value="installed" />
        <el-option label="可更新" value="updatable" />
      </el-select>
      <el-select v-model="typeFilter" aria-label="插件类型">
        <el-option label="全部类型" value="all" />
        <el-option v-for="type in pluginTypes" :key="type" :label="type" :value="type" />
      </el-select>
      <el-select v-model="sortBy" aria-label="排序方式">
        <el-option label="默认排序" value="default" />
        <el-option label="名称" value="name" />
        <el-option label="作者" value="author" />
        <el-option label="最近版本" value="version" />
      </el-select>
    </div>

    <div v-if="error" class="inline-state is-error">
      <i class="el-icon-warning-outline"></i><span>{{ error }}</span>
      <el-button type="text" @click="loadPlugins">重新加载</el-button>
    </div>

    <div v-loading="loading" class="store-content">
      <div v-if="pagedPlugins.length" class="plugin-grid">
        <article v-for="plugin in pagedPlugins" :key="plugin.id" class="plugin-card">
          <div class="plugin-card__head">
            <div class="plugin-title">
              <el-tooltip :content="plugin.name" placement="top"><h2>{{ plugin.name }}</h2></el-tooltip>
              <span>{{ plugin.module }}</span>
            </div>
            <el-tag v-if="plugin.update_available" size="mini" type="warning" effect="plain">可更新</el-tag>
            <el-tag v-else-if="plugin.installed" size="mini" type="success" effect="plain">已安装</el-tag>
          </div>
          <p class="plugin-description">{{ plugin.description || "暂无简介" }}</p>
          <dl class="plugin-meta">
            <div><dt>作者</dt><dd>{{ plugin.author || "未知" }}</dd></div>
            <div><dt>版本</dt><dd>v{{ plugin.version || "-" }}</dd></div>
            <div><dt>类型</dt><dd>{{ plugin.plugin_type || "其他" }}</dd></div>
            <div><dt>来源</dt><dd>{{ plugin.source === "official" ? "官方" : "社区" }}</dd></div>
          </dl>
          <footer class="plugin-actions">
            <el-button type="text" @click="showDetails(plugin)">详情</el-button>
            <el-tooltip content="打开插件仓库" placement="top">
              <el-button v-if="repositoryUrl(plugin)" class="icon-action" icon="el-icon-link" circle @click="openRepository(plugin)" />
            </el-tooltip>
            <span class="action-spacer"></span>
            <el-button v-if="!plugin.installed" type="primary" size="small" :loading="actionId === plugin.id" @click="runAction('install', plugin)">安装</el-button>
            <el-button v-else-if="plugin.update_available" type="warning" size="small" :loading="actionId === plugin.id" @click="runAction('update', plugin)">更新</el-button>
            <el-dropdown v-else trigger="click" @command="runAction($event, plugin)">
              <el-button size="small">已安装<i class="el-icon-arrow-down el-icon--right" /></el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="update">检查更新</el-dropdown-item>
                <el-dropdown-item command="remove" divided>卸载</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </footer>
        </article>
      </div>
      <div v-else-if="!loading && !error" class="empty-state">
        <i class="el-icon-box"></i><h2>没有符合条件的插件</h2><p>调整搜索词或筛选条件后重试</p>
      </div>
    </div>

    <el-pagination v-if="filteredPlugins.length > pageSize" class="store-pagination" background layout="prev, pager, next" :current-page.sync="page" :page-size="pageSize" :total="filteredPlugins.length" />

    <el-drawer :visible.sync="drawerVisible" :title="selectedPlugin ? selectedPlugin.name : '插件详情'" :size="drawerSize" append-to-body>
      <div v-if="selectedPlugin" class="detail-drawer">
        <div class="detail-module">{{ selectedPlugin.module }}</div>
        <h3>简介</h3><p>{{ selectedPlugin.description || "暂无简介" }}</p>
        <h3>使用说明</h3><pre>{{ selectedPlugin.usage || "暂无使用说明" }}</pre>
        <h3>仓库</h3>
        <a v-if="repositoryUrl(selectedPlugin)" :href="repositoryUrl(selectedPlugin)" target="_blank" rel="noopener noreferrer">{{ repositoryUrl(selectedPlugin) }}</a>
        <span v-else>未提供仓库地址</span>
      </div>
    </el-drawer>
  </section>
</template>

<script>
export default {
  name: "StoreTemplate",
  data() {
    return { plugins: [], loading: false, error: "", search: "", statusFilter: "all", typeFilter: "all", sortBy: "default", page: 1, pageSize: 18, actionId: null, drawerVisible: false, selectedPlugin: null }
  },
  computed: {
    pluginTypes() { return [...new Set(this.plugins.map((item) => item.plugin_type).filter(Boolean))].sort() },
    filteredPlugins() {
      const keyword = this.search.toLowerCase()
      const result = this.plugins.filter((plugin) => {
        const matchesSearch = !keyword || `${plugin.name} ${plugin.module} ${plugin.author}`.toLowerCase().includes(keyword)
        const matchesType = this.typeFilter === "all" || plugin.plugin_type === this.typeFilter
        const matchesStatus = this.statusFilter === "all" || (this.statusFilter === "uninstalled" && !plugin.installed) || (this.statusFilter === "installed" && plugin.installed) || (this.statusFilter === "updatable" && plugin.update_available)
        return matchesSearch && matchesType && matchesStatus
      })
      if (this.sortBy === "default") return result
      return [...result].sort((left, right) => String(left[this.sortBy] || "").localeCompare(String(right[this.sortBy] || ""), "zh-CN"))
    },
    pagedPlugins() { const start = (this.page - 1) * this.pageSize; return this.filteredPlugins.slice(start, start + this.pageSize) },
    drawerSize() { return window.innerWidth <= 680 ? "92%" : "520px" },
  },
  watch: { search() { this.page = 1 }, statusFilter() { this.page = 1 }, typeFilter() { this.page = 1 }, sortBy() { this.page = 1 } },
  mounted() { this.loadPlugins() },
  methods: {
    repositoryUrl(plugin) { return plugin.github_url || plugin.ali_url || "" },
    openRepository(plugin) { window.open(this.repositoryUrl(plugin), "_blank", "noopener,noreferrer") },
    showDetails(plugin) { this.selectedPlugin = plugin; this.drawerVisible = true },
    async loadPlugins() {
      this.loading = true; this.error = ""
      try {
        const response = await this.getRequest(`${this.$root.prefix}/store/get_plugin_store`)
        if (!response.suc) throw new Error(response.info || "插件商店加载失败")
        this.plugins = Array.isArray(response.data.plugin_list) ? response.data.plugin_list : []
      } catch (error) {
        this.plugins = []
        this.error = error.response?.data?.detail || error.message || "插件商店暂时不可用。"
      } finally { this.loading = false }
    },
    async runAction(action, plugin) {
      const labels = { install: "安装", update: "更新", remove: "卸载" }
      const confirmed = await this.$cuteConfirm({ title: `${labels[action]}插件`, message: `确认${labels[action]}“${plugin.name}”？`, confirmButtonText: "确认", cancelButtonText: "取消", type: action === "remove" ? "warning" : "info" })
      if (!confirmed) return
      this.actionId = plugin.id
      try {
        const response = await this.postRequest(`${this.$root.prefix}/store/${action}_plugin`, { id: plugin.id })
        if (!response.suc) throw new Error(response.info || `${labels[action]}失败`)
        this.$message.success(response.info || `${labels[action]}完成`)
        await this.loadPlugins()
      } catch (error) { this.$message.error(error.response?.data?.detail || error.message || `${labels[action]}失败`) }
      finally { this.actionId = null }
    },
  },
}
</script>

<style scoped>
.store-shell { min-height: 100%; padding: 22px; color: var(--text-color); background: var(--bg-color); }
.store-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.store-header h1 { margin: 0; font-size: 24px; }.store-header p { margin: 5px 0 0; color: var(--text-color-secondary); }
.store-toolbar { display: grid; grid-template-columns: minmax(240px, 1fr) 150px 150px 150px; gap: 10px; margin-bottom: 16px; }
.store-content { min-height: 260px; }.plugin-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.plugin-card { display: flex; min-width: 0; min-height: 244px; flex-direction: column; padding: 16px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-color-secondary); }
.plugin-card__head { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 10px; }.plugin-title { min-width: 0; }
.plugin-title h2 { margin: 0; overflow: hidden; color: var(--text-color); font-size: 16px; line-height: 24px; text-overflow: ellipsis; white-space: nowrap; }
.plugin-title span, .detail-module { color: var(--text-color-secondary); font-family: Consolas, monospace; font-size: 12px; }
.plugin-description { display: -webkit-box; min-height: 44px; margin: 14px 0; overflow: hidden; color: var(--text-color-secondary); line-height: 22px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.plugin-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin: 0 0 14px; }.plugin-meta div { min-width: 0; }.plugin-meta dt { color: var(--text-color-secondary); font-size: 11px; }.plugin-meta dd { margin: 2px 0 0; overflow: hidden; color: var(--text-color); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.plugin-actions { display: flex; min-height: 34px; align-items: center; gap: 7px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border-color); }.action-spacer { flex: 1; }.icon-action { width: 32px; height: 32px; padding: 0; }
.inline-state, .empty-state { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 96px; color: var(--text-color-secondary); }.inline-state.is-error { margin-bottom: 14px; border: 1px solid var(--el-color-danger-light-7); border-radius: 6px; color: var(--el-color-danger); background: var(--el-color-danger-light-9); }
.empty-state { min-height: 300px; flex-direction: column; }.empty-state i { font-size: 34px; }.empty-state h2, .empty-state p { margin: 0; }.store-pagination { margin-top: 20px; text-align: center; }
.detail-drawer { padding: 0 22px 24px; color: var(--text-color); }.detail-drawer h3 { margin: 22px 0 8px; font-size: 14px; }.detail-drawer p, .detail-drawer pre { margin: 0; color: var(--text-color-secondary); line-height: 1.7; white-space: pre-wrap; word-break: break-word; }.detail-drawer a { word-break: break-all; }
@media (max-width: 1180px) { .plugin-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.store-toolbar { grid-template-columns: 1fr 1fr; } }
@media (max-width: 680px) { .store-shell { padding: 14px; }.store-header { align-items: flex-start; }.store-toolbar, .plugin-grid { grid-template-columns: 1fr; }.plugin-card { min-height: 224px; } }
</style>
