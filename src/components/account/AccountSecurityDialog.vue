<template>
  <el-dialog
    title="账户安全"
    :visible.sync="dialogVisible"
    width="460px"
    :close-on-click-modal="false"
    custom-class="account-security-dialog"
    @closed="resetForm"
  >
    <p class="security-intro">
      更新管理员密码后，所有已登录的页面和 WebSocket 会话都会失效。
    </p>
    <el-form label-position="top" @submit.native.prevent>
      <el-form-item label="新密码">
        <el-input
          v-model="password"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="输入新的管理员密码"
        />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input
          v-model="confirmPassword"
          type="password"
          show-password
          autocomplete="new-password"
          placeholder="再次输入新密码"
          @keyup.enter.native="submit"
        />
      </el-form-item>
    </el-form>
    <ul class="password-rules" aria-label="密码要求">
      <li v-for="rule in passwordRules" :key="rule.label" :class="{ met: rule.met }">
        <i :class="rule.met ? 'el-icon-circle-check' : 'el-icon-remove-outline'" />
        {{ rule.label }}
      </li>
    </ul>
    <span slot="footer" class="dialog-footer">
      <el-button :disabled="submitting" @click="dialogVisible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="submit"
      >
        更新密码
      </el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: "AccountSecurityDialog",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      password: "",
      confirmPassword: "",
      submitting: false,
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(value) {
        this.$emit("update:visible", value)
      },
    },
    passwordRules() {
      return [
        { label: "至少 8 位", met: this.password.length >= 8 },
        { label: "包含大写字母", met: /[A-Z]/.test(this.password) },
        { label: "包含小写字母", met: /[a-z]/.test(this.password) },
        { label: "包含数字", met: /[0-9]/.test(this.password) },
        {
          label: "两次输入一致",
          met: !!this.password && this.password === this.confirmPassword,
        },
      ]
    },
    canSubmit() {
      return this.passwordRules.every((rule) => rule.met) && !this.submitting
    },
  },
  methods: {
    resetForm() {
      this.password = ""
      this.confirmPassword = ""
      this.submitting = false
    },
    async submit() {
      if (!this.canSubmit) return
      this.submitting = true
      try {
        const response = await this.postRequest(
          `${this.$root.prefix}/auth/password`,
          {
            password: this.password,
            confirm_password: this.confirmPassword,
          }
        )
        if (!response.suc) {
          this.$message.error(response.info || "密码更新失败")
          return
        }
        this.$message.success(response.info)
        this.dialogVisible = false
        this.$emit("password-reset")
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style scoped>
.security-intro {
  margin: 0 0 22px;
  color: var(--text-color-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.password-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px 18px;
  margin: 2px 0 0;
  padding: 0;
  color: var(--text-color-secondary);
  font-size: 13px;
  list-style: none;
}
.password-rules li {
  display: flex;
  align-items: center;
  gap: 6px;
}
.password-rules li.met {
  color: #3b9d68;
}
@media (max-width: 520px) {
  .password-rules {
    grid-template-columns: 1fr;
  }
  ::v-deep .account-security-dialog {
    width: calc(100% - 24px) !important;
    margin-top: 8vh !important;
  }
}
</style>
