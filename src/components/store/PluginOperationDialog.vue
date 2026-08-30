<template>
  <el-dialog
    :visible="operation.visible"
    :show-close="!operation.active"
    :close-on-click-modal="false"
    :close-on-press-escape="!operation.active"
    :before-close="close"
    width="420px"
    custom-class="plugin-operation-dialog"
  >
    <div class="operation-content" :class="`is-${operation.status}`">
      <i :class="iconClass"></i>
      <div>
        <h3>{{ operation.title }}</h3>
        <p>{{ operation.message }}</p>
        <strong v-if="operation.pluginName">{{ operation.pluginName }}</strong>
      </div>
    </div>
    <span v-if="!operation.active" slot="footer">
      <el-button type="primary" @click="close">完成</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: "PluginOperationDialog",
  computed: {
    operation() {
      return this.$store.state.pluginOperation
    },
    iconClass() {
      if (this.operation.active) return "el-icon-loading"
      return this.operation.status === "success"
        ? "el-icon-circle-check"
        : "el-icon-warning-outline"
    },
  },
  methods: {
    close(done) {
      if (this.operation.active) return
      this.$store.commit("CLEAR_PLUGIN_OPERATION")
      if (typeof done === "function") done()
    },
  },
}
</script>

<style scoped>
.operation-content { display: flex; align-items: flex-start; gap: 16px; color: var(--text-color); }
.operation-content > i { margin-top: 2px; color: var(--primary-color); font-size: 34px; }
.operation-content.is-success > i { color: var(--success-color); }
.operation-content.is-error > i { color: var(--danger-color); }
h3 { margin: 0 0 7px; font-size: 18px; }
p { margin: 0 0 8px; color: var(--text-color-secondary); line-height: 1.6; }
strong { overflow-wrap: anywhere; }
</style>
