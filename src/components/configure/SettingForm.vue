<template>
  <div class="base">
    <div v-if="redirecting" class="redirect-mask">
      <i class="el-icon-loading redirect-icon"></i>
      <div class="redirect-title">真寻正在重启</div>
      <div>正在等待新地址 {{ redirectBaseUrl }}，连接成功后会自动跳转…</div>
    </div>

    <div class="setting-title">基础配置</div>
    <el-form
      ref="ruleForm"
      :model="setting"
      label-width="110px"
      class="form-content"
      :rules="rules"
    >
      <el-form-item label="超级用户ID" prop="superusers">
        <InteractiveInput
          v-model="setting.superusers"
          placeholder="请输入超级用户ID，多个请使用逗号隔开"
        ></InteractiveInput>
      </el-form-item>

      <el-form-item label="数据库地址" prop="db_url">
        <div class="connection-field">
          <InteractiveInput
            v-model.trim="setting.db_url"
            placeholder="数据库地址"
            @blur="testDatabase"
          ></InteractiveInput>
          <el-button
            class="test-button"
            type="primary"
            plain
            :loading="dbTestStatus === 'testing'"
            :disabled="isSqlite || dbTestStatus === 'testing'"
            @click="testDatabase"
          >
            <i
              v-if="dbTestStatus !== 'testing'"
              :class="connectionIcon(dbTestStatus)"
            ></i>
            {{ isSqlite ? "无需测试" : "测试连接" }}
          </el-button>
        </div>
        <div :class="['connection-status', dbTestStatus]">
          {{ databaseStatusText }}
        </div>
      </el-form-item>

      <el-form-item label="登录用户名" prop="username">
        <InteractiveInput
          v-model="setting.username"
          placeholder="前端登录用户名"
        ></InteractiveInput>
      </el-form-item>
      <el-form-item label="登录密码" prop="password">
        <InteractiveInput
          v-model="setting.password"
          type="password"
          placeholder="前端登录密码"
        ></InteractiveInput>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :xs="24" :sm="14">
          <el-form-item label="运行/连接地址" prop="host">
            <InteractiveInput
              v-model.trim="setting.host"
              placeholder="例如 127.0.0.1"
            ></InteractiveInput>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="10">
          <el-form-item label="运行端口" prop="port">
            <InteractiveInput
              v-model="setting.port"
              placeholder="运行端口"
            ></InteractiveInput>
          </el-form-item>
        </el-col>
      </el-row>
      <div class="address-tip">
        这里同时设置 Bot 重启后的监听地址和 WebUI 连接地址；立即重启后会自动跳转。
      </div>

      <el-collapse v-model="activePanels" class="more-config">
        <el-collapse-item title="更多配置" name="more">
          <div class="config-warning">
            <i class="el-icon-warning-outline"></i>
            不知道是什么就不要动
          </div>
          <el-form-item label="CACHE_MODE" prop="cache_mode">
            <el-select v-model="setting.cache_mode" class="full-width">
              <el-option label="内存缓存（MEMORY）" value="MEMORY"></el-option>
              <el-option label="不使用缓存（NONE）" value="NONE"></el-option>
              <el-option label="Redis 缓存（REDIS）" value="REDIS"></el-option>
            </el-select>
          </el-form-item>

          <template v-if="setting.cache_mode === 'REDIS'">
            <el-form-item label="Redis 地址" prop="redis_host">
              <div class="connection-field">
                <InteractiveInput
                  v-model.trim="setting.redis_host"
                  placeholder="例如 127.0.0.1"
                  @blur="testRedis"
                ></InteractiveInput>
                <el-button
                  class="test-button"
                  type="primary"
                  plain
                  :loading="redisTestStatus === 'testing'"
                  :disabled="redisTestStatus === 'testing'"
                  @click="testRedis"
                >
                  <i
                    v-if="redisTestStatus !== 'testing'"
                    :class="connectionIcon(redisTestStatus)"
                  ></i>
                  测试连接
                </el-button>
              </div>
              <div :class="['connection-status', redisTestStatus]">
                {{ redisStatusText }}
              </div>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :xs="24" :sm="10">
                <el-form-item label="Redis 端口" prop="redis_port">
                  <InteractiveInput
                    v-model="setting.redis_port"
                    placeholder="6379"
                    @blur="testRedis"
                  ></InteractiveInput>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="14">
                <el-form-item label="Redis 密码" prop="redis_password">
                  <InteractiveInput
                    v-model="setting.redis_password"
                    type="password"
                    placeholder="没有密码可留空"
                    @blur="testRedis"
                  ></InteractiveInput>
                </el-form-item>
              </el-col>
            </el-row>
          </template>
        </el-collapse-item>
      </el-collapse>

      <el-form-item class="action-row">
        <el-button
          type="primary"
          class="submit-btn"
          :loading="submitting"
          :disabled="!connectionsReady || submitting"
          @click="submitForm('ruleForm')"
        >
          提交
        </el-button>
      </el-form-item>
    </el-form>

    <CuteConfirm
      :visible.sync="isComplete"
      title="配置已保存"
      :message="completeText"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      class="dialog"
    />
  </div>
