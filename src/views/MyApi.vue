<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
    :style="{ background: 'var(--bg-color)' }"
  >
    <!-- 二次元云朵背景 -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        class="absolute top-10 left-10 w-32 h-16 rounded-full opacity-20"
        :style="{ backgroundColor: 'var(--bg-color-secondary)' }"
      ></div>
      <div
        class="absolute top-20 right-20 w-40 h-20 rounded-full opacity-20"
        :style="{ backgroundColor: 'var(--bg-color-secondary)' }"
      ></div>
      <div
        class="absolute bottom-10 left-1/4 w-48 h-24 rounded-full opacity-20"
        :style="{ backgroundColor: 'var(--bg-color-secondary)' }"
      ></div>
    </div>

    <!-- 二次元装饰元素 -->
    <div class="absolute bottom-0 left-0 w-32 h-32 opacity-20">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path
          :fill="'var(--el-fill-color-lighter)'"
          d="M42.4,-59.4C53.2,-50.2,59.4,-35.2,63.2,-19.5C67,-3.8,68.4,12.6,62.1,25.3C55.8,38,41.8,47,26.1,58.1C10.4,69.2,-7,82.4,-21.9,79.8C-36.8,77.2,-49.2,58.8,-58.4,40.1C-67.6,21.4,-73.6,2.5,-70.3,-14.9C-67,-32.3,-54.4,-48.2,-39.6,-56.7C-24.9,-65.2,-7.9,-66.3,7.6,-74.9C23.1,-83.5,46.2,-99.6,42.4,-59.4Z"
          transform="translate(100 100)"
        />
      </svg>
    </div>

    <!-- 主容器 -->
    <div
      class="w-full max-w-2xl backdrop-blur-sm rounded-xl shadow-xl overflow-hidden transition-all duration-300 relative"
      :style="{
        backgroundColor: 'var(--bg-color-secondary)',
        border: '2px solid var(--el-border-color)',
      }"
    >
      <!-- 顶部装饰条 -->
      <div
        class="h-2"
        :style="{
          background:
            'linear-gradient(to right, var(--el-color-primary), var(--el-color-primary-light-3))',
        }"
      ></div>

      <!-- 二次元角色装饰 -->
      <div class="absolute -top-16 -right-16 w-32 h-32 opacity-70">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path
            :fill="'var(--el-color-primary-light-3)'"
            d="M44.9,-65.2C56.6,-58.3,63.8,-43.9,68.2,-29.5C72.6,-15.1,74.3,-0.7,69.4,10.3C64.5,21.3,53.1,29.9,41.2,40.7C29.3,51.5,16.6,64.5,1.1,63.2C-14.4,61.9,-30.6,46.3,-42.1,31.9C-53.6,17.5,-60.3,4.3,-61.3,-11.1C-62.3,-26.5,-57.6,-44.1,-45.3,-50.9C-33,-57.7,-13.2,-53.7,4.6,-58.8C22.3,-63.9,44.6,-78.1,44.9,-65.2Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div class="p-6 sm:p-8">
        <!-- 标题 -->
        <div class="relative mb-8">
          <h1
            class="text-3xl sm:text-4xl font-bold text-center tracking-wide"
            :style="{
              color: 'var(--el-color-primary)',
              textShadow: '2px 2px 4px var(--el-color-primary-light-9)',
            }"
          >
            API 地址设置
          </h1>
          <div
            class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 rounded-full"
            :style="{ backgroundColor: 'var(--el-color-primary-light-3)' }"
          ></div>
          <div
            class="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full"
            :style="{ backgroundColor: 'var(--el-color-primary-light-9)' }"
          ></div>
        </div>

        <!-- 表单区域 -->
        <div class="space-y-6">
          <!-- IP:PORT 标签 -->
          <div
            class="text-lg font-medium transition-all duration-500 ease-in-out relative inline-block"
            :class="{ 'translate-x-4': rightShow }"
            :style="{ color: 'var(--el-color-primary)' }"
          >
            <span class="relative z-10">IP:PORT</span>
            <span
              class="absolute -bottom-1 left-0 w-full h-1 rounded-full z-0"
              :style="{ backgroundColor: 'var(--el-color-primary-light-9)' }"
            ></span>
          </div>

          <!-- 输入框组 -->
          <div class="flex items-center gap-4">
            <div class="flex-1 relative">
              <div class="relative flex items-center">
                <span
                  v-if="!apiUrl.startsWith('http')"
                  class="absolute left-4 select-none"
                  :style="{ color: 'var(--el-color-primary-light-3)' }"
                  >http://</span
                >
                <input
                  v-model.trim="apiUrl"
                  @focus="inpOnfocus"
                  @blur="inpOnBlur"
                  type="text"
                  placeholder="请输入IP地址"
                  spellcheck="false"
                  :class="{ 'with-http-prefix': !apiUrl.startsWith('http') }"
                  class="w-full px-4 py-3 rounded-lg border-2 focus:ring-2 transition-all duration-300 shadow-sm"
                  :style="{
                    backgroundColor: 'var(--bg-color-secondary)',
                    color: 'var(--el-text-color-primary)',
                    borderColor: 'var(--el-border-color)',
                    '--tw-ring-color': 'var(--el-color-primary-light-9)',
                    '--tw-ring-offset-shadow': 'var(--el-box-shadow-light)',
                    '--tw-ring-shadow': 'var(--el-box-shadow-lighter)',
                  }"
                />
              </div>
              <div
                class="absolute -bottom-2 -right-2 w-4 h-4 rounded-full"
                :style="{ backgroundColor: 'var(--el-color-primary)' }"
              ></div>
            </div>
            <div class="w-28 relative">
              <input
                v-model.trim="port"
                @focus="inpOnfocus"
                @blur="inpOnBlur"
                type="text"
                placeholder="端口号"
                spellcheck="false"
                class="w-full px-4 py-3 rounded-lg border-2 focus:ring-2 transition-all duration-300 shadow-sm"
                :style="{
                  backgroundColor: 'var(--bg-color-secondary)',
                  color: 'var(--el-text-color-primary)',
                  borderColor: 'var(--el-border-color)',
                  '--tw-ring-color': 'var(--el-color-primary-light-9)',
                  '--tw-ring-offset-shadow': 'var(--el-box-shadow-light)',
                  '--tw-ring-shadow': 'var(--el-box-shadow-lighter)',
                }"
              />
              <div
                class="absolute -bottom-2 -right-2 w-4 h-4 rounded-full"
                :style="{ backgroundColor: 'var(--el-color-primary-light-3)' }"
              ></div>
            </div>
            <!-- 连接状态图标 -->
            <div class="flex items-center">
              <div v-if="testing === 'loading'" class="w-5 h-5"></div>
              <SvgIcon
                v-else-if="testing === true"
                icon-class="success"
                class="w-5 h-5"
                :style="{ color: 'var(--el-color-success)' }"
              />
              <SvgIcon
                v-else-if="testing === false"
                icon-class="error"
                class="w-5 h-5"
                :style="{ color: 'var(--el-color-danger)' }"
              />
              <SvgIcon
                v-else
                icon-class="loading"
                class="w-5 h-5 border-t-transparent animate-spin"
                :style="{ color: 'var(--el-color-primary-light-3)' }"
              />
            </div>
          </div>

          <!-- 注意事项 -->
          <div
            class="rounded-lg p-4 border shadow-inner relative overflow-hidden"
            :style="{
              backgroundColor: 'var(--el-fill-color-light)',
              borderColor: 'var(--el-border-color)',
            }"
          >
            <div
              class="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-30"
              :style="{ backgroundColor: 'var(--el-color-primary-light-9)' }"
            ></div>
            <h3
              class="font-medium mb-2 flex items-center"
              :style="{ color: 'var(--el-color-primary)' }"
            >
              <svg
                class="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              注意事项：
            </h3>
            <ul
              class="text-sm space-y-2"
              :style="{ color: 'var(--el-text-color-primary)' }"
            >
              <li class="flex items-start">
                <span
                  class="mr-2 font-bold"
                  :style="{ color: 'var(--el-color-primary)' }"
                  >①</span
                >
                <span
                  >开发环境中修改api地址一样生效，即覆盖代理服务器的转发</span
                >
              </li>
              <li class="flex items-start">
                <span
                  class="mr-2 font-bold"
                  :style="{ color: 'var(--el-color-primary)' }"
                  >②</span
                >
                <span>
                  如果生产环境部署的资源和真寻本体<ins
                    class="no-underline font-bold"
                    :style="{ color: 'var(--el-color-primary)' }"
                    >不在</ins
                  >
                  同一个机器上，则输入你的服务器接口地址以及真寻的端口。最后记得修改防火墙设置哦
                </span>
              </li>
            </ul>
          </div>

          <!-- 按钮组 -->
          <div class="flex flex-col sm:flex-row gap-4 pt-4">
            <CuteButton
              type="secondary"
              icon="back2"
              @click="goBack"
              class="flex-1"
              iconColor="var(--button-icon-color-default)"
            >
              返回
            </CuteButton>
            <CuteButton
              type="primary"
              icon="edit"
              @click="changeUrl"
              class="flex-1"
              ref="myapi"
              iconColor="var(--button-icon-color-primary)"
            >
              修改
            </CuteButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getBaseApiUrl, setBaseApiUrl, getPort, setPort } from "@/utils/api"
