<template>
  <section v-if="error" class="qq-diagnostic" role="alert">
    <header>
      <i class="el-icon-circle-close"></i>
      <strong>{{ error.message || "QQ 官方机器人连接失败。" }}</strong>
    </header>
    <div class="diagnostic-facts">
      <span v-if="error.code">真寻错误码 <code>{{ error.code }}</code></span>
      <span v-if="error.provider_code">QQ错误码 <code>{{ error.provider_code }}</code></span>
      <span v-if="error.http_status">HTTP <code>{{ error.http_status }}</code></span>
    </div>
    <p v-if="error.provider_explanation">{{ error.provider_explanation }}</p>
    <p v-if="error.suggestion"><b>处理建议</b>{{ error.suggestion }}</p>
    <div v-if="error.trace_id" class="trace-row">
      <span>Trace ID</span>
      <code>{{ error.trace_id }}</code>
      <el-button type="text" size="mini" @click="$emit('copy', error.trace_id)">复制</el-button>
    </div>
  </section>
</template>

<script>
export default {
  name: "QQDiagnostic",
  props: {
    error: {
      type: Object,
      default: null,
    },
  },
}
</script>

<style scoped>
.qq-diagnostic { min-width: 0; padding: 10px 12px; border-left: 3px solid var(--danger-color, #e05260); color: var(--danger-color, #e05260); background: rgba(224, 82, 96, .07); font-size: 12px; line-height: 1.55; overflow-wrap: anywhere; }
.qq-diagnostic header { display: flex; min-width: 0; align-items: flex-start; gap: 7px; }
.qq-diagnostic header i { margin-top: 3px; flex: 0 0 auto; }
.qq-diagnostic header strong { min-width: 0; }
.diagnostic-facts { display: flex; min-width: 0; flex-wrap: wrap; gap: 5px 14px; margin-top: 7px; }
.qq-diagnostic code { color: inherit; font-family: Consolas, "Courier New", monospace; overflow-wrap: anywhere; word-break: break-all; }
.qq-diagnostic p { margin: 7px 0 0; }
.qq-diagnostic p b { margin-right: 6px; }
.trace-row { display: grid; min-width: 0; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-top: 7px; }
.trace-row code { min-width: 0; }
@media (max-width: 640px) { .trace-row { grid-template-columns: 1fr auto; }.trace-row > span { grid-column: 1 / -1; } }
</style>