</template>

<script>
import { setBaseApiUrl, setPort } from "@/utils/api"
import CuteConfirm from "../ui/CuteConfirm.vue"
import InteractiveInput from "../ui/NeonInput.vue"

export default {
  name: "SettingForm",
  components: { InteractiveInput, CuteConfirm },
  data() {
    const checkHost = (rule, value, callback) => {
      if (!value) {
        return callback(new Error("运行地址不能为空"))
      }
      const ipv4Pattern =
        /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      if (!ipv4Pattern.test(value)) {
        return callback(new Error("IP 地址不合法"))
      }
      callback()
    }
    const checkPort = (rule, value, callback) => {
      if (value === "" || value === null || value === undefined) {
        return callback(new Error("端口不能为空"))
      }
      const num = Number(value)
      if (Number.isInteger(num) && num >= 1 && num <= 65535) {
        return callback()
      }
      callback(new Error("端口必须是 1 到 65535 之间的整数"))
    }
    const checkRedisHost = (rule, value, callback) => {
      if (this.setting.cache_mode === "REDIS" && !value) {
        return callback(new Error("Redis 地址不能为空"))
      }
      callback()
    }
    return {
      completeText:
        "配置已经保存。点击确定会立即重启真寻，WebUI 将在新地址可用后自动跳转；点击取消可稍后手动重启。",
      setting: {
        superusers: "",
        db_url: "sqlite:data/db/zhenxun.db",
        username: "admin",
        password: "",
        host: "127.0.0.1",
        port: 8080,
        cache_mode: "MEMORY",
        redis_host: "127.0.0.1",
        redis_port: 6379,
        redis_password: "",
      },
      activePanels: [],
      isComplete: false,
      submitting: false,
      redirecting: false,
      redirectBaseUrl: "",
      dbTestStatus: "skipped",
      testedDbUrl: "sqlite:data/db/zhenxun.db",
      dbTestError: "",
      redisTestStatus: "idle",
      testedRedisValue: "",
      redisTestError: "",
      rules: {
        superusers: [
          { required: true, message: "请输入超级用户ID", trigger: "blur" },
        ],
        db_url: [
          { required: true, message: "数据库地址不能为空", trigger: "blur" },
        ],
        username: [
          { required: true, message: "请输入前端登录用户名", trigger: "blur" },
        ],
        password: [
          { required: true, message: "请输入前端登录密码", trigger: "blur" },
        ],
        host: [{ required: true, validator: checkHost, trigger: "blur" }],
        port: [{ required: true, validator: checkPort, trigger: "blur" }],
        redis_host: [{ validator: checkRedisHost, trigger: "blur" }],
        redis_port: [{ validator: checkPort, trigger: "blur" }],
      },
    }
  },
  computed: {
    isSqlite() {
      return this.setting.db_url.trim().toLowerCase().startsWith("sqlite:")
    },
    currentRedisValue() {
      return [
        this.setting.redis_host.trim(),
        String(this.setting.redis_port),
        this.setting.redis_password,
      ].join("\n")
    },
    databaseStatusText() {
      if (this.isSqlite) return "SQLite 为本地数据库，无需连接测试"
      if (this.dbTestStatus === "testing") return "正在测试数据库连接…"
      if (this.dbTestStatus === "success") return "数据库连接测试通过"
      if (this.dbTestStatus === "error") {
        return `数据库连接失败：${this.dbTestError}`
      }
      return "输入完成后离开输入框，或点击“测试连接”"
    },
    redisStatusText() {
      if (this.redisTestStatus === "testing") return "正在测试 Redis 连接…"
      if (this.redisTestStatus === "success") return "Redis 连接测试通过"
      if (this.redisTestStatus === "error") {
        return `Redis 连接失败：${this.redisTestError}`
      }
      return "Redis 模式必须测试通过后才能提交"
    },
    connectionsReady() {
      const dbReady =
        this.isSqlite ||
        (this.dbTestStatus === "success" &&
          this.testedDbUrl === this.setting.db_url.trim())
      const redisReady =
        this.setting.cache_mode !== "REDIS" ||
        (this.redisTestStatus === "success" &&
          this.testedRedisValue === this.currentRedisValue)
      return dbReady && redisReady
    },
  },
  watch: {
    "setting.db_url"(value) {
      const normalized = String(value || "").trim()
      if (normalized.toLowerCase().startsWith("sqlite:")) {
        this.dbTestStatus = "skipped"
        this.testedDbUrl = normalized
        this.dbTestError = ""
      } else if (normalized !== this.testedDbUrl) {
        this.dbTestStatus = "idle"
        this.dbTestError = ""
      }
    },
    "setting.cache_mode"(value) {
      if (value === "REDIS") {
        this.activePanels = ["more"]
      }
    },
    currentRedisValue(value) {
      if (value !== this.testedRedisValue) {
        this.redisTestStatus = "idle"
        this.redisTestError = ""
      }
    },
  },
  methods: {
    connectionIcon(status) {
      if (status === "success" || status === "skipped") {
        return "el-icon-circle-check"
      }
      if (status === "error") return "el-icon-circle-close"
      return "el-icon-connection"
    },
    async testDatabase() {
      const dbUrl = this.setting.db_url.trim()
      if (!dbUrl) {
        this.dbTestStatus = "error"
        this.dbTestError = "数据库地址不能为空"
        return false
      }
      if (dbUrl.toLowerCase().startsWith("sqlite:")) {
        this.dbTestStatus = "skipped"
        this.testedDbUrl = dbUrl
        this.dbTestError = ""
        return true
      }
      if (this.dbTestStatus === "testing") return false

      this.dbTestStatus = "testing"
      this.dbTestError = ""
      try {
        const resp = await this.postRequest(
          `${this.$root.prefix}/configure/test_db`,
          { db_url: dbUrl }
        )
        if (this.setting.db_url.trim() !== dbUrl) return false
        if (resp && resp.suc) {
          this.dbTestStatus = "success"
          this.testedDbUrl = dbUrl
          this.$message.success(resp.info || "数据库连接成功！")
          return true
        }
        this.dbTestStatus = "error"
        this.dbTestError = (resp && resp.info) || "服务器没有返回测试结果"
      } catch (error) {
        this.dbTestStatus = "error"
        this.dbTestError = error.message || "未知错误"
      }
      return false
    },
    async testRedis() {
      if (this.setting.cache_mode !== "REDIS") return true
      const testedValue = this.currentRedisValue
      if (!this.setting.redis_host.trim()) {
        this.redisTestStatus = "error"
        this.redisTestError = "Redis 地址不能为空"
        return false
      }
      const port = Number(this.setting.redis_port)
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        this.redisTestStatus = "error"
        this.redisTestError = "Redis 端口不合法"
        return false
      }
      if (this.redisTestStatus === "testing") return false

      this.redisTestStatus = "testing"
      this.redisTestError = ""
      try {
        const resp = await this.postRequest(
          `${this.$root.prefix}/configure/test_redis`,
          {
            redis_host: this.setting.redis_host.trim(),
            redis_port: port,
            redis_password: this.setting.redis_password,
          }
        )
        if (this.currentRedisValue !== testedValue) return false
        if (resp && resp.suc) {
          this.redisTestStatus = "success"
          this.testedRedisValue = testedValue
          this.$message.success(resp.info || "Redis 连接成功！")
          return true
        }
        this.redisTestStatus = "error"
        this.redisTestError = (resp && resp.info) || "服务器没有返回测试结果"
      } catch (error) {
        this.redisTestStatus = "error"
        this.redisTestError = error.message || "未知错误"
      }
      return false
    },
    submitForm(formName) {
      this.$refs[formName].validate((valid) => {
        if (!valid) return
        if (!this.connectionsReady) {
          this.$message.warning("请先完成数据库或 Redis 连接测试")
          return
        }
        this.saveConfiguration()
      })
    },
    async saveConfiguration() {
      this.submitting = true
      const superusers = this.setting.superusers
        .replace(/，/g, ",")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
      try {
        const resp = await this.postRequest(
          `${this.$root.prefix}/configure/set_configure`,
          {
            ...this.setting,
            port: Number(this.setting.port),
            redis_port: Number(this.setting.redis_port),
            superusers,
          }
        )
        if (resp && resp.suc) {
          this.$message.success(resp.info)
          this.isComplete = true
        } else {
          this.$message.error((resp && resp.info) || "配置保存失败")
        }
      } finally {
        this.submitting = false
      }
    },
    getConnectionTarget() {
      let host = this.setting.host.trim()
      if (host === "0.0.0.0") {
        host = window.location.hostname || "127.0.0.1"
      }
      const protocol = window.location.protocol === "https:" ? "https" : "http"
      return `${protocol}://${host}`
    },
    saveConnectionTarget() {
      const baseUrl = this.getConnectionTarget()
      setBaseApiUrl(baseUrl)
      setPort(String(this.setting.port))
      this.redirectBaseUrl = `${baseUrl}:${this.setting.port}`
      return this.redirectBaseUrl
    },
    handleCancel() {
      this.saveConnectionTarget()
      this.$router.replace({
        name: "Login",
        params: { firstSetting: true },
      })
    },
    async handleConfirm() {
      const loading = this.getLoading(".dialog")
      try {
        const resp = await this.postRequest(
          `${this.$root.prefix}/configure/restart`
        )
        if (!resp || !resp.suc) {
          this.$message.error((resp && resp.info) || "重启请求失败")
          return
        }
        this.isComplete = false
        this.redirecting = true
        this.saveConnectionTarget()
        await this.waitForServerAndRedirect()
      } finally {
        loading.close()
      }
    },
    async waitForServerAndRedirect() {
      const pingUrl = `${this.redirectBaseUrl}${this.$root.prefix}/system/ping`
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        try {
          const response = await fetch(pingUrl, { cache: "no-store" })
          if (response.ok) {
            const data = await response.json()
            if (data && data.suc) {
              window.location.replace(`${this.redirectBaseUrl}/#/`)
              return
            }
          }
        } catch (error) {
          // 重启期间连接失败是预期行为，继续等待。
        }
      }
      this.redirecting = false
      this.$message.error(
        `新地址暂时无法连接，请确认真寻已重启后访问 ${this.redirectBaseUrl}`
      )
    },
  },
}
</script>