import CuteButton from "@/components/ui/CuteButton.vue"
import SvgIcon from "@/components/SvgIcon/SvgIcon.vue"

export default {
  name: "MyApi",
  components: { CuteButton, SvgIcon },
  data() {
    return {
      port: getPort(),
      rightShow: false,
      apiUrl: getBaseApiUrl(),
      fromPage: "/",
      fromPageName: "",
      clickEffect: false,
      clickEffectStyle: {},
      testing: null,
      lastTestTime: 0,
    }
  },
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      vm.fromPage = from.path
      vm.fromPageName = from.name
    })
  },
  methods: {
    goBack() {
      if (this.fromPageName) {
        this.$router.replace(this.fromPage)
      } else {
        this.$router.replace("/")
      }
    },
    changeUrl() {
      setTimeout(() => {
        this.clickEffect = false
        if (!this.apiUrl.startsWith("http")) {
          this.apiUrl = "http://" + this.apiUrl
        }
        setBaseApiUrl(this.apiUrl)
        setPort(this.port)
        this.$message.success("修改地址端口成功！")
        if (this.fromPageName == "Configure") {
          this.goBack()
        } else {
          this.$router.replace("/")
        }
      }, 600)
    },
    inpOnfocus() {
      this.rightShow = true
    },
    async inpOnBlur() {
      this.rightShow = false
      // 在失去焦点时测试连接
      await this.testConnection()
    },
    async testConnection() {
      // 防止频繁测试，设置最小间隔为 2 秒
      const now = Date.now()
      if (now - this.lastTestTime < 2000) {
        return
      }
      if (!this.apiUrl || !this.port) {
        return
      }
      this.lastTestTime = now

      if (!this.apiUrl || !this.port) {
        this.testing = null
        return
      }

      this.testing = "loading"
      try {
        let testUrl = this.apiUrl
        if (!testUrl.startsWith("http")) {
          testUrl = "http://" + testUrl
        }
        testUrl = `${testUrl}:${this.port}${this.$root.prefix}/system/ping`
        const resp = await this.getRequest(testUrl)
        if (resp.suc) {
          this.$message.success("连接成功！")
          this.testing = true
        } else {
          this.$message.error("连接失败：服务器响应异常")
          this.testing = false
        }
      } catch (error) {
        this.$message.error(`连接失败：${error.message || "未知错误"}`)
        this.testing = false
      }
    },
  },
}
</script>

<style>
/* 添加自定义字体 */
@import url("https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap");

.font-comic {
  font-family: "Comic Neue", cursive;
}

/* 按钮点击动画 */
button:active {
  transform: scale(0.98);
}

/* 输入框聚焦动画 */
input:focus {
  box-shadow: 0 0 0 3px var(--el-color-primary-light-9);
}

/* 带 http 前缀的输入框样式 */
.with-http-prefix {
  padding-left: 56px !important;
}
</style>