<style lang="scss" scoped>
.base {
  position: relative;
  min-height: 100%;
  width: 100%;
  padding: 32px 20px;
  box-sizing: border-box;
  overflow-y: auto;
  background-color: #fbe4e4;
}

.setting-title {
  font-family: "fzrzFont";
  font-size: 46px;
  margin: 0 auto 30px;
  color: #ffadd2;
  text-align: center;
}

.form-content {
  width: min(760px, 100%);
  margin: 0 auto;
}

::v-deep .el-form-item__label {
  font-weight: bolder;
}

.connection-field {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.test-button {
  flex: 0 0 112px;
  height: 40px;
}

.connection-status {
  min-height: 20px;
  margin-top: 4px;
  font-size: 12px;
  line-height: 20px;
  color: #909399;
}

.connection-status.success,
.connection-status.skipped {
  color: #67c23a;
}

.connection-status.testing {
  color: #e6a23c;
}

.connection-status.error {
  color: #f56c6c;
}

.address-tip {
  margin: -8px 0 18px 110px;
  color: #909399;
  font-size: 12px;
}

.more-config {
  margin: 4px 0 22px;
  border-top: 1px solid rgba(245, 137, 185, 0.35);
  border-bottom: 1px solid rgba(245, 137, 185, 0.35);
}

::v-deep .el-collapse-item__header,
::v-deep .el-collapse-item__wrap {
  background: transparent;
}

::v-deep .el-collapse-item__header {
  padding-left: 12px;
  color: #f06fa9;
  font-weight: 700;
}

.config-warning {
  margin: 0 0 18px 110px;
  color: #e6a23c;
  font-weight: 700;
}

.full-width {
  width: 100%;
}

.action-row {
  margin-bottom: 0;
}

.submit-btn {
  width: 180px;
  background-color: #f589b9;
  border-color: #f589b9;
  float: right;
  color: #fff;
}

.submit-btn:hover,
.submit-btn:focus {
  background-color: #eb83b1;
  border-color: #eb83b1;
}

.redirect-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: #606266;
  background: rgba(255, 245, 249, 0.96);
}

.redirect-icon {
  font-size: 42px;
  color: #f589b9;
}

.redirect-title {
  color: #f06fa9;
  font-size: 24px;
  font-weight: 700;
}

@media (max-width: 640px) {
  .base {
    padding: 20px 12px;
  }

  .setting-title {
    font-size: 36px;
  }

  .connection-field {
    flex-direction: column;
  }

  .test-button {
    width: 100%;
  }

  .address-tip,
  .config-warning {
    margin-left: 0;
  }
}
</style>
